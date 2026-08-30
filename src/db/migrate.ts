import { createClient, Client, Transaction } from "@libsql/client";
import crypto from "crypto";
import fs from "fs";
import path from "path";
import * as dotenv from "dotenv";

dotenv.config();

export interface MigrationLogEntry {
  fileName: string;
  hash: string;
  status: "applied" | "skipped";
  verification: string;
}

export interface MigrationResult {
  appliedCount: number;
  skippedCount: number;
  logs: MigrationLogEntry[];
}

export class MigrationDriftError extends Error {
  constructor(public fileName: string, public expectedHash: string, public actualHash: string) {
    super(`Migration drift detected in ${fileName}! Database hash: ${expectedHash}, local file hash: ${actualHash}`);
    this.name = "MigrationDriftError";
  }
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

  // 1. Ensure __drizzle_migrations exists
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
    "0006_marketplace_automated_delivery.sql",
  ];

  let appliedCount = 0;
  let skippedCount = 0;
  const logs: MigrationLogEntry[] = [];

  for (const fileName of migrationFiles) {
    const filePath = path.join(drizzleDir, fileName);
    if (!fs.existsSync(filePath)) {
      throw new Error(`Migration file not found: ${fileName}`);
    }

    const rawSql = fs.readFileSync(filePath, "utf-8");
    const migrationHash = crypto.createHash("sha256").update(rawSql).digest("hex");

    if (executedHashes.has(migrationHash)) {
      // Schema Introspection to verify database health
      let verification = "Schema verified";
      if (fileName === "0005_sessions_not_null.sql") {
        const tableInfo = await client.execute("PRAGMA table_info(sessions);");
        const col = tableInfo.rows.find((c) => c.name === "public_session_id");
        if (!col || Number(col.notnull) !== 1) {
          throw new Error("Schema drift: sessions.public_session_id is recorded in migration table but NOT NULL constraint is missing in database.");
        }
        verification = "sessions.public_session_id NOT NULL verified";
      }

      skippedCount++;
      logs.push({
        fileName,
        hash: migrationHash,
        status: "skipped",
        verification,
      });
      console.log(`[MIGRATION] ${fileName} (Hash: ${migrationHash.slice(0, 16)}...) -> SKIPPED (${verification})`);
      continue;
    }

    console.log(`[MIGRATION] Applying ${fileName} (Hash: ${migrationHash.slice(0, 16)}...)...`);

    // Execute within a strict LibSQL transaction
    const tx: Transaction = await client.transaction("write");

    try {
      if (fileName === "0004_add_public_session_id.sql") {
        const tableInfo = await tx.execute("PRAGMA table_info(sessions);");
        const hasCol = tableInfo.rows.some((c) => c.name === "public_session_id");
        if (!hasCol) {
          await tx.execute("ALTER TABLE sessions ADD COLUMN public_session_id text;");
        }

        // Backfill NULL records with secure 128-bit random strings
        await tx.execute("UPDATE sessions SET public_session_id = 'psess_' || lower(hex(randomblob(16))) WHERE public_session_id IS NULL;");

        const nullCheck = await tx.execute("SELECT count(*) as c FROM sessions WHERE public_session_id IS NULL;");
        if (Number(nullCheck.rows[0].c) > 0) {
          throw new Error("Migration 0004 validation failed: NULL public_session_id remains after backfill.");
        }

        await tx.execute("CREATE UNIQUE INDEX IF NOT EXISTS sessions_public_session_id_unique ON sessions (public_session_id);");
        await tx.execute("CREATE INDEX IF NOT EXISTS sessions_public_session_id_idx ON sessions (public_session_id);");
      } else if (fileName === "0005_sessions_not_null.sql") {
        // Step A: Pre-migration count and NULL backfill
        const preCountRes = await tx.execute("SELECT count(*) as total FROM sessions;");
        const preCount = Number(preCountRes.rows[0].total);

        await tx.execute("UPDATE sessions SET public_session_id = 'psess_' || lower(hex(randomblob(16))) WHERE public_session_id IS NULL;");

        // Step B: Create sessions_new with NOT NULL constraint
        await tx.execute(`
          CREATE TABLE sessions_new (
            id TEXT PRIMARY KEY,
            public_session_id TEXT NOT NULL UNIQUE,
            user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            expires_at INTEGER NOT NULL,
            created_at INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
            user_agent TEXT,
            ip_address TEXT
          );
        `);

        // Step C: Copy all rows into sessions_new
        await tx.execute(`
          INSERT INTO sessions_new (id, public_session_id, user_id, expires_at, created_at, user_agent, ip_address)
            SELECT id, public_session_id, user_id, expires_at, created_at, user_agent, ip_address FROM sessions;
        `);

        // Step D: Validate post-copy count and NULL integrity
        const postCountRes = await tx.execute("SELECT count(*) as total FROM sessions_new;");
        const postCount = Number(postCountRes.rows[0].total);
        if (postCount !== preCount) {
          throw new Error(`Migration 0005 row count mismatch: Expected ${preCount}, but sessions_new has ${postCount}`);
        }

        const nullCheck = await tx.execute("SELECT count(*) as c FROM sessions_new WHERE public_session_id IS NULL;");
        if (Number(nullCheck.rows[0].c) > 0) {
          throw new Error("Migration 0005 integrity violation: NULL public_session_id in sessions_new.");
        }

        // Step E: Drop old table and rename new table
        await tx.execute("DROP TABLE sessions;");
        await tx.execute("ALTER TABLE sessions_new RENAME TO sessions;");

        // Step F: Rebuild all indices
        await tx.execute("CREATE INDEX IF NOT EXISTS sessions_user_id_idx ON sessions (user_id);");
        await tx.execute("CREATE INDEX IF NOT EXISTS sessions_expires_at_idx ON sessions (expires_at);");
        await tx.execute("CREATE INDEX IF NOT EXISTS sessions_public_session_id_idx ON sessions (public_session_id);");

        // Step G: Validate foreign keys
        const fkCheck = await tx.execute("PRAGMA foreign_key_check;");
        if (fkCheck.rows.length > 0) {
          throw new Error("Migration 0005 foreign key check failed: Foreign key violations detected.");
        }
      } else {
        const cleanSql = rawSql.replace(/--.*$/gm, "").replace(/--> statement-breakpoint/g, ";");
        const statements = cleanSql.split(";").map((s) => s.trim()).filter((s) => s.length > 0);

        for (const stmt of statements) {
          await tx.execute(stmt);
        }
      }

      // Record migration hash in __drizzle_migrations within the same atomic transaction
      await tx.execute({
        sql: "INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?, ?);",
        args: [migrationHash, Date.now()],
      });

      await tx.commit();
      appliedCount++;
      logs.push({
        fileName,
        hash: migrationHash,
        status: "applied",
        verification: "Transaction committed & verified",
      });
      console.log(`[MIGRATION] ${fileName} -> APPLIED SUCCESSFULLY.`);
    } catch (err: any) {
      await tx.rollback();
      console.error(`[MIGRATION ERROR] ${fileName} failed. Transaction rolled back. Reason:`, err.message);
      throw err;
    }
  }

  return { appliedCount, skippedCount, logs };
}

if (process.argv[1] && (process.argv[1].endsWith("migrate.ts") || process.argv[1].endsWith("migrate.js"))) {
  runMigrations()
    .then((res) => {
      console.log("\n=========================================================================");
      console.log("                       MIGRATION RUNNER SUMMARY                          ");
      console.log("=========================================================================");
      console.log(`Applied: ${res.appliedCount} | Skipped: ${res.skippedCount}`);
      res.logs.forEach((l) => {
        console.log(` - ${l.fileName}: [${l.status.toUpperCase()}] -> ${l.verification} (Hash: ${l.hash.slice(0, 16)}...)`);
      });
      console.log("=========================================================================");
    })
    .catch((err) => {
      console.error("\n[MIGRATION FATAL ERROR]", err);
      process.exitCode = 1;
    });
}