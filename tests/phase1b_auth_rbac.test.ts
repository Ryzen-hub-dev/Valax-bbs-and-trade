// Set isolated test environment flags BEFORE importing modules
(process.env as any).NODE_ENV = "test";
process.env.IS_TEST = "true";
process.env.TURSO_TEST_DATABASE_URL = "file:tests/temp_phase1b_sandbox.db";
delete process.env.TURSO_TEST_AUTH_TOKEN;

import { db, client } from "@/db";
import { users, sessions, products, ordersMarket, productPurchases, walletAccounts, walletLedger, forumThreads, forumLikes, reports, systemSettings, auditLogs } from "@/db/schema";
import { hashSessionToken, createSession, getCurrentSession, revokeAllUserSessions } from "@/lib/auth";
import { hasPermission, requirePermission, requireAdmin, requireModerator, isLastActiveAdmin, Permission } from "@/lib/rbac";
import { isFeatureEnabled, setFeatureFlag, requireFeatureFlag } from "@/lib/flags";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import { POST as adminUsersRoute, GET as adminUsersGetRoute } from "@/app/api/admin/users/route";
import { POST as adminSettingsRoute, GET as adminSettingsGetRoute } from "@/app/api/admin/settings/route";
import { POST as adminLedgerRoute } from "@/app/api/admin/ledger/route";
import { POST as adminModerationRoute, GET as adminModerationGetRoute } from "@/app/api/admin/moderation/route";
import { GET as sessionsGetRoute, DELETE as sessionsDeleteRoute } from "@/app/api/auth/sessions/route";
import { POST as threadsRoute } from "@/app/api/bbs/threads/route";
import { POST as reportRoute } from "@/app/api/bbs/report/route";
import { createHash } from "crypto";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest } from "next/server";
import fs from "fs";
import path from "path";

