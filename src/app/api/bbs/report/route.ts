import { db } from "@/db";
import { reports } from "@/db/schema";
import { requireAuth } from "@/lib/rbac";
import { requireFeatureFlag } from "@/lib/flags";
import { checkRateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/errors";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const reportSchema = z.object({
  targetType: z.enum(["thread", "reply", "product", "user"]),
  targetId: z.string().min(1),
  reason: z.string().min(5).max(500),
});

export async function POST(req: NextRequest) {
  try {
    await requireFeatureFlag("REPORTS_ENABLED");
    const session = await requireAuth(req);

    const csrf = validateCsrfOrigin(req);
    if (!csrf.isValid) {
      return csrf.errorResponse!;
    }

    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`report_submit:${session.user.id}:${clientIp}`, { maxRequests: 5, windowSeconds: 300 });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Too many reports submitted. Please wait." }, { status: 429 });
    }

    const body = await req.json();
    const { targetType, targetId, reason } = reportSchema.parse(body);

    const reportId = `rep_${nanoid(16)}`;
    await db.insert(reports).values({
      id: reportId,
      reporterId: session.user.id,
      targetType,
      targetId,
      reason,
      status: "pending",
    });

    return NextResponse.json({ success: true, reportId, message: "Report submitted to moderation staff." });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to submit moderation report.", route: "/api/bbs/report" });
  }
}