import { db } from "@/db";
import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const result = await db.run(sql`SELECT 1;`);
    return NextResponse.json({
      status: "healthy",
      service: "valax-scrub-bbs-and-trade",
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