import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { forumBoards, forumThreads, users } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { MessageSquare, PlusCircle, Pin, CheckCircle2, ThumbsUp, ArrowLeft } from "lucide-react";
import { FadeIn } from "@/components/animations/gsap-wrapper";

export const dynamic = "force-dynamic";

export default async function BoardThreadsPage({
  params,
}: {
  params: { boardSlug: string };
}) {
  const board = (
    await db.select().from(forumBoards).where(eq(forumBoards.slug, params.boardSlug)).limit(1)
  )[0];

  if (!board) notFound();

  const threads = await db
    .select({
      id: forumThreads.id,
      title: forumThreads.title,
      slug: forumThreads.slug,
      tags: forumThreads.tags,
      isPinned: forumThreads.isPinned,
      isResolved: forumThreads.isResolved,
      likesCount: forumThreads.likesCount,
      repliesCount: forumThreads.repliesCount,
      createdAt: forumThreads.createdAt,
      author: { username: users.username },
    })
    .from(forumThreads)
    .innerJoin(users, eq(forumThreads.authorId, users.id))
    .where(and(eq(forumThreads.boardId, board.id), eq(forumThreads.status, "published")))
    .orderBy(desc(forumThreads.isPinned), desc(forumThreads.lastReplyAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <Link href="/bbs" className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors">
        <ArrowLeft className="h-4 w-4" />
        Back to BBS Boards
      </Link>

      <FadeIn className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-6 w-6 text-blue-400" />
            <span>{board.name}</span>
          </h1>
          <p className="mt-1 text-xs text-slate-400">{board.description}</p>
        </div>

        <Link
          href={`/bbs/new?boardId=${board.id}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-md shadow-blue-600/25 transition-all"
        >
          <PlusCircle className="h-4 w-4" />
          Post in this Board
        </Link>
      </FadeIn>

      <div className="space-y-3">
        {threads.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
            No threads in this board yet. Be the first to start a conversation!
          </div>
        ) : (
          threads.map((t) => {
            const tagsList: string[] = JSON.parse(t.tags || "[]");
            return (
              <Link
                key={t.id}
                href={`/bbs/thread/${t.slug}`}
                className="block p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1.5 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      {t.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-semibold border border-amber-500/30">
                          <Pin className="h-3 w-3" /> Pinned
                        </span>
                      )}
                      {t.isResolved && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[10px] font-semibold border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" /> Solved
                        </span>
                      )}
                      {tagsList.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <h3 className="text-base font-bold text-slate-100 hover:text-blue-400 truncate">{t.title}</h3>
                    <div className="text-xs text-slate-500">
                      <span>By {t.author.username}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(t.createdAt).toLocaleDateString("en-US")}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0">
                    <div className="flex items-center gap-1">
                      <ThumbsUp className="h-3.5 w-3.5 text-slate-500" />
                      <span>{t.likesCount}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MessageSquare className="h-3.5 w-3.5 text-slate-500" />
                      <span>{t.repliesCount}</span>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}