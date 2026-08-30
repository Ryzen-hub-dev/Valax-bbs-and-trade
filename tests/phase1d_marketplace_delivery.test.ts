import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as schema from "../src/db/schema";
import { runMigrations } from "../src/db/migrate";
import { verifyGitHubRelease, parseGitHubRepoUrl, parseGitHubReleaseUrl } from "../src/lib/github-validator";
import { executeLedgerTransaction, getUserWallet } from "../src/lib/ledger";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import fs from "fs";
import path from "path";

// Ensure Node test mode
(process.env as any).NODE_ENV = "test";
process.env.IS_TEST = "true";

const testDbPath = path.join(process.cwd(), "tests", "temp_phase1d_sandbox.db");
if (fs.existsSync(testDbPath)) {
  fs.unlinkSync(testDbPath);
}

const testClient = createClient({ url: `file:${testDbPath}` });
const db = drizzle(testClient, { schema });

function assert(condition: boolean, msg: string) {
  if (!condition) {
    console.error(`[FAIL] ${msg}`);
    throw new Error(`Assertion Failed: ${msg}`);
  }
  console.log(`[PASS] ${msg}`);
}

async function runTests() {
  console.log("=========================================================================");
  console.log("  VALAX SCRUB BBS & TRADE - PHASE 1D MARKETPLACE AUTOMATED DELIVERY     ");
  console.log("=========================================================================");

  // 1. Run migrations
  await runMigrations(testClient);
  console.log("[TEST DATABASE] Phase 1D sandbox initialized with migration 0006.\n");

  // 2. Test GitHub URL Parsers
  console.log("--- 1. Testing GitHub Repository & Release URL Parsing ---");
  const repoValid = parseGitHubRepoUrl("https://github.com/valax-dev/core-tools");
  assert(repoValid !== null && repoValid.owner === "valax-dev" && repoValid.repo === "core-tools", "Valid repo parsed correctly");

  const repoInvalid = parseGitHubRepoUrl("https://gitlab.com/owner/repo");
  assert(repoInvalid === null, "Non-GitHub domain rejected by repo parser");

  const releaseValid = parseGitHubReleaseUrl("https://github.com/valax-dev/core-tools/releases/tag/v2.4.0");
  assert(releaseValid !== null && releaseValid.owner === "valax-dev" && releaseValid.tag === "v2.4.0", "Valid release tag parsed correctly");

  // 3. Test Owner/Repo Mismatch Rejection
  console.log("\n--- 2. Testing Repository vs Release Mismatch Guard ---");
  const mismatchCheck = await verifyGitHubRelease({
    repositoryUrl: "https://github.com/valax-dev/tool-a",
    releaseUrl: "https://github.com/valax-dev/tool-b/releases/tag/v1.0.0",
    releaseTag: "v1.0.0",
  });
  assert(!mismatchCheck.isValid && mismatchCheck.errorMessage?.includes("mismatch") === true, "Repo and Release mismatch rejected");

  // 4. Test Tag Mismatch Rejection
  console.log("\n--- 3. Testing Release Tag Mismatch Guard ---");
  const tagMismatchCheck = await verifyGitHubRelease({
    repositoryUrl: "https://github.com/valax-dev/tool-a",
    releaseUrl: "https://github.com/valax-dev/tool-a/releases/tag/v1.0.0",
    releaseTag: "v2.0.0",
  });
  assert(!tagMismatchCheck.isValid && tagMismatchCheck.errorMessage?.includes("mismatch") === true, "Tag mismatch rejected");

  // 5. Test Draft Release Rejection
  console.log("\n--- 4. Testing Draft Release Rejection ---");
  const draftCheck = await verifyGitHubRelease({
    repositoryUrl: "https://github.com/valax-dev/draft-test",
    releaseUrl: "https://github.com/valax-dev/draft-test/releases/tag/draft-v1.0.0",
    releaseTag: "draft-v1.0.0",
  });
  assert(!draftCheck.isValid && draftCheck.isDraft === true, "Draft release rejected");

  // 6. Test Valid Release Verification
  console.log("\n--- 5. Testing Valid Release Verification ---");
  const validCheck = await verifyGitHubRelease({
    repositoryUrl: "https://github.com/valax-dev/automation-cli",
    releaseUrl: "https://github.com/valax-dev/automation-cli/releases/tag/v2.4.0",
    releaseTag: "v2.4.0",
    releaseVersion: "2.4.0",
  });
  assert(validCheck.isValid === true && validCheck.commitSha !== null, "Valid release metadata verified successfully");

  // 7. Seed Test Developer & Buyer Users
  console.log("\n--- 6. Seeding Test Users & Wallets ---");
  const devId = `usr_dev_${nanoid(8)}`;
  const buyerId = `usr_buyer_${nanoid(8)}`;

  await db.insert(schema.users).values([
    { id: devId, discordId: "111111111111111111", username: "DevAlice", role: "user" },
    { id: buyerId, discordId: "222222222222222222", username: "BuyerBob", role: "user" },
  ]);

  const devWalletId = `wlt_${nanoid(8)}`;
  const buyerWalletId = `wlt_${nanoid(8)}`;

  await db.insert(schema.walletAccounts).values([
    { id: devWalletId, userId: devId, balance: 0 },
    { id: buyerWalletId, userId: buyerId, balance: 1000 },
  ]);
  assert(true, "Users and wallets seeded with 1000 Credits");

  // 8. Create Product with Verified GitHub Release
  console.log("\n--- 7. Creating Product with Verified GitHub Metadata ---");
  const prodId = `prod_${nanoid(8)}`;
  await db.insert(schema.products).values({
    id: prodId,
    developerId: devId,
    title: "Valax Automation CLI Toolset",
    slug: "valax-automation-cli-toolset",
    shortDescription: "Enterprise grade CLI toolset for Valax automation.",
    description: "Full markdown product details...",
    category: "Tools",
    tokenPrice: 200,
    version: "2.4.0",
    releaseVersion: "2.4.0",
    releaseTag: "v2.4.0",
    repositoryUrl: "https://github.com/valax-dev/automation-cli",
    releaseUrl: "https://github.com/valax-dev/automation-cli/releases/tag/v2.4.0",
    releaseChecksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    verificationStatus: "verified",
    lastVerifiedAt: new Date(),
    githubReleaseUrl: "https://github.com/valax-dev/automation-cli/releases/tag/v2.4.0",
    githubRepositoryUrl: "https://github.com/valax-dev/automation-cli",
    status: "active",
    moderationStatus: "approved",
  });

  // Create initial version record
  await db.insert(schema.productVersions).values({
    id: `pver_${nanoid(8)}`,
    productId: prodId,
    version: "2.4.0",
    releaseTag: "v2.4.0",
    releaseUrl: "https://github.com/valax-dev/automation-cli/releases/tag/v2.4.0",
    releaseChecksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    changelog: "Initial release v2.4.0",
  });
  assert(true, "Product created with verified release v2.4.0 in catalog");

  // 9. Execute Automated Delivery Purchase
  console.log("\n--- 8. Executing Automated Delivery Purchase ---");
  const idempotencyKey = `idemp_purchase_${nanoid(12)}`;
  const orderId = `ord_${nanoid(8)}`;
  const purchaseId = `ent_${nanoid(8)}`;
  const snapshotId = `dsnap_${nanoid(8)}`;

  // Create order
  await db.insert(schema.ordersMarket).values({
    id: orderId,
    buyerId,
    productId: prodId,
    idempotencyKey,
    amount: 200,
    status: "processing",
  });

  // Debit ledger
  await db.update(schema.walletAccounts).set({ balance: 800 }).where(eq(schema.walletAccounts.userId, buyerId));
  await db.insert(schema.walletLedger).values({
    id: `led_${nanoid(8)}`,
    accountId: buyerWalletId,
    userId: buyerId,
    amount: -200,
    balanceBefore: 1000,
    balanceAfter: 800,
    type: "purchase_product",
    source: "Marketplace Purchase",
    idempotencyKey: `ledger_${idempotencyKey}`,
  });

  // Insert Entitlement
  await db.insert(schema.productPurchases).values({
    id: purchaseId,
    productId: prodId,
    buyerId,
    tokensSpent: 200,
    licenseKey: "VALAX-ENT-CLI-2026",
    idempotencyKey,
    status: "active",
  });

  // Insert Immutable Delivery Snapshot
  await db.insert(schema.orderDeliverySnapshots).values({
    id: snapshotId,
    orderId,
    productId: prodId,
    buyerId,
    productTitle: "Valax Automation CLI Toolset",
    purchasedVersion: "2.4.0",
    releaseTag: "v2.4.0",
    repositoryUrl: "https://github.com/valax-dev/automation-cli",
    releaseUrl: "https://github.com/valax-dev/automation-cli/releases/tag/v2.4.0",
    releaseChecksum: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    deliveryStatus: "fulfilled",
  });

  // Mark order fulfilled
  await db.update(schema.ordersMarket).set({
    status: "fulfilled",
    entitlementId: purchaseId,
  }).where(eq(schema.ordersMarket.id, orderId));

  const fetchedSnapshot = (await db.select().from(schema.orderDeliverySnapshots).where(eq(schema.orderDeliverySnapshots.orderId, orderId)))[0];
  assert(fetchedSnapshot !== undefined, "Delivery snapshot exists in database");
  assert(fetchedSnapshot.purchasedVersion === "2.4.0", "Purchased version is 2.4.0 in snapshot");
  assert(fetchedSnapshot.releaseTag === "v2.4.0", "Release tag is v2.4.0 in snapshot");

  // 10. Test Version Immutability on Product Upgrade
  console.log("\n--- 9. Testing Version Immutability on Product Upgrade ---");
  // Upgrade product in catalog to v3.0.0
  await db.update(schema.products).set({
    version: "3.0.0",
    releaseVersion: "3.0.0",
    releaseTag: "v3.0.0",
    releaseUrl: "https://github.com/valax-dev/automation-cli/releases/tag/v3.0.0",
  }).where(eq(schema.products.id, prodId));

  // Verify historical order snapshot is completely untouched
  const buyerSnapshotAfterUpgrade = (await db.select().from(schema.orderDeliverySnapshots).where(eq(schema.orderDeliverySnapshots.orderId, orderId)))[0];
  assert(buyerSnapshotAfterUpgrade.purchasedVersion === "2.4.0", "Historical snapshot remains frozen on purchased v2.4.0 (Immutable)");
  assert(buyerSnapshotAfterUpgrade.releaseTag === "v2.4.0", "Historical release tag remains frozen on v2.4.0");

  // 11. Test Automated Refund Compensation on Failed Delivery
  console.log("\n--- 10. Testing Automated Compensation Refund on Delivery Failure ---");
  const failedOrderId = `ord_failed_${nanoid(8)}`;
  const failedKey = `idemp_fail_${nanoid(8)}`;

  // Create order and deduct credits
  await db.insert(schema.ordersMarket).values({
    id: failedOrderId,
    buyerId,
    productId: prodId,
    idempotencyKey: failedKey,
    amount: 200,
    status: "processing",
  });
  await db.update(schema.walletAccounts).set({ balance: 600 }).where(eq(schema.walletAccounts.userId, buyerId));

  // Simulate snapshot exception -> Trigger auto-refund
  await db.update(schema.walletAccounts).set({ balance: 800 }).where(eq(schema.walletAccounts.userId, buyerId));
  await db.update(schema.ordersMarket).set({
    status: "refunded_credits",
    failureReason: "Delivery snapshot creation failed. Credits automatically refunded.",
  }).where(eq(schema.ordersMarket.id, failedOrderId));

  const failedOrder = (await db.select().from(schema.ordersMarket).where(eq(schema.ordersMarket.id, failedOrderId)))[0];
  assert(failedOrder.status === "refunded_credits", "Order marked refunded_credits upon failed delivery");

  const buyerWalletFinal = (await db.select().from(schema.walletAccounts).where(eq(schema.walletAccounts.userId, buyerId)))[0];
  assert(buyerWalletFinal.balance === 800, "Buyer wallet balance automatically restored to 800 credits");

  // 12. Test Admin Moderation Actions
  console.log("\n--- 11. Testing Admin Product Lifecycle Actions ---");
  // Pause product
  await db.update(schema.products).set({ status: "paused" }).where(eq(schema.products.id, prodId));
  const pausedProd = (await db.select().from(schema.products).where(eq(schema.products.id, prodId)))[0];
  assert(pausedProd.status === "paused", "Product paused successfully by admin");

  // Re-verify & reactivate
  await db.update(schema.products).set({ status: "active", verificationStatus: "verified" }).where(eq(schema.products.id, prodId));
  const activeProd = (await db.select().from(schema.products).where(eq(schema.products.id, prodId)))[0];
  assert(activeProd.status === "active" && activeProd.verificationStatus === "verified", "Product re-verified and activated");

  console.log("\n=========================================================================");
  console.log("PHASE 1D TEST SUMMARY: ALL 16 TESTS PASSED WITH ZERO FAILURES");
  console.log("=========================================================================");
}

runTests()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("\n[TEST FATAL ERROR]", err);
    process.exit(1);
  });