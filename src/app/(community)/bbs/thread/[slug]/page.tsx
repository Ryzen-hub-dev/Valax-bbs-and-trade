import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { forumThreads, forumBoards, forumReplies, users, forumLikes, forumBookmarks } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { FadeIn } from "@/components/animations/gsap-wrapper";
import { Pin, CheckCircle2, MessageSquare, Award, Clock } from "lucide-react";
import { ReplyComposer } from "./reply-composer";
import { InteractiveActions } from "./interactive-actions";

export default async function ThreadDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await getCurrentSession();

  const thread = (
    await db
      .select({
        id: forumThreads.id,
        title: forumThreads.title,
        slug: forumThreads.slug,
        content: forumThreads.content,
        tags: forumThreads.tags,
        isPinned: forumThreads.isPinned,
        isResolved: forumThreads.isResolved,
        likesCount: forumThreads.likesCount,
        repliesCount: forumThreads.repliesCount,
        createdAt: forumThreads.createdAt,
        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
          role: users.role,
          reputationScore: users.reputationScore,
        },
        board: {
          slug: forumBoards.slug,
          name: forumBoards.name,
        },
      })
      .from(forumThreads)
      .innerJoin(users, eq(forumThreads.authorId, users.id))
      .innerJoin(forumBoards, eq(forumThreads.boardId, forumBoards.id))
      .where(eq(forumThreads.slug, params.slug))
      .limit(1)
  )[0];

  if (!thread) notFound();

  let isLiked = false;
  let isBookmarked = false;
  if (session) {
    const likeCheck = await db
      .select()
      .from(forumLikes)
      .where(and(eq(forumLikes.userId, session.user.id), eq(forumLikes.targetType, "thread"), eq(forumLikes.targetId, thread.id)))
      .limit(1);
    isLiked = likeCheck.length > 0;

    const bmCheck = await db
      .select()
      .from(forumBookmarks)
      .where(and(eq(forumBookmarks.userId, session.user.id), eq(forumBookmarks.targetType, "thread"), eq(forumBookmarks.targetId, thread.id)))
      .limit(1);
    isBookmarked = bmCheck.length > 0;
  }

  const replies = await db
    .select({
      id: forumReplies.id,
      content: forumReplies.content,
      isSolution: forumReplies.isSolution,
      likesCount: forumReplies.likesCount,
      createdAt: forumReplies.createdAt,
      author: {
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
        role: users.role,
      },
    })
    .from(forumReplies)
    .innerJoin(users, eq(forumReplies.authorId, users.id))
    .where(eq(forumReplies.threadId, thread.id))
    .orderBy(asc(forumReplies.createdAt));

  const tagsList: string[] = JSON.parse(thread.tags || "[]");

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between text-xs text-slate-400">
        <div className="flex items-center gap-2">
          <Link href="/bbs" className="hover:text-white transition-colors">BBS 论坛</Link>
          <span>/</span>
          <Link href={`/bbs/${thread.board.slug}`} className="hover:text-blue-400 transition-colors text-blue-400">
            {thread.board.name}
          </Link>
        </div>
        <div className="flex items-center gap-2 text-slate-500">
          <Clock className="h-3.5 w-3.5" />
          <span>{new Date(thread.createdAt).toLocaleString("zh-CN")}</span>
        </div>
      </div>

      <FadeIn className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            {thread.isPinned && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-xs font-semibold border border-amber-500/30">
                <Pin className="h-3 w-3" /> 置顶公告
              </span>
            )}
            {thread.isResolved && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold border border-emerald-500/30">
                <CheckCircle2 className="h-3 w-3" /> 已解决
              </span>
            )}
            {tagsList.map((tag) => (
              <span key={tag} className="px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 text-xs font-medium">
                #{tag}
              </span>
            ))}
          </div>

          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">
            {thread.title}
          </h1>

          <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              {thread.author.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={thread.author.avatarUrl}
                  alt={thread.author.username}
                  className="h-10 w-10 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="h-10 w-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-300">
                  {thread.author.username[0]}
                </div>
              )}
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-slate-200">{thread.author.username}</span>
                  {thread.author.role === "admin" && (
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/80 text-purple-300 text-[10px] font-semibold border border-purple-700/50">
                      ADMIN
                    </span>
                  )}
                </div>
                <div className="text-xs text-slate-400 flex items-center gap-1">
                  <Award className="h-3 w-3 text-amber-400" />
                  <span>信誉声望: {thread.author.reputationScore}</span>
                </div>
              </div>
            </div>

            <InteractiveActions
              threadId={thread.id}
              initialLiked={isLiked}
              initialBookmarked={isBookmarked}
              initialLikesCount={thread.likesCount}
            />
          </div>
        </div>

        <div className="pt-4 border-t border-slate-800/60">
          <SafeMarkdown content={thread.content} />
        </div>
      </FadeIn>

      <div className="space-y-6">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-400" />
          <span>回复与讨论</span>
          <span className="text-xs font-normal text-slate-400">({replies.length} 条)</span>
        </h2>

        <div className="space-y-4">
          {replies.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/20 text-slate-400 text-sm">
              暂无回复，发表你的见解吧！
            </div>
          ) : (
            replies.map((r, index) => (
              <div
                key={r.id}
                id={`reply-${r.id}`}
                className={`p-6 rounded-xl border ${
                  r.isSolution
                    ? "border-emerald-500/50 bg-emerald-950/10 shadow-lg shadow-emerald-950/20"
                    : "border-slate-800/80 bg-slate-900/40"
                } space-y-4 transition-all`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {r.author.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={r.author.avatarUrl}
                        alt={r.author.username}
                        className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-xs text-slate-300">
                        {r.author.username[0]}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-200">{r.author.username}</span>
                        {r.isSolution && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold border border-emerald-500/40">
                            <CheckCircle2 className="h-3 w-3" /> 最佳解决方案
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">
                        #{index + 1} 楼 • {new Date(r.createdAt).toLocaleString("zh-CN")}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="text-sm">
                  <SafeMarkdown content={r.content} />
                </div>
              </div>
            ))
          )}
        </div>

        <ReplyComposer threadId={thread.id} userLoggedIn={!!session} />
      </div>
    </div>
  );
}