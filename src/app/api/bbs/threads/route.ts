import { db } from "@/db";
import { forumThreads, forumBoards, users } from "@/db/schema";
import { getCurrentSession } from "@/lib/auth";
import { checkRateLimit } from "@/lib/rate-limit";
import { validateAndSanitizeUrl } from "@/lib/url-sanitizer";
import { eq } from "drizzle-orm";
import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const createThreadSchema = z.object({
  boardId: z.string().min(1),
  title: z.string().min(3).max(150),
  content: z.string().min(10).max(20000),
  tags: z.array(z.string().max(20)).max(5).default([]),
});

export async function POST(req: NextRequest) {
  const session = await getCurrentSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.isMuted) {
    return NextResponse.json({ error: "Your account is currently muted from posting." }, { status: 403 });
  }

  // Rate limit: 5 threads per 5 minutes
  const ip = req.headers.get("x-forwarded-for") || "unknown";
  const rateKey = `thread_create:${session.user.id}:${ip}`;
  const rate = checkRateLimit(rateKey, { maxRequests: 5, windowSeconds: 300 });
  if (!rate.allowed) {
    return NextResponse.json({ error: `Rate limit exceeded. Try again in ${rate.resetSeconds}s.` }, { status: 429 });
  }

  try {
    const body = await req.json();
    const parsed = createThreadSchema.parse(body);

    const board = (
      await db.select().from(forumBoards).where(eq(forumBoards.id, parsed.boardId)).limit(1)
    )[0];

    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    if (board.isLocked && session.user.role === "user") {
      return NextResponse.json({ error: "This board is locked for posting." }, { status: 403 });
    }

    if (session.user.reputationScore < board.minReputationToPost && session.user.role === "user") {
      return NextResponse.json({ error: `Minimum reputation score of ${board.minReputationToPost} required.` }, { status: 403 });
    }

    const threadId = `th_${nanoid(16)}`;
    const slug = `${parsed.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "thread"}-${nanoid(8)}`;

    await db.insert(forumThreads).values({
      id: threadId,
      boardId: parsed.boardId,
      authorId: session.user.id,
      title: parsed.title,
      slug,
      content: parsed.content,
      tags: JSON.stringify(parsed.tags),
      status: "published",
    });

    return NextResponse.json({ success: true, slug });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Invalid request" }, { status: 400 });
  }
}