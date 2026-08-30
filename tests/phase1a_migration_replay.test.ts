import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

async function runMigrationReplayTest() {
  console.log("=========================================================================");
  console.log("   VALAX SCRUB BBS & TRADE - FRESH DATABASE MIGRATION REPLAY TEST        ");
  console.log("=========================================================================\n");

  const testDbFile = path.join(process.cwd(), "tests", "temp_fresh_migration.db");
  if (fs.existsSync(testDbFile)) {
    try { fs.unlinkSync(testDbFile); } catch {}
  }

  const client = createClient({ url: `file:${testDbFile}` });
  console.log(`[MIGRATION TEST] Target: Fresh isolated test database -> ${testDbFile}`);

  const drizzleDir = path.join(process.cwd(), "drizzle");
  const migrationFiles = [
    "0000_init_schema.sql",
    "0001_add_tags_and_notifications.sql",
    "0002_idempotency_and_ratelimit.sql",
    "0003_market_orders_state_machine.sql",
  ];

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

  for (let i = 0; i < migrationFiles.length; i++) {
    const fileName = migrationFiles[i];
    const filePath = path.join(drizzleDir, fileName);

    if (!fs.existsSync(filePath)) {
      console.error(`[FAIL] Missing migration file: ${fileName}`);
      failed++;
      continue;
    }

    const rawSql = fs.readFileSync(filePath, "utf-8");
    const cleanSql = rawSql.replace(/--.*$/gm, "");
    const statements = cleanSql
      .split(";")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);

    try {
      for (const stmt of statements) {
        if (stmt.trim()) {
          await client.execute(stmt);
        }
      }
      assert(true, `Migration ${fileName} applied successfully`, `${statements.length} statements executed`);
    } catch (err: any) {
      assert(false, `Migration ${fileName} failed`, err.message);
    }
  }

  // Audit created tables
  const tableCheck = await client.execute(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;"
  );
  const tableNames = tableCheck.rows.map((r) => r.name as string);
  console.log(`\n[AUDIT] Total Tables in Fresh Database: ${tableNames.length}`);
  tableNames.forEach((t, idx) => console.log(`  ${idx + 1}. ${t}`));

  assert(tableNames.includes("orders_market"), "orders_market table exists");
  assert(tableNames.includes("product_purchases"), "product_purchases table exists");
  assert(tableNames.includes("rate_limit_events"), "rate_limit_events table exists");
  assert(tableNames.includes("forum_tags"), "forum_tags table exists");
  assert(tableNames.includes("notifications"), "notifications table exists");

  try { client.close(); } catch {}
  try { if (fs.existsSync(testDbFile)) fs.unlinkSync(testDbFile); } catch {}

  console.log("\n=========================================================================");
  console.log(`MIGRATION TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("=========================================================================");

  if (failed > 0) process.exit(1);
}

runMigrationReplayTest().catch((err) => {
  console.error(err);
  process.exit(1);
});