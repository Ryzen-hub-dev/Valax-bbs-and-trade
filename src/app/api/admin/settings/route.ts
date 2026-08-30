import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/rbac";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();
    const body = await req.json();
    const { key, value } = settingSchema.parse(body);

    await db
      .insert(systemSettings)
      .values({ key, value, updatedAt: new Date() })
      .onConflictDoUpdate({
        target: systemSettings.key,
        set: { value, updatedAt: new Date() },
      });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Setting update failed" }, { status: 403 });
  }
}