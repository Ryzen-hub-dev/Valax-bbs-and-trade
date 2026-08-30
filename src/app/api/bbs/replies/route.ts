import { db } from "@/db";
import { forumReplies, forumThreads } from "@/db/schema";
import { requirePermission } from "@/lib/rbac";
import { requireFeatureFlag } from "@/lib/flags";
import { checkRateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/errors";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const replySchema = z.object({
  threadId: z.string().min(1),
  content: z.string().min(2).max(10000),
  parentReplyId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    await requireFeatureFlag("REPLIES_ENABLED");
    const user = await requirePermission("forum.reply.create", req);

    const csrf = validateCsrfOrigin(req);
    if (!csrf.isValid) {
      return csrf.errorResponse!;
    }

    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`reply_post:${user.id}:${clientIp}`, { maxRequests: 10, windowSeconds: 60 });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait a moment." }, { status: 429 });
    }

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
      authorId: user.id,
      parentReplyId: parentReplyId || null,
      content,
      status: "published",
    });

    return NextResponse.json({ success: true, replyId });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to post reply.", route: "/api/bbs/replies" });
  }
}