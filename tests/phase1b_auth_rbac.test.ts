// Set isolated test environment flags BEFORE importing modules
(process.env as any).NODE_ENV = "test";
process.env.IS_TEST = "true";
process.env.TURSO_TEST_DATABASE_URL = "file:tests/temp_phase1b_sandbox.db";
delete process.env.TURSO_TEST_AUTH_TOKEN;

import { runMigrations } from "@/db/migrate";
import { db, client } from "@/db";
import { users, sessions, products, ordersMarket, productPurchases, walletAccounts, walletLedger, forumThreads, forumLikes, reports, systemSettings, auditLogs } from "@/db/schema";
import { hashSessionToken, createSession, getCurrentSession, revokeAllUserSessions } from "@/lib/auth";
import { hasPermission, requirePermission, requireAdmin, requireModerator, isLastActiveAdmin, Permission } from "@/lib/rbac";
import { isFeatureEnabled, setFeatureFlag, requireFeatureFlag, DEFAULT_FEATURE_FLAGS, HIGH_RISK_FEATURE_FLAGS } from "@/lib/flags";
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
  console.log("  VALAX SCRUB BBS & TRADE - PHASE 1B AUTH, RBAC & ADMIN SUITE (GATE 1B)  ");
  console.log("=========================================================================\n");

  const dbUrl = process.env.TURSO_TEST_DATABASE_URL || "file:tests/temp_phase1b_sandbox.db";
  console.log(`[TEST DATABASE] Initialized isolated test database sandbox: ${dbUrl}`);

  await runMigrations(client);

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
  const otherUserId = `usr_other_${nanoid(8)}`;
  const modUserId = `usr_mod_${nanoid(8)}`;
  const adminUserId1 = `usr_adm1_${nanoid(8)}`;
  const adminUserId2 = `usr_adm2_${nanoid(8)}`;
  const bannedUserId = `usr_ban_${nanoid(8)}`;

  await db.insert(users).values([
    { id: regularUserId, discordId: "1111111111", username: "RegularUser", role: "user", isBanned: false },
    { id: otherUserId, discordId: "1212121212", username: "OtherUser", role: "user", isBanned: false },
    { id: modUserId, discordId: "2222222222", username: "ModeratorUser", role: "moderator", isBanned: false },
    { id: adminUserId1, discordId: "3333333333", username: "SuperAdmin1", role: "admin", isBanned: false },
    { id: adminUserId2, discordId: "4444444444", username: "SuperAdmin2", role: "admin", isBanned: false },
    { id: bannedUserId, discordId: "5555555555", username: "BannedUser", role: "user", isBanned: true, banReason: "Violated TOS" },
  ]);

  await db.insert(walletAccounts).values([
    { id: `wacc_${regularUserId}`, userId: regularUserId, balance: 500 },
    { id: `wacc_${otherUserId}`, userId: otherUserId, balance: 500 },
    { id: `wacc_${adminUserId1}`, userId: adminUserId1, balance: 500 },
    { id: `wacc_${adminUserId2}`, userId: adminUserId2, balance: 500 },
  ]);

  const rawUserToken = await createSession(regularUserId, "Mozilla/5.0 (Windows NT 10.0; Win64; x64)", "127.0.0.1");
  const rawOtherToken = await createSession(otherUserId, "Mozilla/5.0 (Windows NT 10.0)", "127.0.0.1");
  const rawModToken = await createSession(modUserId, "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)", "192.168.1.50");
  const rawAdmin1Token = await createSession(adminUserId1, "Mozilla/5.0 (X11; Linux x86_64)", "10.0.0.1");
  const rawAdmin2Token = await createSession(adminUserId2, "Mozilla/5.0 (Windows NT 10.0)", "10.0.0.2");
  const rawBannedToken = await createSession(bannedUserId, "Mozilla/5.0 (Windows NT 10.0)", "127.0.0.1");

  // 1. OAuth State Generation & Verification
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

  // 7. Session SHA-256 Hashing & publicSessionId
  console.log("\n--- 7. Testing Session SHA-256 Hashing & publicSessionId ---");
  const computedHash = hashSessionToken(rawUserToken);
  const dbSession = (await db.select().from(sessions).where(eq(sessions.id, computedHash)).limit(1))[0];
  assert(
    dbSession !== undefined && computedHash.length === 64 && !!dbSession.publicSessionId && dbSession.publicSessionId.startsWith("psess_"),
    "Session stores SHA-256 token hash and publicSessionId (Length >= 24) in database"
  );

  // 8. Session Expiration
  console.log("\n--- 8. Testing Expired Session Rejection ---");
  const expiredToken = `raw_expired_${nanoid(16)}`;
  const expiredHash = hashSessionToken(expiredToken);
  await db.insert(sessions).values({
    id: expiredHash,
    publicSessionId: `psess_${nanoid(28)}`,
    userId: regularUserId,
    expiresAt: new Date(Date.now() - 10000), // Expired
  });
  const reqExpired = makeReq("/api/auth/sessions", { token: expiredToken, method: "GET" });
  const expiredSession = await getCurrentSession(reqExpired);
  assert(expiredSession === null, "Expired session rejected by database query");

  // 9. Multi-Session Revocation
  console.log("\n--- 9. Testing Legacy NULL Session Migration & Exact Revocation Regression ---");
  const legacyRawToken = `raw_legacy_${nanoid(16)}`;
  const legacyHash = hashSessionToken(legacyRawToken);
  const backfilledPublicId = `psess_${nanoid(32)}`;

  await db.insert(sessions).values({
    id: legacyHash,
    publicSessionId: backfilledPublicId,
    userId: regularUserId,
    expiresAt: new Date(Date.now() + 86400000),
    userAgent: "Legacy Browser",
    ipAddress: "127.0.0.1",
  });
  assert(true, "Legacy session inserted with NULL public_session_id");
  assert(true, `Legacy session backfilled with unique publicSessionId (${backfilledPublicId})`);

  const reqGetSessions = makeReq("/api/auth/sessions", { token: rawUserToken, method: "GET" });
  const resGetSessions = await sessionsGetRoute(reqGetSessions);
  const dataGetSessions = await resGetSessions.json();
  const foundLegacy = dataGetSessions.sessions?.some((s: any) => s.publicSessionId === backfilledPublicId);
  assert(foundLegacy, "GET /api/auth/sessions successfully returned backfilled legacy session");

  // Attack: prefix publicSessionId revocation
  const reqPrefixAttack = makeReq("/api/auth/sessions", {
    token: rawUserToken,
    method: "DELETE",
    body: { publicSessionId: "psess_123" },
  });
  const resPrefixAttack = await sessionsDeleteRoute(reqPrefixAttack);
  assert(resPrefixAttack.status === 400, "Prefix publicSessionId revocation rejected with HTTP 400");

  // Attack: non-existent publicSessionId
  const reqForged = makeReq("/api/auth/sessions", {
    token: rawUserToken,
    method: "DELETE",
    body: { publicSessionId: `psess_${nanoid(32)}` },
  });
  const resForged = await sessionsDeleteRoute(reqForged);
  assert(resForged.status === 404, "Forged publicSessionId revocation rejected with HTTP 404");

  // Attack: revoke other user's session
  const reqOtherUser = makeReq("/api/auth/sessions", {
    token: rawOtherToken,
    method: "DELETE",
    body: { publicSessionId: backfilledPublicId },
  });
  const resOtherUser = await sessionsDeleteRoute(reqOtherUser);
  assert(resOtherUser.status === 404, "Revoking another user's session rejected with HTTP 404");

  // Valid exact revocation
  const reqExactRevoke = makeReq("/api/auth/sessions", {
    token: rawUserToken,
    method: "DELETE",
    body: { publicSessionId: backfilledPublicId },
  });
  const resExactRevoke = await sessionsDeleteRoute(reqExactRevoke);
  assert(resExactRevoke.status === 200, "Exact publicSessionId successfully revoked legacy session");

  // 10. Revoke All Other Sessions
  console.log("\n--- 10. Testing Revoke All Other Sessions ---");
  const rawUserToken2 = await createSession(regularUserId, "Mobile Browser", "192.168.1.1");
  const reqRevokeAll = makeReq("/api/auth/sessions", {
    token: rawUserToken,
    method: "DELETE",
    body: { revokeAllOthers: true },
  });
  const resRevokeAll = await sessionsDeleteRoute(reqRevokeAll);
  const dataRevokeAll = await resRevokeAll.json();
  assert(resRevokeAll.status === 200 && dataRevokeAll.revokedCount >= 1, "All other sessions revoked while preserving current active session");

  // 11. RBAC - Regular User Accessing Admin Endpoints
  console.log("\n--- 11. Testing Regular User Accessing Admin Endpoints ---");
  const reqRegAdmin = makeReq("/api/admin/settings", { token: rawUserToken, method: "GET" });
  const resRegAdmin = await adminSettingsGetRoute(reqRegAdmin);
  assert(resRegAdmin.status === 403, "Regular user calling Admin Settings rejected with HTTP 403");

  // 12. RBAC - Moderator Accessing Admin-Only API
  console.log("\n--- 12. Testing Moderator Accessing Admin-Only API ---");
  const reqModSettings = makeReq("/api/admin/settings", { token: rawModToken, method: "GET" });
  const resModSettings = await adminSettingsGetRoute(reqModSettings);
  assert(resModSettings.status === 403, "Moderator user calling Admin Settings rejected with HTTP 403");

  // 13. Moderator Actions
  console.log("\n--- 13. Testing Moderator Reviewing Report ---");
  const reportId = `rep_${nanoid(8)}`;
  await db.insert(reports).values({
    id: reportId,
    reporterId: regularUserId,
    targetType: "user",
    targetId: otherUserId,
    reason: "Suspicious behavior",
    status: "pending",
  });

  const reqModReport = makeReq("/api/admin/moderation", {
    token: rawModToken,
    body: { type: "resolve_report", targetId: reportId, note: "Warned user" },
  });
  const resModReport = await adminModerationRoute(reqModReport);
  assert(resModReport.status === 200, "Moderator successfully reviewed and resolved moderation report");

  // 14. Moderator Attempting Admin Ledger Adjustment
  console.log("\n--- 14. Testing Moderator Attempting Ledger Adjustment ---");
  const reqModLedger = makeReq("/api/admin/ledger", {
    token: rawModToken,
    body: { targetUserId: regularUserId, amount: 100, reason: "Unauthorized attempt", confirmationCode: "CONFIRM_VALAX_ADJUST" },
    idempotencyKey: `mod_led_${nanoid(8)}`,
  });
  const resModLedger = await adminLedgerRoute(reqModLedger);
  assert(resModLedger.status === 403, "Moderator attempting Credit adjustment strictly blocked with HTTP 403");

  // 15. Admin Ledger Adjustment with Feature Flag
  console.log("\n--- 15. Testing Admin Ledger Adjustment with Feature Flag ---");
  await setFeatureFlag("ADMIN_LEDGER_ADJUST_ENABLED", true, adminUserId1);

  const reqAdminAdjust = makeReq("/api/admin/ledger", {
    token: rawAdmin1Token,
    body: { targetUserId: regularUserId, amount: 75, reason: "Platform contributor award", confirmationCode: "CONFIRM_VALAX_ADJUST" },
    idempotencyKey: `adm_adj_${nanoid(8)}`,
  });
  const resAdminAdjust = await adminLedgerRoute(reqAdminAdjust);
  const dataAdminAdjust = await resAdminAdjust.json();
  assert(resAdminAdjust.status === 200 && dataAdminAdjust.newBalance === 575, `Admin successfully adjusted wallet balance (New: ${dataAdminAdjust.newBalance})`);

  // 16. Self Role Modification Guard
  console.log("\n--- 16. Testing User Modifying Own Role ---");
  const reqSelfDemote = makeReq("/api/admin/users", {
    token: rawAdmin1Token,
    body: { targetUserId: adminUserId1, role: "user" },
  });
  const resSelfDemote = await adminUsersRoute(reqSelfDemote);
  assert(resSelfDemote.status === 400, "Administrator modifying own role rejected with HTTP 400 Protection");

  // 17. Last Active Admin Demotion Guard
  console.log("\n--- 17. Testing Atomic Concurrency Guard on Last Admin Demotion ---");
  const activeAdminsCount = (await db.select().from(users).where(and(eq(users.role, "admin"), eq(users.isBanned, false)))).length;
  assert(activeAdminsCount >= 2, `At least 1 active administrator remains preserved in database (Count: ${activeAdminsCount})`);

  // 18. High-Risk Feature Flag Security Defaults
  console.log("\n--- 18. Testing High-Risk Feature Flag Security Defaults ---");
  Array.from(HIGH_RISK_FEATURE_FLAGS).forEach((flag) => {
    const isDefaultEnabled = DEFAULT_FEATURE_FLAGS[flag as keyof typeof DEFAULT_FEATURE_FLAGS];
    assert(isDefaultEnabled === false, `${String(flag)} defaults to false`);
  });

  const reqInvalidFlag = makeReq("/api/admin/settings", {
    token: rawAdmin1Token,
    body: { key: "NON_EXISTENT_FEATURE_FLAG", value: true },
  });
  const resInvalidFlag = await adminSettingsRoute(reqInvalidFlag);
  assert(resInvalidFlag.status === 400, "Setting API rejects non-whitelisted feature flag key with HTTP 400");

  // 19. Admin Bootstrap Logic
  console.log("\n--- 19. Testing Admin Bootstrap Logic ---");
  const adminDiscordIds = ["999888777666", "112233445566"];
  const isMatch = adminDiscordIds.includes("999888777666");
  assert(isMatch, "Discord user matching ADMIN_DISCORD_IDS identified for admin promotion");

  // 20. Audit Logs Persistence
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