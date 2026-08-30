import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config();

const isTest = process.env.NODE_ENV === "test" || process.env.IS_TEST === "true";

let effectiveUrl: string;
let effectiveAuthToken: string | undefined;

if (isTest) {
  effectiveUrl = process.env.TURSO_TEST_DATABASE_URL || "file:tests/temp_isolated_test.db";
  effectiveAuthToken = process.env.TURSO_TEST_AUTH_TOKEN || undefined;

  // Strict Security Assertion: Test mode MUST NOT connect to production Turso database
  const prodUrl = process.env.TURSO_DATABASE_URL;
  if (prodUrl && effectiveUrl === prodUrl && !effectiveUrl.startsWith("file:") && !effectiveUrl.includes("test")) {
    throw new Error("[CRITICAL SECURITY ERROR] Test execution is strictly forbidden from connecting to production Turso database!");
  }

  const urlType = effectiveUrl.startsWith("file:") ? "Isolated SQLite File Sandbox" : "Dedicated Remote Test Database";
  console.log(`[DB Sandbox] Mode: TEST | Type: ${urlType} | Sandbox Path: ${effectiveUrl}`);
} else {
  effectiveUrl = process.env.TURSO_DATABASE_URL || "file:local.db";
  effectiveAuthToken = process.env.TURSO_AUTH_TOKEN || undefined;
}

export const client = createClient({
  url: effectiveUrl,
  authToken: effectiveAuthToken,
});

export const db = drizzle(client, { schema });