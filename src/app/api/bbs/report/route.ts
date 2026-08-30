import { db } from "@/db";
import { reports } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const reportSchema = z.object({
  targetType: z.enum(["thread", "reply", "product", "user"]),
  targetId: z.string().min(1),
  reason: z.string().min(3).max(100),
  details: z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rateKey = `report:${session.user.id}:${ip}`;
  const rate = checkRateLimit(rateKey, { maxRequests: 5, windowSeconds: 300 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Too many reports submitted. Please wait." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { targetType, targetId, reason, details } = reportSchema.parse(body);

    await db.insert(reports).values({
      id: `rep_${nanoid(16)}`,
      reporterId: session.user.id,
      targetType,
      targetId,
      reason,
      details,
    });

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Report submission failed" }, { status: 400 });
  }
}