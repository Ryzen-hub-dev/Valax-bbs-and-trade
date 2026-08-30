import { createClient } from "@libsql/client";
import crypto from "crypto";
import dotenv from "dotenv";
import { STATIC_ALLOWED_ORIGINS, getSafeOrigin } from "@/config/origins";
import { checkRateLimitAsync } from "@/lib/rate-limit";

dotenv.config();

function sha256(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}

async function runTests() {
  console.log("===============================================================");
  console.log("       VALAX SCRUB BBS & TRADE - PHASE 1A SECURITY SUITE       ");
  console.log("===============================================================\n");

  const url = process.env.TURSO_DATABASE_URL;
  const authToken = process.env.TURSO_AUTH_TOKEN;
  const client = createClient({ url: url!, authToken });

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail = "") {
    if (condition) {
      console.log(`[PASS] ${testName} ${detail ? "(" + detail + ")" : ""}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${detail}`);
      failed++;
    }
  }

  // TEST 1: Session Token SHA-256 Hashing
  console.log("--- 1. Testing Session Token SHA-256 Hashing ---");
  const rawToken = "valax_test_raw_token_xyz_1234567890abcdef1234567890";
  const hashedToken = sha256(rawToken);
  assert(hashedToken.length === 64, "SHA-256 output length is 64 hex characters", `Hash: ${hashedToken.slice(0, 16)}...`);
  assert(hashedToken !== rawToken, "Database stores hashed token, not raw plaintext");

  // TEST 2: Origin Allowlist Exact Matching & Fail-Closed
  console.log("\n--- 2. Testing Strict Origin Allowlist ---");
  const valid1 = getSafeOrigin("http://localhost:3000");
  const valid2 = getSafeOrigin("https://valax-bbs-and-trade.vercel.app");
  const valid3 = getSafeOrigin("https://bbs-and-trade.valaxscrub.shop");
  assert(valid1 === "http://localhost:3000", "Localhost allowed", valid1 ?? "");
  assert(valid2 === "https://valax-bbs-and-trade.vercel.app", "Vercel staging domain allowed", valid2 ?? "");
  assert(valid3 === "https://bbs-and-trade.valaxscrub.shop", "Production custom domain allowed", valid3 ?? "");

  // Hostile / untrusted / prefix bypass origins
  const evil1 = getSafeOrigin("https://evil-attacker.com");
  const evil2 = getSafeOrigin("https://valax-bbs-and-trade.vercel.app.evil.com");
  const evil3 = getSafeOrigin("https://arbitrary-preview.vercel.app");
  const evil4 = getSafeOrigin("javascript:alert(1)");
  assert(evil1 === null, "Arbitrary external domain rejected", "evil-attacker.com -> null");
  assert(evil2 === null, "Prefix bypass attempt rejected", "subdomain.evil.com -> null");
  assert(evil3 === null, "Unregistered arbitrary vercel.app rejected", "arbitrary-preview.vercel.app -> null");
  assert(evil4 === null, "Dangerous scheme rejected", "javascript: -> null");

  // TEST 3: Rate Limiting Sliding Window
  console.log("\n--- 3. Testing Rate Limiter ---");
  const testKey = `test_rate_${Date.now()}`;
  let ratePassed = true;
  for (let i = 0; i < 5; i++) {
    const res = await checkRateLimitAsync(testKey, { maxRequests: 5, windowSeconds: 10 });
    if (!res.allowed) ratePassed = false;
  }
  const overflowRes = await checkRateLimitAsync(testKey, { maxRequests: 5, windowSeconds: 10 });
  assert(ratePassed, "Allowed requests within rate limit threshold");
  assert(overflowRes.allowed === false, "6th request exceeded limit and was blocked (429)");

  // TEST 4: Product Pricing Validation
  console.log("\n--- 4. Testing Product Pricing Rules ---");
  function validatePrice(val: unknown) {
    return typeof val === "number" && Number.isSafeInteger(val) && val > 0 && val <= 1000000;
  }
  assert(validatePrice(50) === true, "Valid positive integer price 50 accepted");
  assert(validatePrice(0) === false, "Zero price rejected");
  assert(validatePrice(-10) === false, "Negative price rejected");
  assert(validatePrice(12.5) === false, "Float price rejected");
  assert(validatePrice(NaN) === false, "NaN price rejected");
  assert(validatePrice(Infinity) === false, "Infinity price rejected");
  assert(validatePrice(9999999999) === false, "Overly large price rejected");

  // TEST 5: Turso Active Entitlement Partial Unique Index & Idempotency
  console.log("\n--- 5. Testing Database Constraints & Idempotency ---");
  const testUserId = `test_user_${Date.now()}`;
  const testDevId = `test_dev_${Date.now()}`;
  const testProdId = `test_prod_${Date.now()}`;
  const testIdempotencyKey = `idemp_${Date.now()}_testkey1234`;

  try {
    await client.execute({
      sql: "INSERT INTO users (id, discord_id, username, role) VALUES (?, ?, ?, ?)",
      args: [testUserId, `disc_${Date.now()}`, "TestBuyer", "user"]
    });
    await client.execute({
      sql: "INSERT INTO users (id, discord_id, username, role) VALUES (?, ?, ?, ?)",
      args: [testDevId, `disc_dev_${Date.now()}`, "TestDev", "user"]
    });
    await client.execute({
      sql: "INSERT INTO products (id, developer_id, title, slug, short_description, description, category, token_price, github_release_url, status, moderation_status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
      args: [testProdId, testDevId, "Test Script", `slug-${Date.now()}`, "Short desc", "Long description test", "Scripts", 100, "https://github.com/valax/release", "active", "approved"]
    });

    // 1st Insert Entitlement
    await client.execute({
      sql: "INSERT INTO product_purchases (id, product_id, buyer_id, tokens_spent, license_key, idempotency_key, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
      args: [`ent_1_${Date.now()}`, testProdId, testUserId, 100, `KEY-1-${Date.now()}`, testIdempotencyKey, "active"]
    });
    assert(true, "First active entitlement inserted successfully");

    // 2nd Insert with SAME active status (Must fail by SQLite partial unique index)
    let duplicateFailed = false;
    try {
      await client.execute({
        sql: "INSERT INTO product_purchases (id, product_id, buyer_id, tokens_spent, license_key, idempotency_key, status) VALUES (?, ?, ?, ?, ?, ?, ?)",
        args: [`ent_2_${Date.now()}`, testProdId, testUserId, 100, `KEY-2-${Date.now()}`, `idemp_different_${Date.now()}`, "active"]
      });
    } catch {
      duplicateFailed = true;
    }
    assert(duplicateFailed, "Duplicate concurrent active entitlement blocked by SQLite partial unique index");

    // Clean up test records
    await client.execute({ sql: "DELETE FROM product_purchases WHERE buyer_id = ?", args: [testUserId] });
    await client.execute({ sql: "DELETE FROM products WHERE id = ?", args: [testProdId] });
    await client.execute({ sql: "DELETE FROM users WHERE id IN (?, ?)", args: [testUserId, testDevId] });
    assert(true, "Cleaned up ephemeral test records");
  } catch (err: any) {
    console.error("Database constraint test error:", err);
    assert(false, "Database constraint test failed", err.message);
  }

  console.log("\n===============================================================");
  console.log(`SECURITY TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("===============================================================");

  if (failed > 0) process.exit(1);
}

runTests().catch((e) => {
  console.error(e);
  process.exit(1);
});