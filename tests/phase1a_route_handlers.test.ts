import { POST as purchaseRoute } from "@/app/api/market/purchase/route";
import { POST as adminLedgerRoute } from "@/app/api/admin/ledger/route";
import { POST as marketProductsRoute } from "@/app/api/market/products/route";
import { POST as interactionsRoute } from "@/app/api/bbs/interactions/route";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import { db } from "@/db";
import { users, sessions, products, ordersMarket, productPurchases, walletAccounts, walletLedger, forumThreads, forumLikes } from "@/db/schema";
import { createHash } from "crypto";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest } from "next/server";

async function runRealRouteHandlersSuite() {
  console.log("=========================================================================");
  console.log("  VALAX SCRUB BBS & TRADE - REAL ROUTE HANDLER IMPORT & EXECUTION TESTS  ");
  console.log("=========================================================================\n");

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

  // 1. Setup Test Users and Sessions in Database
  const testBuyerId = `test_buyer_${nanoid(8)}`;
  const testDevId = `test_dev_${nanoid(8)}`;
  const testAdminId = `test_admin_${nanoid(8)}`;

  const rawBuyerToken = `raw_token_buyer_${nanoid(16)}`;
  const rawAdminToken = `raw_token_admin_${nanoid(16)}`;

  const hashedBuyerToken = createHash("sha256").update(rawBuyerToken).digest("hex");
  const hashedAdminToken = createHash("sha256").update(rawAdminToken).digest("hex");

  await db.insert(users).values([
    { id: testBuyerId, discordId: `disc_${nanoid(8)}`, username: "TestBuyer", role: "user" },
    { id: testDevId, discordId: `disc_${nanoid(8)}`, username: "TestDev", role: "user" },
    { id: testAdminId, discordId: `disc_${nanoid(8)}`, username: "TestAdmin", role: "admin" },
  ]);

  await db.insert(sessions).values([
    { id: hashedBuyerToken, userId: testBuyerId, expiresAt: new Date(Date.now() + 86400000) },
    { id: hashedAdminToken, userId: testAdminId, expiresAt: new Date(Date.now() + 86400000) },
  ]);

  await db.insert(walletAccounts).values([
    { id: `wacc_${testBuyerId}`, userId: testBuyerId, balance: 1000 },
    { id: `wacc_${testAdminId}`, userId: testAdminId, balance: 500 },
  ]);

  const activeProductId = `prod_act_${nanoid(8)}`;
  const pendingProductId = `prod_pend_${nanoid(8)}`;
  const secondProductId = `prod_sec_${nanoid(8)}`;

  await db.insert(products).values([
    {
      id: activeProductId,
      developerId: testDevId,
      title: "Active Asset Script",
      slug: `active-script-${nanoid(6)}`,
      shortDescription: "Valid active digital asset.",
      description: "Comprehensive active digital asset description.",
      category: "Scripts",
      tokenPrice: 150,
      githubReleaseUrl: "https://github.com/valax/script/releases/tag/v1.0.0",
      status: "active",
      moderationStatus: "approved",
    },
    {
      id: pendingProductId,
      developerId: testDevId,
      title: "Pending Asset Script",
      slug: `pending-script-${nanoid(6)}`,
      shortDescription: "Pending moderation asset.",
      description: "Pending moderation asset description.",
      category: "Scripts",
      tokenPrice: 100,
      githubReleaseUrl: "https://github.com/valax/script-pending/releases/tag/v1.0.0",
      status: "draft",
      moderationStatus: "pending",
    },
    {
      id: secondProductId,
      developerId: testDevId,
      title: "Second Active Asset",
      slug: `second-script-${nanoid(6)}`,
      shortDescription: "Another active digital asset.",
      description: "Another active digital asset description.",
      category: "Scripts",
      tokenPrice: 200,
      githubReleaseUrl: "https://github.com/valax/script-second/releases/tag/v2.0.0",
      status: "active",
      moderationStatus: "approved",
    },
  ]);

  const validOrigin = "https://bbs-and-trade.valaxscrub.shop";
  const appUrl = "http://localhost:3000";

  // HELPER: Build authenticated NextRequest
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

  // TEST 1: Missing Idempotency-Key -> 400
  console.log("--- 1. Testing Missing Idempotency-Key Header ---");
  const req1 = makeReq("/api/market/purchase", {
    body: { productId: activeProductId },
    token: rawBuyerToken,
  });
  const res1 = await purchaseRoute(req1);
  const data1 = await res1.json();
  assert(res1.status === 400, "Missing Idempotency-Key returns HTTP 400", JSON.stringify(data1));

  // TEST 2: Missing Origin on state mutation -> 403
  console.log("\n--- 2. Testing Missing Origin Header (CSRF Guard) ---");
  const req2 = makeReq("/api/market/purchase", {
    body: { productId: activeProductId },
    token: rawBuyerToken,
    origin: "",
    idempotencyKey: "idemp_test_missing_origin",
  });
  const res2 = await purchaseRoute(req2);
  assert(res2.status === 403, "Missing Origin header returns HTTP 403 Forbidden");

  // TEST 3: Hostile/Untrusted Origin -> 403
  console.log("\n--- 3. Testing Untrusted Origin ---");
  const req3 = makeReq("/api/market/purchase", {
    body: { productId: activeProductId },
    token: rawBuyerToken,
    origin: "https://evil-attacker.com",
    idempotencyKey: "idemp_test_evil_origin",
  });
  const res3 = await purchaseRoute(req3);
  assert(res3.status === 403, "Untrusted Origin rejected with HTTP 403");

  // TEST 4: Draft / Pending Product Purchase Blocked -> 404
  console.log("\n--- 4. Testing Draft/Pending Product Purchase ---");
  const req4 = makeReq("/api/market/purchase", {
    body: { productId: pendingProductId },
    token: rawBuyerToken,
    idempotencyKey: "idemp_test_pending_prod",
  });
  const res4 = await purchaseRoute(req4);
  assert(res4.status === 404, "Draft/Pending product returns HTTP 404 Not Found");

  // TEST 5: Successful Purchase Flow -> 200
  console.log("\n--- 5. Testing Real POST /api/market/purchase Success ---");
  const validPurchaseKey = `idemp_purchase_real_${nanoid(8)}`;
  const req5 = makeReq("/api/market/purchase", {
    body: { productId: activeProductId },
    token: rawBuyerToken,
    idempotencyKey: validPurchaseKey,
  });
  const res5 = await purchaseRoute(req5);
  const data5 = await res5.json();
  assert(res5.status === 200 && data5.success === true && !!data5.entitlementId, "Purchase succeeded with HTTP 200 & Entitlement", `Entitlement: ${data5.entitlementId}`);

  // TEST 6: Repeated Request with Same Idempotency-Key -> 200 Idempotent Replay
  console.log("\n--- 6. Testing Repeated Request with Same Idempotency-Key ---");
  const req6 = makeReq("/api/market/purchase", {
    body: { productId: activeProductId },
    token: rawBuyerToken,
    idempotencyKey: validPurchaseKey,
  });
  const res6 = await purchaseRoute(req6);
  const data6 = await res6.json();
  assert(res6.status === 200 && data6.isIdempotentReplay === true, "Repeated Key returns HTTP 200 Idempotent Replay without duplicate charge");

  // TEST 7: Same Key with Different Product -> 409 Conflict
  console.log("\n--- 7. Testing Same Key with Different Product (409 Conflict) ---");
  const req7 = makeReq("/api/market/purchase", {
    body: { productId: secondProductId },
    token: rawBuyerToken,
    idempotencyKey: validPurchaseKey,
  });
  const res7 = await purchaseRoute(req7);
  assert(res7.status === 409, "Same Idempotency-Key with different product returns HTTP 409 Conflict");

  // TEST 8: Regular User Accessing Admin Ledger API -> 403 Forbidden
  console.log("\n--- 8. Testing Regular User Accessing Admin Ledger API ---");
  const req8 = makeReq("/api/admin/ledger", {
    body: { targetUserId: testBuyerId, amount: 100, reason: "Unauthorized attempt", confirmationCode: "CONFIRM_VALAX_ADJUST" },
    token: rawBuyerToken,
    idempotencyKey: "adm_idemp_unauth_001",
  });
  const res8 = await adminLedgerRoute(req8);
  assert(res8.status === 403, "Regular user calling Admin Ledger Route rejected with HTTP 403 Forbidden");

  // TEST 9: Admin Ledger Adjustment Success & Fingerprinted Replay
  console.log("\n--- 9. Testing Admin Ledger Adjustment Fingerprinted Conflict Guard ---");
  const adminIdempKey = `adm_adjust_key_${nanoid(8)}`;
  const req9a = makeReq("/api/admin/ledger", {
    body: { targetUserId: testBuyerId, amount: 50, reason: "Monthly loyalty reward", confirmationCode: "CONFIRM_VALAX_ADJUST" },
    token: rawAdminToken,
    idempotencyKey: adminIdempKey,
  });
  const res9a = await adminLedgerRoute(req9a);
  const data9a = await res9a.json();
  assert(res9a.status === 200 && data9a.success === true, "Admin adjustment succeeded with HTTP 200");

  // Same key with different amount -> 409 Conflict
  const req9b = makeReq("/api/admin/ledger", {
    body: { targetUserId: testBuyerId, amount: 500, reason: "Monthly loyalty reward", confirmationCode: "CONFIRM_VALAX_ADJUST" },
    token: rawAdminToken,
    idempotencyKey: adminIdempKey,
  });
  const res9b = await adminLedgerRoute(req9b);
  assert(res9b.status === 409, "Reusing Admin Idempotency-Key with different amount returns HTTP 409 Conflict");

  // TEST 10: Processing Order Lease Expiry & Reconciliation
  console.log("\n--- 10. Testing Order Lease Expiry Automatic Crash Reconciliation ---");
  const crashKey = `idemp_crash_recon_${nanoid(8)}`;
  const expiredDate = new Date(Date.now() - 60000); // 1 minute ago (expired lease)
  await db.insert(ordersMarket).values({
    id: `ord_crash_${nanoid(8)}`,
    buyerId: testBuyerId,
    productId: secondProductId,
    idempotencyKey: crashKey,
    amount: 200,
    status: "processing",
    processingStartedAt: expiredDate,
    leaseExpiresAt: expiredDate,
  });

  const req10 = makeReq("/api/market/purchase", {
    body: { productId: secondProductId },
    token: rawBuyerToken,
    idempotencyKey: crashKey,
  });
  const res10 = await purchaseRoute(req10);
  const data10 = await res10.json();
  assert(res10.status === 200 && data10.success === true, "Expired lease recovered and fulfilled successfully");

  // TEST 11: Rate Limiter True 20 Concurrent Requests Test
  console.log("\n--- 11. Testing 20 Real Concurrent Requests Rate Limiting ---");
  const concurrentRateKey = `ratelimit_concurrent_${nanoid(8)}`;
  const maxAllowed = 5;
  const concurrentPromises = [];

  for (let i = 0; i < 20; i++) {
    concurrentPromises.push(checkRateLimitAsync(concurrentRateKey, { maxRequests: maxAllowed, windowSeconds: 30 }));
  }

  const concurrentResults = await Promise.all(concurrentPromises);
  const allowedCount = concurrentResults.filter((r) => r.allowed).length;
  const blockedCount = concurrentResults.filter((r) => !r.allowed).length;

  console.log(`Concurrent Results: ${allowedCount} Allowed, ${blockedCount} Blocked (Threshold: ${maxAllowed})`);
  assert(allowedCount <= maxAllowed, `Atomic rate limiter allowed exactly ${allowedCount} <= ${maxAllowed} across 20 concurrent queries`);
  assert(blockedCount >= 15, `At least 15 concurrent requests were strictly blocked (429)`);

  // Clean up test data
  try {
    await db.delete(sessions).where(eq(sessions.userId, testBuyerId));
    await db.delete(sessions).where(eq(sessions.userId, testAdminId));
    await db.delete(productPurchases).where(eq(productPurchases.buyerId, testBuyerId));
    await db.delete(ordersMarket).where(eq(ordersMarket.buyerId, testBuyerId));
    await db.delete(walletLedger).where(eq(walletLedger.userId, testBuyerId));
    await db.delete(walletAccounts).where(eq(walletAccounts.userId, testBuyerId));
    await db.delete(walletAccounts).where(eq(walletAccounts.userId, testAdminId));
    await db.delete(products).where(eq(products.developerId, testDevId));
    await db.delete(users).where(eq(users.id, testBuyerId));
    await db.delete(users).where(eq(users.id, testDevId));
    await db.delete(users).where(eq(users.id, testAdminId));
  } catch (e) {}

  console.log("\n=========================================================================");
  console.log(`REAL ROUTE HANDLER SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================================");

  if (failed > 0) process.exit(1);
}

runRealRouteHandlersSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});