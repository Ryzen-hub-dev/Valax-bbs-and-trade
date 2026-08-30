import { db } from "@/db";
import { reports } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { checkRateLimitAsync } from "@/lib/rate-limit";
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
  reason: z.string().min(3).max(200),
  details: z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized. Please log in with Discord." }, { status: 401 });
  }

  const csrf = validateCsrfOrigin(req);
  if (!csrf.isValid) {
    return csrf.errorResponse!;
  }

  const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown_ip";
  const rate = await checkRateLimitAsync(`report:${session.user.id}:${clientIp}`, { maxRequests: 5, windowSeconds: 300 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded. Please wait before submitting another report." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { targetType, targetId, reason, details } = reportSchema.parse(body);

    const reportId = `rep_${nanoid(16)}`;
    await db.insert(reports).values({
      id: reportId,
      reporterId: session.user.id,
      targetType,
      targetId,
      reason,
      details: details || null,
      status: "pending",
    });

    return NextResponse.json({ success: true, message: "Report submitted for moderator review." });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to submit moderation report." });
  }
}