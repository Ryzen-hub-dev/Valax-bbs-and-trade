import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await db.run(sql`SELECT 1;`);
    const commitSha =
      process.env.VERCEL_GIT_COMMIT_SHA ||
      process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
      "local-dev";

    return NextResponse.json({
      status: "healthy",
      service: "valax-scrub-bbs-and-trade",
      version: "1.0.0",
      commitSha: commitSha.slice(0, 12),
      migrationVersion: "0005_sessions_not_null",
      database: "turso-connected",
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json(
      { status: "unhealthy", error: err.message },
      { status: 500 }
    );
  }
}