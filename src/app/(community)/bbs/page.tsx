import Link from "next/link";
import { db } from "@/db";
import { forumBoards, forumThreads, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { MessageSquare, PlusCircle, Pin, CheckCircle2, ThumbsUp, Flame, Clock } from "lucide-react";
import { FadeIn, StaggerList } from "@/components/animations/gsap-wrapper";

export const dynamic = "force-dynamic";

export default async function BBSIndexPage({
  searchParams,
}: {
  searchParams: { sort?: string };
}) {
  let boards: any[] = [];
  let threads: any[] = [];
  const sort = searchParams.sort || "latest";

  try {
    boards = await db.select().from(forumBoards).orderBy(forumBoards.sortOrder);
    threads = await db
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
        board: { slug: forumBoards.slug, name: forumBoards.name },
      })
      .from(forumThreads)
      .innerJoin(users, eq(forumThreads.authorId, users.id))
      .innerJoin(forumBoards, eq(forumThreads.boardId, forumBoards.id))
      .where(eq(forumThreads.status, "published"))
      .orderBy(desc(forumThreads.isPinned), sort === "popular" ? desc(forumThreads.likesCount) : desc(forumThreads.lastReplyAt))
      .limit(25);
  } catch (err) {
    console.error("BBS fetch error:", err);
  }

  return (
    <div className="space-y-8">
      <FadeIn className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 p-6 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-blue-950/40">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <MessageSquare className="h-7 w-7 text-blue-400" />
            Valax Scrub BBS Community
          </h1>
          <p className="mt-1.5 text-sm text-slate-400">
            Technical discussions, architecture proposals, development Q&A, and community bounties
          </p>
        </div>
        <Link
          href="/bbs/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          Create New Thread
        </Link>
      </FadeIn>

      <div>
        <h2 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Forum Boards</h2>
        <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/bbs/${b.slug}`}
              className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all group flex flex-col justify-between"
            >
              <div>
                <h3 className="font-bold text-base text-slate-100 group-hover:text-blue-400 transition-colors">
                  {b.name}
                </h3>
                <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                  {b.description}
                </p>
              </div>
              <div className="mt-4 flex items-center justify-between text-[11px] text-slate-500 pt-3 border-t border-slate-800/60">
                <span>Enter Board &rarr;</span>
                {b.minReputationToPost > 0 && (
                  <span className="px-2 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40">
                    Reputation ≥ {b.minReputationToPost}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </StaggerList>
      </div>

      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <span>Recent Activity</span>
            <span className="text-xs font-normal text-slate-400">({threads.length} threads)</span>
          </h2>
          <div className="flex items-center gap-2">
            <Link
              href="/bbs?sort=latest"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                sort === "latest" ? "bg-slate-800 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              Latest
            </Link>
            <Link
              href="/bbs?sort=popular"
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 ${
                sort === "popular" ? "bg-slate-800 text-white font-semibold" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              Popular
            </Link>
          </div>
        </div>

        {threads.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400">
            No threads found. Be the first to start a conversation!
          </div>
        ) : (
          <div className="space-y-3">
            {threads.map((t) => {
              const tagsList: string[] = JSON.parse(t.tags || "[]");
              return (
                <div
                  key={t.id}
                  className="p-4 sm:p-5 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-700/80 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/bbs/${t.board.slug}`}
                        className="px-2 py-0.5 rounded bg-blue-950/60 text-blue-400 text-[11px] font-medium border border-blue-800/40"
                      >
                        {t.board.name}
                      </Link>
                      {t.isPinned && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[11px] font-semibold border border-amber-500/30">
                          <Pin className="h-3 w-3" /> Pinned
                        </span>
                      )}
                      {t.isResolved && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/30">
                          <CheckCircle2 className="h-3 w-3" /> Solved
                        </span>
                      )}
                      {tagsList.map((tag) => (
                        <span key={tag} className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 text-[10px]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                    <Link
                      href={`/bbs/thread/${t.slug}`}
                      className="block text-base font-bold text-slate-100 hover:text-blue-400 transition-colors truncate"
                    >
                      {t.title}
                    </Link>
                    <div className="text-xs text-slate-500">
                      <span>By {t.author.username}</span>
                      <span className="mx-2">•</span>
                      <span>{new Date(t.createdAt).toLocaleDateString("en-US")}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400 shrink-0 sm:border-l sm:border-slate-800/80 sm:pl-6">
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
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}