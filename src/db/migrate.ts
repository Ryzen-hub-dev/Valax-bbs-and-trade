import { createClient, Client } from "@libsql/client";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

export interface MigrationResult {
  appliedCount: number;
  skippedCount: number;
  appliedMigrations: string[];
}

export async function runMigrations(targetClient?: Client): Promise<MigrationResult> {
  const isTest = process.env.NODE_ENV === "test" || process.env.IS_TEST === "true";
  let client: Client;

  if (targetClient) {
    client = targetClient;
  } else if (isTest) {
    const testUrl = process.env.TURSO_TEST_DATABASE_URL || "file:tests/temp_test_suite_sandbox.db";
    client = createClient({ url: testUrl });
  } else {
    if (!process.env.TURSO_DATABASE_URL) {
      throw new Error("Missing TURSO_DATABASE_URL environment variable.");
    }
    client = createClient({
      url: process.env.TURSO_DATABASE_URL,
      authToken: process.env.TURSO_AUTH_TOKEN,
    });
  }

  // 1. Ensure __drizzle_migrations table exists
  await client.execute(`
    CREATE TABLE IF NOT EXISTS __drizzle_migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      hash TEXT NOT NULL UNIQUE,
      created_at NUMERIC NOT NULL
    );
  `);

  const executedRows = await client.execute("SELECT hash FROM __drizzle_migrations;");
  const executedHashes = new Set(executedRows.rows.map((r) => String(r.hash)));

  const drizzleDir = path.join(process.cwd(), "drizzle");
  const migrationFiles = [
    "0000_init_schema.sql",
    "0001_add_tags_and_notifications.sql",
    "0002_idempotency_and_ratelimit.sql",
    "0003_market_orders_state_machine.sql",
    "0004_add_public_session_id.sql",
    "0005_sessions_not_null.sql",
  ];

  let appliedCount = 0;
  let skippedCount = 0;
  const appliedMigrations: string[] = [];

  for (const fileName of migrationFiles) {
    const filePath = path.join(drizzleDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${fileName}`);
    }

    const rawSql = fs.readFileSync(filePath, "utf-8");
    const migrationHash = crypto.createHash("sha256").update(rawSql).digest("hex");

    if (executedHashes.has(migrationHash)) {
      skippedCount++;
      continue;
    }

    console.log(`[MIGRATION RUNNER] Applying ${fileName} (Hash: ${migrationHash.slice(0, 16)}...)...`);

    // Special Idempotent handling for 0004 (public_session_id)
    if (fileName === "0004_add_public_session_id.sql") {
      const tableInfo = await client.execute("PRAGMA table_info(sessions);");
      const hasCol = tableInfo.rows.some((c) => c.name === "public_session_id");

      if (!hasCol) {
        await client.execute("ALTER TABLE sessions ADD COLUMN public_session_id text;");
      }

      // Backfill any NULL public_session_id with cryptographically secure 128-bit random strings
      await client.execute("UPDATE sessions SET public_session_id = 'psess_' || lower(hex(randomblob(16))) WHERE public_session_id IS NULL;");

      const nullCheck = await client.execute("SELECT count(*) as c FROM sessions WHERE public_session_id IS NULL;");
      if (Number(nullCheck.rows[0].c) > 0) {
        throw new Error("Integrity check failed: sessions still contain NULL public_session_id after backfill.");
      }

      await client.execute("CREATE UNIQUE INDEX IF NOT EXISTS sessions_public_session_id_unique ON sessions (public_session_id);");
      await client.execute("CREATE INDEX IF NOT EXISTS sessions_public_session_id_idx ON sessions (public_session_id);");
    } else if (fileName === "0005_sessions_not_null.sql") {
      // Special Idempotent handling for 0005: check if table already has notnull = 1
      const tableInfo = await client.execute("PRAGMA table_info(sessions);");
      const col = tableInfo.rows.find((c) => c.name === "public_session_id");

      if (col && Number(col.notnull) === 1) {
        console.log("   -> sessions.public_session_id is already NOT NULL. Skipping table rebuild.");
      } else {
        // First backfill any NULL public_session_id before table rebuild
        await client.execute("UPDATE sessions SET public_session_id = 'psess_' || lower(hex(randomblob(16))) WHERE public_session_id IS NULL;");

        // Safe table rebuild
        const cleanSql = rawSql.replace(/--.*$/gm, "").replace(/--> statement-breakpoint/g, ";");
        const statements = cleanSql.split(";").map((s) => s.trim()).filter((s) => s.length > 0);

        for (const stmt of statements) {
          await client.execute(stmt);
        }

        // Post-migration foreign key verification
        const fkCheck = await client.execute("PRAGMA foreign_key_check;");
        if (fkCheck.rows.length > 0) {
          throw new Error("Integrity check failed: Foreign key violations detected after table rebuild.");
        }
      }
    } else {
      const cleanSql = rawSql.replace(/--.*$/gm, "").replace(/--> statement-breakpoint/g, ";");
      const statements = cleanSql.split(";").map((s) => s.trim()).filter((s) => s.length > 0);

      for (const stmt of statements) {
        try {
          await client.execute(stmt);
        } catch (err: any) {
          // Ignore table/column already exists if previously created
          if (!err.message?.includes("already exists") && !err.message?.includes("duplicate")) {
            throw err;
          }
        }
      }
    }

    // Record migration execution in __drizzle_migrations
    await client.execute({
      sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?);",
      args: [migrationHash, Date.now()],
    });

    appliedCount++;
    appliedMigrations.push(fileName);
    console.log(`[MIGRATION RUNNER] Successfully applied and recorded ${fileName}.`);
  }

  return { appliedCount, skippedCount, appliedMigrations };
}

if (process.argv[1] && (process.argv[1].endsWith("migrate.ts") || process.argv[1].endsWith("migrate.js"))) {
  runMigrations()
    .then((res) => {
      console.log(`\n[MIGRATION SUMMARY] Applied: ${res.appliedCount}, Skipped: ${res.skippedCount}`);
    })
    .catch((err) => {
      console.error("\n[MIGRATION FATAL ERROR]", err);
      process.exitCode = 1;
    });
}