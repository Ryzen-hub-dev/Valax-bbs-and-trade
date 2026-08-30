import { db } from "@/db";
import { forumReplies, forumThreads, users } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createReplySchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(2).max(10000),
  parentReplyId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.isMuted) {
    return NextResponse.json({ error: "Your account is muted." }, { status: 403 });
  }

  // Rate limit: 10 replies per 1 minute
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rateKey = `reply_create:${session.user.id}:${ip}`;
  const rate = checkRateLimit(rateKey, { maxRequests: 10, windowSeconds: 60 });
  if (!rate.allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Please wait ${rate.resetSeconds}s.` }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = createReplySchema.parse(body);

    const thread = (
      await db.select().from(forumThreads).where(eq(forumThreads.id, parsed.threadId)).limit(1)
    )[0];

    if (!thread) {
      return NextResponse.json({ error: "Thread not found" }, { status: 404 });
    }

    if (thread.isLocked && session.user.role === "user") {
      return NextResponse.json({ error: "Thread is locked." }, { status: 403 });
    }

    const replyId = `rep_${nanoid(16)}`;
    await db.insert(forumReplies).values({
      id: replyId,
      threadId: parsed.threadId,
      authorId: session.user.id,
      parentReplyId: parsed.parentReplyId || null,
      content: parsed.content,
    });

    // Update thread counters
    await db
      .update(forumThreads)
      .set({
        repliesCount: sql`${forumThreads.repliesCount} + 1`,
        lastReplyAt: new Date(),
      })
      .where(eq(forumThreads.id, parsed.threadId));

    return NextResponse.json({ success: true, replyId });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid reply" }, { status: 400 });
  }
}