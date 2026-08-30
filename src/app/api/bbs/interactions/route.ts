import { db } from "@/db";
import { forumLikes, forumBookmarks, forumThreads, forumReplies, products } from "@/db/schema";
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
    return NextResponse.json({ error: "Unauthorized. Please log in with Discord." }, { status: 401 });
  }

  const csrf = validateCsrfOrigin(req);
  if (!csrf.isValid) {
    return csrf.errorResponse!;
  }

  try {
    const body = await req.json();
    const { action, targetType, targetId } = interactionSchema.parse(body);

    // 1. Verify target object exists in database
    if (targetType === "thread") {
      const thread = (await db.select().from(forumThreads).where(eq(forumThreads.id, targetId)).limit(1))[0];
      if (!thread) return NextResponse.json({ error: "Target thread not found." }, { status: 404 });
    } else if (targetType === "reply") {
      const reply = (await db.select().from(forumReplies).where(eq(forumReplies.id, targetId)).limit(1))[0];
      if (!reply) return NextResponse.json({ error: "Target reply not found." }, { status: 404 });
    } else if (targetType === "product") {
      const prod = (await db.select().from(products).where(eq(products.id, targetId)).limit(1))[0];
      if (!prod) return NextResponse.json({ error: "Target product not found." }, { status: 404 });
    }

    // 2. Process Like / Unlike with Strict Affected Rows Check
    if (action === "like") {
      const insertRes = await db.run(
        sql`INSERT INTO forum_likes (id, user_id, target_type, target_id, created_at)
            VALUES (${`like_${nanoid(16)}`}, ${session.user.id}, ${targetType}, ${targetId}, strftime('%s', 'now'))
            ON CONFLICT (user_id, target_type, target_id) DO NOTHING`
      );

      const rowsAffected = (insertRes as any)?.rowsAffected ?? (insertRes as any)?.meta?.rows_affected ?? 0;

      // Only increment counter if a new row was actually inserted
      if (rowsAffected > 0) {
        if (targetType === "thread") {
          await db.update(forumThreads).set({ likesCount: sql`${forumThreads.likesCount} + 1` }).where(eq(forumThreads.id, targetId));
        } else if (targetType === "reply") {
          await db.update(forumReplies).set({ likesCount: sql`${forumReplies.likesCount} + 1` }).where(eq(forumReplies.id, targetId));
        }
      }
    } else if (action === "unlike") {
      const deleteRes = await db.run(
        sql`DELETE FROM forum_likes
            WHERE user_id = ${session.user.id}
              AND target_type = ${targetType}
              AND target_id = ${targetId}`
      );

      const rowsAffected = (deleteRes as any)?.rowsAffected ?? (deleteRes as any)?.meta?.rows_affected ?? 0;

      // Only decrement counter if a row was actually removed
      if (rowsAffected > 0) {
        if (targetType === "thread") {
          await db.update(forumThreads).set({ likesCount: sql`MAX(0, ${forumThreads.likesCount} - 1)` }).where(eq(forumThreads.id, targetId));
        } else if (targetType === "reply") {
          await db.update(forumReplies).set({ likesCount: sql`MAX(0, ${forumReplies.likesCount} - 1)` }).where(eq(forumReplies.id, targetId));
        }
      }
    } else if (action === "bookmark") {
      if (targetType !== "thread" && targetType !== "product") {
        return NextResponse.json({ error: "Bookmarks are only supported for threads and products." }, { status: 400 });
      }

      await db.run(
        sql`INSERT INTO forum_bookmarks (id, user_id, target_type, target_id, created_at)
            VALUES (${`bm_${nanoid(16)}`}, ${session.user.id}, ${targetType}, ${targetId}, strftime('%s', 'now'))
            ON CONFLICT (user_id, target_type, target_id) DO NOTHING`
      );
    } else if (action === "unbookmark") {
      if (targetType !== "thread" && targetType !== "product") {
        return NextResponse.json({ error: "Bookmarks are only supported for threads and products." }, { status: 400 });
      }

      await db.run(
        sql`DELETE FROM forum_bookmarks
            WHERE user_id = ${session.user.id}
              AND target_type = ${targetType}
              AND target_id = ${targetId}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to process interaction." });
  }
}