import { db } from "@/db";
import { forumReplies, forumThreads } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { checkRateLimitAsync } from "@/lib/rate-limit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/errors";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const replySchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(2).max(20000),
  parentReplyId: z.string().optional(),
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
  const rate = await checkRateLimitAsync(`reply_post:${session.user.id}:${clientIp}`, { maxRequests: 10, windowSeconds: 60 });
  if (!rate.allowed) {
    return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment before replying again." }, { status: 429 });
  }

  try {
    const body = await req.json();
    const { threadId, content, parentReplyId } = replySchema.parse(body);

    const thread = (await db.select().from(forumThreads).where(eq(forumThreads.id, threadId)).limit(1))[0];
    if (!thread || thread.isLocked || thread.status !== "published") {
      return NextResponse.json({ error: "Thread is locked or unavailable for replies." }, { status: 400 });
    }

    const replyId = `rep_${nanoid(16)}`;

    await db.insert(forumReplies).values({
      id: replyId,
      threadId,
      authorId: session.user.id,
      parentReplyId: parentReplyId || null,
      content,
      status: "published",
    });

    await db
      .update(forumThreads)
      .set({
        repliesCount: sql`${forumThreads.repliesCount} + 1`,
        lastReplyAt: new Date(),
      })
      .where(eq(forumThreads.id, threadId));

    return NextResponse.json({ success: true, replyId });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to submit reply." });
  }
}