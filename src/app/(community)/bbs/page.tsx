import Link from "next/link";
import { db } from "@/db";
import { forumBoards, forumThreads, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { MessageSquare, PlusCircle, Pin, CheckCircle2, ThumbsUp, Flame, Clock, Tag, ArrowRight } from "lucide-react";
import { MotionContainer } from "@/components/animations/MotionContainer";

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
        author: { username: users.username, avatarUrl: users.avatarUrl },
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
    <div className="space-y-12 py-4">
      {/* Forum Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-r from-obsidian-900 via-obsidian-950 to-obsidian-900 p-8 sm:p-10 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-cyan text-xs font-semibold">
            <MessageSquare className="h-3.5 w-3.5" />
            <span>Community Knowledge Exchange</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Valax Scrub BBS Community
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-normal">
            Technical discussions, architecture proposals, development Q&A, and community scripts.
          </p>
        </div>

        <Link
          href="/bbs/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-obsidian-950 text-xs font-bold shadow-glow-gold transition-all shrink-0 active:scale-95"
        >
          <PlusCircle className="h-4 w-4" />
          <span>New Discussion</span>
        </Link>
      </div>

      {/* Forum Boards Section */}
      <div className="space-y-5">
        <div className="flex items-center justify-between pb-2 border-b border-white/[0.06]">
          <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400 flex items-center gap-2">
            <span>Specialized Forum Boards</span>
          </h2>
          <span className="text-[11px] text-neutral-400">{boards.length} Boards</span>
        </div>

        <MotionContainer direction="up" stagger={0.06} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {boards.map((b) => (
            <Link
              key={b.id}
              href={`/bbs/${b.slug}`}
              className="p-6 rounded-2xl glass-card transition-all duration-300 group flex flex-col justify-between hover:-translate-y-1 hover:border-cyan-500/40"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-sm sm:text-base text-neutral-100 group-hover:text-cyan-400 transition-colors">
                    {b.name}
                  </h3>
                  <ArrowRight className="h-4 w-4 text-neutral-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                </div>
                <p className="text-xs text-neutral-400 line-clamp-2 leading-relaxed font-normal">
                  {b.description}
                </p>
              </div>

              <div className="mt-5 flex items-center justify-between text-[11px] text-neutral-400 pt-3 border-t border-white/[0.04]">
                <span className="text-neutral-400 group-hover:text-neutral-300 font-medium">Browse discussions</span>
                {b.minReputationToPost > 0 && (
                  <span className="badge-gold text-[10px] px-2 py-0.5 rounded-full font-semibold">
                    Reputation ≥ {b.minReputationToPost}
                  </span>
                )}
              </div>
            </Link>
          ))}
        </MotionContainer>
      </div>

      {/* Threads Feed Section */}
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-white tracking-tight">Recent Discussions</h2>
            <span className="badge-gold text-[10px] px-2 py-0.5 rounded-full font-semibold">{threads.length} Active</span>
          </div>

          <div className="flex items-center gap-2 p-1 rounded-xl bg-obsidian-900 border border-white/[0.06]">
            <Link
              href="/bbs?sort=latest"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                sort === "latest" ? "bg-amber-500 text-obsidian-950 shadow-glow-gold" : "text-neutral-400 hover:text-white"
              }`}
            >
              <Clock className="h-3.5 w-3.5" />
              <span>Latest</span>
            </Link>
            <Link
              href="/bbs?sort=popular"
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                sort === "popular" ? "bg-amber-500 text-obsidian-950 shadow-glow-gold" : "text-neutral-400 hover:text-white"
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              <span>Popular</span>
            </Link>
          </div>
        </div>

        {threads.length === 0 ? (
          <div className="p-12 text-center rounded-2xl glass-card text-neutral-400 text-xs">
            No active threads found. Click &quot;New Discussion&quot; above to create one!
          </div>
        ) : (
          <MotionContainer direction="up" stagger={0.04} className="space-y-3">
            {threads.map((t) => {
              const tagsList: string[] = JSON.parse(t.tags || "[]");
              return (
                <div
                  key={t.id}
                  className="p-5 rounded-2xl glass-card hover:border-amber-400/40 transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 group"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        href={`/bbs/${t.board.slug}`}
                        className="badge-cyan text-[10px] font-semibold px-2 py-0.5 rounded-full"
                      >
                        {t.board.name}
                      </Link>
                      {t.isPinned && (
                        <span className="badge-gold inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <Pin className="h-3 w-3" /> Pinned
                        </span>
                      )}
                      {t.isResolved && (
                        <span className="badge-emerald inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full">
                          <CheckCircle2 className="h-3 w-3" /> Resolved
                        </span>
                      )}
                      {tagsList.map((tag) => (
                        <span key={tag} className="px-2 py-0.5 rounded-full bg-obsidian-800 text-neutral-400 text-[10px] border border-white/[0.04]">
                          #{tag}
                        </span>
                      ))}
                    </div>

                    <Link
                      href={`/bbs/thread/${t.slug}`}
                      className="block text-sm sm:text-base font-bold text-neutral-100 group-hover:text-amber-400 transition-colors truncate"
                    >
                      {t.title}
                    </Link>

                    <div className="text-[11px] text-neutral-400 flex items-center gap-2">
                      <span>By <strong className="text-neutral-300 font-semibold">{t.author.username}</strong></span>
                      <span>•</span>
                      <span>{new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-neutral-400 shrink-0 sm:border-l sm:border-white/[0.06] sm:pl-6">
                    <div className="flex items-center gap-1.5 font-medium">
                      <ThumbsUp className="h-3.5 w-3.5 text-amber-400" />
                      <span>{t.likesCount}</span>
                    </div>
                    <div className="flex items-center gap-1.5 font-medium">
                      <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
                      <span>{t.repliesCount}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </MotionContainer>
        )}
      </div>
    </div>
  );
}