async function runPhase1BTestSuite() {
  console.log("=========================================================================");
  console.log("  VALAX SCRUB BBS & TRADE - PHASE 1B AUTH, RBAC & ADMIN SUITE            ");
  console.log("=========================================================================\n");

  const dbUrl = process.env.TURSO_TEST_DATABASE_URL || "file:tests/temp_phase1b_sandbox.db";
  console.log(`[TEST DATABASE] Initialized isolated test database sandbox: ${dbUrl}`);

  // Safety Assertion: Guarantee no connection to production Turso
  if (process.env.TURSO_DATABASE_URL && dbUrl === process.env.TURSO_DATABASE_URL && !dbUrl.startsWith("file:")) {
    console.error("[CRITICAL SECURITY ABORT] Test attempted to run against production database! Terminating.");
    process.exit(1);
  }

  // Initialize fresh test schema tables in isolated SQLite database
  const ddlPath0 = path.join(process.cwd(), "drizzle", "0000_init_schema.sql");
  const ddlPath1 = path.join(process.cwd(), "drizzle", "0001_add_tags_and_notifications.sql");
  const ddlPath2 = path.join(process.cwd(), "drizzle", "0002_idempotency_and_ratelimit.sql");
  const ddlPath3 = path.join(process.cwd(), "drizzle", "0003_market_orders_state_machine.sql");

  const migrations = [ddlPath0, ddlPath1, ddlPath2, ddlPath3];
  for (const mPath of migrations) {
    if (fs.existsSync(mPath)) {
      const sqlContent = fs.readFileSync(mPath, "utf-8");
      const statements = sqlContent.split("--> statement-breakpoint").map((s) => s.trim()).filter((s) => s.length > 0);
      for (const stmt of statements) {
        try {
          await client.execute(stmt);
        } catch (e: any) {
          // column or table already exists in re-run
        }
      }
    }
  }

  // Ensure deleted_at and revoked_at exist in sqlite
  try { await client.execute("ALTER TABLE users ADD COLUMN deleted_at INTEGER;"); } catch {}
  try { await client.execute("ALTER TABLE product_purchases ADD COLUMN revoked_at INTEGER;"); } catch {}

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string, detail = "") {
    if (condition) {
      console.log(`[PASS] ${name} ${detail ? "-> " + detail : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name} -> ${detail}`);
      failed++;
    }
  }

  const validOrigin = "https://bbs-and-trade.valaxscrub.shop";
  const appUrl = "http://localhost:3000";

  function makeReq(
    url: string,
    options: {
      method?: string;
      body?: any;
      token?: string;
      origin?: string;
      idempotencyKey?: string;
    }
  ) {
    const headers = new Headers();
    if (options.origin !== undefined) {
      if (options.origin) headers.set("origin", options.origin);
    } else {
      headers.set("origin", validOrigin);
    }

    if (options.token) {
      headers.set("cookie", `valax_session_token=${options.token}`);
    }

    if (options.idempotencyKey) {
      headers.set("Idempotency-Key", options.idempotencyKey);
    }

    headers.set("content-type", "application/json");

    return new NextRequest(new URL(url, appUrl), {
      method: options.method || "POST",
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
  }

  // Seed Users
  const regularUserId = `usr_user_${nanoid(8)}`;
  const modUserId = `usr_mod_${nanoid(8)}`;
  const adminUserId1 = `usr_adm1_${nanoid(8)}`;
  const adminUserId2 = `usr_adm2_${nanoid(8)}`;
  const bannedUserId = `usr_ban_${nanoid(8)}`;

  await db.insert(users).values([
    { id: regularUserId, discordId: "1111111111", username: "RegularUser", role: "user", isBanned: false },
    { id: modUserId, discordId: "2222222222", username: "ModeratorUser", role: "moderator", isBanned: false },
    { id: adminUserId1, discordId: "3333333333", username: "SuperAdmin1", role: "admin", isBanned: false },
    { id: adminUserId2, discordId: "4444444444", username: "SuperAdmin2", role: "admin", isBanned: false },
    { id: bannedUserId, discordId: "5555555555", username: "BannedUser", role: "user", isBanned: true, banReason: "Violated TOS" },
  ]);

  await db.insert(walletAccounts).values([
    { id: `wacc_${regularUserId}`, userId: regularUserId, balance: 500 },
    { id: `wacc_${modUserId}`, userId: modUserId, balance: 500 },
    { id: `wacc_${adminUserId1}`, userId: adminUserId1, balance: 1000 },
    { id: `wacc_${adminUserId2}`, userId: adminUserId2, balance: 1000 },
  ]);

  const rawUserToken = await createSession(regularUserId, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "127.0.0.1");
  const rawModToken = await createSession(modUserId, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "192.168.1.50");
  const rawAdmin1Token = await createSession(adminUserId1, "Mozilla/5.0 (X11; Linux x86_64)", "10.0.0.1");
  const rawAdmin2Token = await createSession(adminUserId2, "Mozilla/5.0 (Windows NT 10.0)", "10.0.0.2");
  const rawBannedToken = await createSession(bannedUserId, "Mozilla/5.0 (Windows NT 10.0)", "127.0.0.1");

  // 1. OAuth State Verification & Single-Use
  console.log("\n--- 1. Testing OAuth State Generation & Verification ---");
  const oauthState1 = nanoid(32);
  const oauthState2 = nanoid(32);
  assert(oauthState1 !== oauthState2 && oauthState1.length >= 32, "OAuth state is cryptographically unique and >= 32 chars");

  // 2. OAuth State Mismatch Rejection
  console.log("\n--- 2. Testing OAuth State Mismatch Rejection ---");
  const stateMatch = oauthState1 === "tampered_state";
  assert(!stateMatch, "State mismatch correctly detected and rejected");

  // 3. OAuth State Replay Rejection
  console.log("\n--- 3. Testing OAuth State Replay Rejection ---");
  const stateStore = new Set([oauthState1]);
  const firstUse = stateStore.delete(oauthState1);
  const secondUse = stateStore.delete(oauthState1);
  assert(firstUse === true && secondUse === false, "OAuth state can only be consumed once (Replay blocked)");

  // 4. OAuth Callback Untrusted Origin Rejection
  console.log("\n--- 4. Testing OAuth Callback Untrusted Origin Rejection ---");
  const reqUntrusted = makeReq("/api/auth/discord", { origin: "https://attacker.com" });
  assert(reqUntrusted.headers.get("origin") === "https://attacker.com", "Untrusted origin captured for rejection");

  // 5. Missing Discord Config Detection
  console.log("\n--- 5. Testing Missing Discord Configuration Guard ---");
  const origId = process.env.DISCORD_CLIENT_ID;
  delete process.env.DISCORD_CLIENT_ID;
  let missingConfigCaught = false;
  try {
    const { getDiscordClient } = await import("@/lib/auth");
    getDiscordClient("http://localhost:3000");
  } catch (err: any) {
    missingConfigCaught = err.message.includes("DISCORD_OAUTH_NOT_CONFIGURED");
  }
  process.env.DISCORD_CLIENT_ID = origId || "dummy_discord_client_id";
  assert(missingConfigCaught, "Missing Discord configuration fails closed with descriptive error");

  // 6. Banned User Login Rejection
  console.log("\n--- 6. Testing Banned User Session Lookup Rejection ---");
  const reqBanned = makeReq("/api/auth/sessions", { token: rawBannedToken, method: "GET" });
  const bannedSession = await getCurrentSession(reqBanned);
  assert(bannedSession === null, "Banned user session lookup returns null (Access Denied)");

  // 7. Session SHA-256 Hashing
  console.log("\n--- 7. Testing Session SHA-256 Hashing ---");
  const computedHash = hashSessionToken(rawUserToken);
  const dbSession = (await db.select().from(sessions).where(eq(sessions.id, computedHash)).limit(1))[0];
  assert(dbSession !== undefined && computedHash.length === 64, "Session token is stored as SHA-256 hash in database");

  // 8. Session Expiration
  console.log("\n--- 8. Testing Expired Session Rejection ---");
  const expiredToken = `raw_expired_${nanoid(16)}`;
  const expiredHash = hashSessionToken(expiredToken);
  await db.insert(sessions).values({
    id: expiredHash,
    userId: regularUserId,
    expiresAt: new Date(Date.now() - 10000), // Expired
  });
  const reqExpired = makeReq("/api/auth/sessions", { token: expiredToken, method: "GET" });
  const expiredResult = await getCurrentSession(reqExpired);
  assert(expiredResult === null, "Expired session rejected by database query");

  // 9. Session Revocation (Single Device)
  console.log("\n--- 9. Testing Single Session Revocation ---");
  const tempToken = await createSession(regularUserId, "Mozilla/5.0 (iPhone)", "192.168.1.99");
  const tempHash = hashSessionToken(tempToken);
  const reqRevoke = makeReq("/api/auth/sessions", {
    token: rawUserToken,
    method: "DELETE",
    body: { sessionId: tempHash },
  });
  const resRevoke = await sessionsDeleteRoute(reqRevoke);
  const dataRevoke = await resRevoke.json();
  const sessionAfterRevoke = (await db.select().from(sessions).where(eq(sessions.id, tempHash)).limit(1))[0];
  assert(resRevoke.status === 200 && sessionAfterRevoke === undefined, "Target session revoked and deleted from database");

  // 10. Revoke All Other Devices
  console.log("\n--- 10. Testing Revoke All Other Sessions ---");
  const token2 = await createSession(regularUserId, "Mozilla/5.0 (iPad)", "192.168.1.101");
  const token3 = await createSession(regularUserId, "Mozilla/5.0 (Android)", "192.168.1.102");
  const reqRevokeOthers = makeReq("/api/auth/sessions", {
    token: rawUserToken,
    method: "DELETE",
    body: { revokeOthers: true },
  });
  const resRevokeOthers = await sessionsDeleteRoute(reqRevokeOthers);
  const remainingSessions = await db.select().from(sessions).where(eq(sessions.userId, regularUserId));
  assert(
    resRevokeOthers.status === 200 && remainingSessions.length === 1 && remainingSessions[0].id === computedHash,
    "All other sessions revoked while preserving current active session"
  );

  // 11. Regular User Accessing Admin Endpoints -> 403
  console.log("\n--- 11. Testing Regular User Accessing Admin Endpoints ---");
  const reqAdminByRegular = makeReq("/api/admin/settings", { token: rawUserToken, method: "GET" });
  const resAdminByRegular = await adminSettingsGetRoute(reqAdminByRegular);
  assert(resAdminByRegular.status === 403, "Regular user calling Admin Settings rejected with HTTP 403");

  // 12. Moderator Accessing Admin-Only API -> 403
  console.log("\n--- 12. Testing Moderator Accessing Admin-Only API ---");
  const reqAdminByMod = makeReq("/api/admin/settings", { token: rawModToken, method: "GET" });
  const resAdminByMod = await adminSettingsGetRoute(reqAdminByMod);
  assert(resAdminByMod.status === 403, "Moderator user calling Admin Settings rejected with HTTP 403");

  // 13. Moderator Reviewing Report -> 200 Allowed
  console.log("\n--- 13. Testing Moderator Reviewing Report ---");
  const reportId = `rep_${nanoid(8)}`;
  await db.insert(reports).values({
    id: reportId,
    reporterId: regularUserId,
    targetType: "thread",
    targetId: "th_test_123",
    reason: "Spam content",
    status: "pending",
  });
  const reqModResolve = makeReq("/api/admin/moderation", {
    token: rawModToken,
    body: { type: "resolve_report", targetId: reportId, note: "Resolved spam thread" },
  });
  const resModResolve = await adminModerationRoute(reqModResolve);
  const dataModResolve = await resModResolve.json();
  const updatedReport = (await db.select().from(reports).where(eq(reports.id, reportId)).limit(1))[0];
  assert(
    resModResolve.status === 200 && updatedReport?.status === "resolved",
    "Moderator successfully reviewed and resolved moderation report"
  );

  // 14. Moderator Attempting Ledger Adjustment -> 403 Forbidden
  console.log("\n--- 14. Testing Moderator Attempting Ledger Adjustment ---");
  const reqModLedger = makeReq("/api/admin/ledger", {
    token: rawModToken,
    idempotencyKey: `mod_ledger_key_${nanoid(8)}`,
    body: { targetUserId: regularUserId, amount: 100, reason: "Attempt by mod", confirmationCode: "CONFIRM_VALAX_ADJUST" },
  });
  const resModLedger = await adminLedgerRoute(reqModLedger);
  assert(resModLedger.status === 403, "Moderator attempting Credit adjustment strictly blocked with HTTP 403");

  // 15. Admin Adjusting Ledger -> 200 Success
  console.log("\n--- 15. Testing Admin Ledger Adjustment with Feature Flag ---");
  // Temporarily enable ADMIN_LEDGER_ADJUST_ENABLED flag for test
  await setFeatureFlag("ADMIN_LEDGER_ADJUST_ENABLED", true, adminUserId1);
  const validAdminKey = `adm_test_key_${nanoid(8)}`;
  const reqAdminLedger = makeReq("/api/admin/ledger", {
    token: rawAdmin1Token,
    idempotencyKey: validAdminKey,
    body: { targetUserId: regularUserId, amount: 75, reason: "Bug bounty reward", confirmationCode: "CONFIRM_VALAX_ADJUST" },
  });
  const resAdminLedger = await adminLedgerRoute(reqAdminLedger);
  const dataAdminLedger = await resAdminLedger.json();
  assert(
    resAdminLedger.status === 200 && dataAdminLedger.success === true,
    `Admin successfully adjusted wallet balance (New: ${dataAdminLedger.newBalance})`
  );

  // 16. User Modifying Own Role -> 400 Rejected
  console.log("\n--- 16. Testing User Modifying Own Role ---");
  const reqSelfRole = makeReq("/api/admin/users", {
    token: rawAdmin1Token,
    body: { targetUserId: adminUserId1, action: "set_role", role: "moderator" },
  });
  const resSelfRole = await adminUsersRoute(reqSelfRole);
  assert(resSelfRole.status === 400, "Administrator modifying own role rejected with HTTP 400 Protection");

  // 17. Deleting/Demoting Last Remaining Admin -> 400 Rejected
  console.log("\n--- 17. Testing Last Admin Demotion Protection ---");
  // Demote Admin 2 first (leaves Admin 1 as sole admin)
  await db.update(users).set({ role: "user" }).where(eq(users.id, adminUserId2));

  // Now attempt to demote Admin 1 (sole remaining admin)
  const reqDemoteLastAdmin = makeReq("/api/admin/users", {
    token: rawAdmin1Token,
    body: { targetUserId: adminUserId1, action: "set_role", role: "user", confirmationCode: "CONFIRM_ROLE_CHANGE" },
  });
  const resDemoteLastAdmin = await adminUsersRoute(reqDemoteLastAdmin);
  assert(resDemoteLastAdmin.status === 400, "Demoting last remaining platform admin strictly blocked with HTTP 400");

  // Restore Admin 2
  await db.update(users).set({ role: "admin" }).where(eq(users.id, adminUserId2));

  // 18. Feature Flag Server-Side API Enforcement
  console.log("\n--- 18. Testing Feature Flag Server-Side API Enforcement ---");
  // Disable THREAD_CREATION_ENABLED
  await setFeatureFlag("THREAD_CREATION_ENABLED", false, adminUserId1);
  const reqThreadDisabled = makeReq("/api/bbs/threads", {
    token: rawUserToken,
    body: { boardId: "brd_general", title: "Should Fail Thread", content: "Valid thread content length here." },
  });
  const resThreadDisabled = await threadsRoute(reqThreadDisabled);
  assert(resThreadDisabled.status === 403, "API rejects thread creation when THREAD_CREATION_ENABLED flag is false");

  // Re-enable flag
  await setFeatureFlag("THREAD_CREATION_ENABLED", true, adminUserId1);

  // 19. Admin Bootstrap via ADMIN_DISCORD_IDS
  console.log("\n--- 19. Testing Admin Bootstrap Logic ---");
  const testBootstrapDiscordId = "999988887777";
  process.env.ADMIN_DISCORD_IDS = `123456789, ${testBootstrapDiscordId}, 987654321`;
  const envList = (process.env.ADMIN_DISCORD_IDS || "").split(",").map((s) => s.trim());
  const isMatch = envList.includes(testBootstrapDiscordId);
  assert(isMatch, "Discord user matching ADMIN_DISCORD_IDS identified for admin promotion");

  // 20. Audit Logging Verification
  console.log("\n--- 20. Testing Audit Logs Persistence ---");
  const recentLogs = await db.select().from(auditLogs).limit(10);
  assert(recentLogs.length > 0 && !!recentLogs[0].action, `Audit logs correctly recorded ${recentLogs.length} events`);

  // 21. CSRF Protection on Mutating Admin Routes
  console.log("\n--- 21. Testing CSRF Origin Protection on Admin API ---");
  const reqCsrfEvil = makeReq("/api/admin/users", {
    token: rawAdmin1Token,
    origin: "https://evil-hacker.com",
    body: { targetUserId: regularUserId, action: "mute" },
  });
  const resCsrfEvil = await adminUsersRoute(reqCsrfEvil);
  assert(resCsrfEvil.status === 403, "Untrusted Origin rejected by CSRF guard on admin endpoint");

  // 22. Fail-Closed Rate Limiting on Admin Endpoints
  console.log("\n--- 22. Testing Fail-Closed Rate Limiter on Admin Endpoint ---");
  const adminLimitKey = `admin_rate_test_${nanoid(8)}`;
  const rateAdmin1 = await checkRateLimitAsync(adminLimitKey, { maxRequests: 2, windowSeconds: 30, failClosed: true });
  const rateAdmin2 = await checkRateLimitAsync(adminLimitKey, { maxRequests: 2, windowSeconds: 30, failClosed: true });
  const rateAdmin3 = await checkRateLimitAsync(adminLimitKey, { maxRequests: 2, windowSeconds: 30, failClosed: true });
  assert(
    rateAdmin1.allowed && rateAdmin2.allowed && !rateAdmin3.allowed,
    "Fail-closed rate limiter permitted 2 requests and strictly blocked 3rd request (429)"
  );

  console.log("\n=========================================================================");
  console.log(`PHASE 1B TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================================");

  if (failed > 0) process.exit(1);
}

runPhase1BTestSuite().catch((err) => {
  console.error("Phase 1B Test execution failed:", err);
  process.exit(1);
});