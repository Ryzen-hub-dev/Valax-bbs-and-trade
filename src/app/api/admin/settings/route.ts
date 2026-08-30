import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { requireAdmin } from "@/lib/rbac";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/errors";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const settingSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
});

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const csrf = validateCsrfOrigin(req);
    if (!csrf.isValid) {
      return csrf.errorResponse!;
    }

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
    return handleApiError(err, { publicMessage: "Setting update failed." });
  }
}