import { db } from "@/db";
import { forumLikes, forumBookmarks, forumThreads, forumReplies } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { eq, and, sql } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const interactionSchema = z.object({
  action: z.enum(["like", "bookmark", "toggle_solution"]),
  targetType: z.enum(["thread", "reply", "product"]),
  targetId: z.string().min(1),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { action, targetType, targetId } = interactionSchema.parse(body);

    if (action === "like") {
      const existing = await db
        .select()
        .from(forumLikes)
        .where(
          and(
            eq(forumLikes.userId, session.user.id),
            eq(forumLikes.targetType, targetType),
            eq(forumLikes.targetId, targetId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        // Unlike
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
          await db
            .update(forumThreads)
            .set({ likesCount: sql`MAX(0, ${forumThreads.likesCount} - 1)` })
            .where(eq(forumThreads.id, targetId));
        } else if (targetType === "reply") {
          await db
            .update(forumReplies)
            .set({ likesCount: sql`MAX(0, ${forumReplies.likesCount} - 1)` })
            .where(eq(forumReplies.id, targetId));
        }

        return NextResponse.json({ success: true, liked: false });
      } else {
        // Like
        await db.insert(forumLikes).values({
          id: `lk_${nanoid(16)}`,
          userId: session.user.id,
          targetType,
          targetId,
        });

        if (targetType === "thread") {
          await db
            .update(forumThreads)
            .set({ likesCount: sql`${forumThreads.likesCount} + 1` })
            .where(eq(forumThreads.id, targetId));
        } else if (targetType === "reply") {
          await db
            .update(forumReplies)
            .set({ likesCount: sql`${forumReplies.likesCount} + 1` })
            .where(eq(forumReplies.id, targetId));
        }

        return NextResponse.json({ success: true, liked: true });
      }
    } else if (action === "bookmark") {
      if (targetType !== "thread" && targetType !== "product") {
        return NextResponse.json({ error: "Invalid bookmark target" }, { status: 400 });
      }

      const existing = await db
        .select()
        .from(forumBookmarks)
        .where(
          and(
            eq(forumBookmarks.userId, session.user.id),
            eq(forumBookmarks.targetType, targetType),
            eq(forumBookmarks.targetId, targetId)
          )
        )
        .limit(1);

      if (existing.length > 0) {
        await db
          .delete(forumBookmarks)
          .where(
            and(
              eq(forumBookmarks.userId, session.user.id),
              eq(forumBookmarks.targetType, targetType),
              eq(forumBookmarks.targetId, targetId)
            )
          );
        return NextResponse.json({ success: true, bookmarked: false });
      } else {
        await db.insert(forumBookmarks).values({
          id: `bm_${nanoid(16)}`,
          userId: session.user.id,
          targetType,
          targetId,
        });
        return NextResponse.json({ success: true, bookmarked: true });
      }
    } else if (action === "toggle_solution") {
      if (targetType !== "reply") {
        return NextResponse.json({ error: "Only replies can be marked as solution" }, { status: 400 });
      }

      const reply = (
        await db.select().from(forumReplies).where(eq(forumReplies.id, targetId)).limit(1)
      )[0];

      if (!reply) {
        return NextResponse.json({ error: "Reply not found" }, { status: 404 });
      }

      const thread = (
        await db.select().from(forumThreads).where(eq(forumThreads.id, reply.threadId)).limit(1)
      )[0];

      if (!thread || (thread.authorId !== session.user.id && session.user.role === "user")) {
        return NextResponse.json({ error: "Only thread author or moderators can mark solutions" }, { status: 403 });
      }

      const nextSolved = !reply.isSolution;
      await db.update(forumReplies).set({ isSolution: nextSolved }).where(eq(forumReplies.id, targetId));
      await db.update(forumThreads).set({ isResolved: nextSolved }).where(eq(forumThreads.id, thread.id));

      return NextResponse.json({ success: true, isSolution: nextSolved });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Interaction error" }, { status: 400 });
  }
}