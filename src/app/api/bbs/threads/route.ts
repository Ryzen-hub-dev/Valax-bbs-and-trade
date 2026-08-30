import { db } from "@/db";
import { forumThreads, users, forumBoards } from "@/db/schema";
import { requirePermission } from "@/lib/rbac";
import { requireFeatureFlag } from "@/lib/flags";
import { checkRateLimitAsync, getClientIp } from "@/lib/rate-limit";
import { validateCsrfOrigin } from "@/lib/csrf";
import { handleApiError } from "@/lib/errors";
import { eq, desc, and } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const createThreadSchema = z.object({
  boardId: z.string().min(1),
  title: z.string().min(3).max(150),
  content: z.string().min(10).max(50000),
  tags: z.array(z.string().min(1).max(30)).max(5).default([]),
});

export async function POST(req: NextRequest) {
  try {
    await requireFeatureFlag("THREAD_CREATION_ENABLED");
    const user = await requirePermission("forum.thread.create", req);

    const csrf = validateCsrfOrigin(req);
    if (!csrf.isValid) {
      return csrf.errorResponse!;
    }

    const clientIp = getClientIp(req);
    const rate = await checkRateLimitAsync(`thread_post:${user.id}:${clientIp}`, { maxRequests: 5, windowSeconds: 120 });
    if (!rate.allowed) {
      return NextResponse.json({ error: "Rate limit exceeded. Please wait before creating another thread." }, { status: 429 });
    }

    const body = await req.json();
    const { boardId, title, content, tags } = createThreadSchema.parse(body);

    const board = (await db.select().from(forumBoards).where(eq(forumBoards.id, boardId)).limit(1))[0];
    if (!board || board.isLocked) {
      return NextResponse.json({ error: "Target discussion board is not available for new posts." }, { status: 400 });
    }

    const threadId = `th_${nanoid(16)}`;
    const slug = `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60) || "topic"}-${nanoid(8)}`;

    await db.insert(forumThreads).values({
      id: threadId,
      boardId,
      authorId: user.id,
      title,
      slug,
      content,
      tags: JSON.stringify(tags),
      status: "published",
    });

    return NextResponse.json({ success: true, slug });
  } catch (err: any) {
    return handleApiError(err, { publicMessage: "Failed to publish discussion thread.", route: "/api/bbs/threads" });
  }
}