import { createClient } from "@libsql/client";
import { runMigrations } from "@/db/migrate";
import fs from "fs";
import path from "path";

async function runMigrationReplayTest() {
  console.log("=========================================================================");
  console.log("   VALAX SCRUB BBS & TRADE - FORMAL MIGRATION RUNNER REPLAY TEST         ");
  console.log("=========================================================================\n");

  const testDbFile = path.join(process.cwd(), "tests", "temp_fresh_migration.db");
  if (fs.existsSync(testDbFile)) {
    try { fs.unlinkSync(testDbFile); } catch {}
  }

  const client = createClient({ url: `file:${testDbFile}` });
  console.log(`[MIGRATION TEST] Target: Fresh isolated test database -> ${testDbFile}`);

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

  // 1. Setup legacy database state (0000 - 0003 only)
  const drizzleDir = path.join(process.cwd(), "drizzle");
  const baseMigrations = [
    "0000_init_schema.sql",
    "0001_add_tags_and_notifications.sql",
    "0002_idempotency_and_ratelimit.sql",
    "0003_market_orders_state_machine.sql",
  ];

  for (const fileName of baseMigrations) {
    const rawSql = fs.readFileSync(path.join(drizzleDir, fileName), "utf-8");
    const cleanSql = rawSql.replace(/--.*$/gm, "").replace(/--> statement-breakpoint/g, ";");
    const statements = cleanSql.split(";").map((s) => s.trim()).filter((s) => s.length > 0);
    for (const stmt of statements) {
      await client.execute(stmt);
    }
  }
  assert(true, "Base schema (0000-0003) applied successfully");

  // 2. Insert test user and legacy session (public_session_id does not exist yet)
  const testUserId = "usr_legacy_101";
  await client.execute({
    sql: "INSERT INTO users (id, discord_id, username, role) VALUES (?, ?, ?, ?);",
    args: [testUserId, "disc_101", "LegacyUser", "user"],
  });

  const legacySessionHash = "legacy_session_hash_1234567890abcdef1234567890abcdef1234567890ab";
  await client.execute({
    sql: "INSERT INTO sessions (id, user_id, expires_at, created_at, user_agent, ip_address) VALUES (?, ?, ?, ?, ?, ?);",
    args: [legacySessionHash, testUserId, Math.floor((Date.now() + 86400000) / 1000), Math.floor(Date.now() / 1000), "Legacy Browser", "192.168.1.1"],
  });
  assert(true, "Legacy session inserted into base schema");

  // 3. Execute formal migration runner across all migrations
  const run1 = await runMigrations(client);
  assert(run1.appliedCount > 0, `Formal migration runner executed successfully (Applied: ${run1.appliedCount})`);

  // 4. Verify legacy session has received unique, valid public_session_id
  const sessionCheck = await client.execute({
    sql: "SELECT * FROM sessions WHERE id = ?;",
    args: [legacySessionHash],
  });
  const legacyRow = sessionCheck.rows[0];
  const legacyPublicId = String(legacyRow.public_session_id || "");
  assert(
    legacyRow && legacyPublicId.startsWith("psess_") && legacyPublicId.length >= 24,
    `Legacy session backfilled with unique public_session_id (${legacyPublicId})`
  );

  // 5. Verify sessions table column info has notnull = 1
  const tableInfo = await client.execute("PRAGMA table_info(sessions);");
  const publicCol = tableInfo.rows.find((c) => c.name === "public_session_id");
  assert(publicCol !== undefined && Number(publicCol.notnull) === 1, "sessions.public_session_id has NOT NULL constraint (notnull: 1)");

  // 6. Verify Foreign Key integrity and Index presence
  const fkCheck = await client.execute("PRAGMA foreign_key_check;");
  assert(fkCheck.rows.length === 0, "PRAGMA foreign_key_check returned 0 violations");

  const indexCheck = await client.execute("SELECT name FROM sqlite_master WHERE type = 'index' AND tbl_name = 'sessions';");
  const indexNames = indexCheck.rows.map((r) => String(r.name));
  assert(
    indexNames.includes("sessions_user_id_idx") &&
    indexNames.includes("sessions_expires_at_idx") &&
    indexNames.includes("sessions_public_session_id_idx"),
    "All session indices restored successfully"
  );

  // 7. Verify Idempotency: Re-running migration runner does nothing
  const run2 = await runMigrations(client);
  assert(run2.appliedCount === 0 && run2.skippedCount === 6, "Second migration run safely skipped with 0 changes (Idempotent)");

  // 8. Verify NOT NULL enforcement on new session insertion
  let nullInsertCaught = false;
  try {
    await client.execute({
      sql: "INSERT INTO sessions (id, user_id, expires_at, created_at, public_session_id) VALUES (?, ?, ?, ?, NULL);",
      args: ["hash_null_test", testUserId, Math.floor(Date.now() / 1000), Math.floor(Date.now() / 1000)],
    });
  } catch (err: any) {
    nullInsertCaught = err.message.includes("NOT NULL") || err.message.includes("constraint");
  }
  assert(nullInsertCaught, "Direct NULL insert into public_session_id strictly rejected by database constraint");

  // Audit total tables
  const tableCheck = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name;");
  const tableNames = tableCheck.rows.map((r) => r.name as string);
  console.log(`\n[AUDIT] Total Tables in Fresh Database: ${tableNames.length}`);
  tableNames.forEach((t, idx) => console.log(`  ${idx + 1}. ${t}`));

  assert(tableNames.includes("orders_market"), "orders_market table exists");
  assert(tableNames.includes("__drizzle_migrations"), "__drizzle_migrations table exists");

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