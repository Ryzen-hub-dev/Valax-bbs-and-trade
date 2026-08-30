import { db } from "@/db";
import { forumLikes, forumBookmarks, forumThreads, forumReplies } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/errors";
import { and, eq, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const interactionSchema = z.object({
  action: z.enum(["like", "unlike", "bookmark", "unbookmark"]),
  targetType: z.enum(["thread", "reply", "product"]),
  targetId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const csrf = validateCsrfOrigin(req);
  if (!csrf.isValid) {
    return csrf.errorResponse!;
  }

  try {
    const body = await req.json();
    const { action, targetType, targetId } = interactionSchema.parse(body);

    if (action === "like") {
      await db
        .insert(forumLikes)
        .values({
          id: `like_${nanoid(16)}`,
          userId: session.user.id,
          targetType,
          targetId,
        })
        .onConflictDoNothing();

      if (targetType === "thread") {
        await db.update(forumThreads).set({ likesCount: sql`${forumThreads.likesCount} + 1` }).where(eq(forumThreads.id, targetId));
      } else if (targetType === "reply") {
        await db.update(forumReplies).set({ likesCount: sql`${forumReplies.likesCount} + 1` }).where(eq(forumReplies.id, targetId));
      }
    } else if (action === "unlike") {
      await db
        .delete(forumLikes)
        .where(
          and(
            eq(forumLikes.userId, session.user.id),
            eq(forumLikes.targetType, targetType),
            eq(forumLikes.targetId, targetId)
          )
        );

      if (targetType === "thread") {
        await db.update(forumThreads).set({ likesCount: sql`MAX(0, ${forumThreads.likesCount} - 1)` }).where(eq(forumThreads.id, targetId));
      } else if (targetType === "reply") {
        await db.update(forumReplies).set({ likesCount: sql`MAX(0, ${forumReplies.likesCount} - 1)` }).where(eq(forumReplies.id, targetId));
      }
    } else if (action === "bookmark") {
      await db
        .insert(forumBookmarks)
        .values({
          id: `bm_${nanoid(16)}`,
          userId: session.user.id,
          targetType: targetType as "thread" | "product",
          targetId,
        })
        .onConflictDoNothing();
    } else if (action === "unbookmark") {
      await db
        .delete(forumBookmarks)
        .where(
          and(
            eq(forumBookmarks.userId, session.user.id),
            eq(forumBookmarks.targetType, targetType as "thread" | "product"),
            eq(forumBookmarks.targetId, targetId)
          )
        );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to process interaction." });
  }
}