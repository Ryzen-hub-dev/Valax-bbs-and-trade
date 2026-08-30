import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { forumBoards, forumThreads, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { PlusCircle, Pin, CheckCircle2, ThumbsUp, MessageSquare } from "lucide-react";
import { FadeIn } from "@/components/animations/gsap-wrapper";

export default async function BoardSlugPage({
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
    .where(eq(forumThreads.boardId, board.id))
    .orderBy(desc(forumThreads.isPinned), desc(forumThreads.lastReplyAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <FadeIn className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-blue-400 font-medium mb-1">
            <Link href="/bbs">BBS 论坛</Link>
            <span>/</span>
            <span>{board.name}</span>
          </div>
          <h1 className="text-2xl font-bold text-white">{board.name}</h1>
          <p className="mt-1 text-sm text-slate-400">{board.description}</p>
        </div>
        <Link
          href={`/bbs/new?boardId=${board.id}`}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          在此版块发帖
        </Link>
      </FadeIn>

      <div className="space-y-3">
        {threads.length === 0 ? (
          <div className="p-12 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400">
            该版块暂无帖子。成为第一个发帖交流的人吧！
          </div>
        ) : (
          threads.map((t) => {
            const tagsList: string[] = JSON.parse(t.tags || "[]");
            return (
              <div
                key={t.id}
                className="p-5 rounded-xl border border-slate-800/80 bg-slate-900/30 hover:bg-slate-900/60 hover:border-slate-700 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-2 min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {t.isPinned && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[11px] font-semibold border border-amber-500/30">
                        <Pin className="h-3 w-3" /> 置顶
                      </span>
                    )}
                    {t.isResolved && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[11px] font-semibold border border-emerald-500/30">
                        <CheckCircle2 className="h-3 w-3" /> 已解决
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
                    className="block text-base font-bold text-slate-100 hover:text-blue-400 transition-colors"
                  >
                    {t.title}
                  </Link>
                  <div className="text-xs text-slate-500">
                    <span>作者: {t.author.username}</span>
                    <span className="mx-2">•</span>
                    <span>{new Date(t.createdAt).toLocaleDateString("zh-CN")}</span>
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
          })
        )}
      </div>
    </div>
  );
}