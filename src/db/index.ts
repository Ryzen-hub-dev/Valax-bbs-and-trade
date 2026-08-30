import { createClient } from "@libsql/client";
import { drizzle } from "drizzle-orm/libsql";
import * as dotenv from "dotenv";
import * as schema from "./schema";

dotenv.config();

const isTest = process.env.NODE_ENV === "test" || process.env.IS_TEST === "true";

const url = isTest
  ? (process.env.TURSO_TEST_DATABASE_URL || "file:tests/temp_isolated_test.db")
  : (process.env.TURSO_DATABASE_URL || "file:local.db");

const authToken = isTest
  ? (process.env.TURSO_TEST_AUTH_TOKEN || undefined)
  : (process.env.TURSO_AUTH_TOKEN || undefined);

export const client = createClient({
  url,
  authToken,
});

export const db = drizzle(client, { schema });