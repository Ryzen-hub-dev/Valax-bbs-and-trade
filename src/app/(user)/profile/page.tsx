import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/db";
import { forumThreads, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { User, Award, Shield, MessageSquare, Clock, Coins } from "lucide-react";
import { FadeIn } from "@/components/animations/gsap-wrapper";
import Link from "next/link";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const myThreads = await db
    .select()
    .from(forumThreads)
    .where(eq(forumThreads.authorId, session.user.id))
    .orderBy(desc(forumThreads.createdAt))
    .limit(10);

  return (
    <div className="space-y-8 max-w-4xl mx-auto">
      {/* Profile Header */}
      <FadeIn className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl flex flex-col sm:flex-row items-center sm:items-start gap-6">
        {session.user.avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={session.user.avatarUrl}
            alt={session.user.username}
            className="h-20 w-20 rounded-2xl border border-slate-700 object-cover shadow-lg"
          />
        ) : (
          <div className="h-20 w-20 rounded-2xl bg-slate-800 flex items-center justify-center font-bold text-2xl text-slate-300">
            {session.user.username[0]}
          </div>
        )}

        <div className="space-y-3 text-center sm:text-left flex-1">
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
            <h1 className="text-2xl font-bold text-white">{session.user.username}</h1>
            {session.user.role === "admin" ? (
              <span className="px-2 py-0.5 rounded-full bg-purple-950 border border-purple-700 text-purple-300 text-xs font-bold">
                ADMIN
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-blue-950 border border-blue-700 text-blue-300 text-xs font-bold">
                COMMUNITY MEMBER
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
            <div className="flex items-center gap-1.5">
              <Award className="h-4 w-4 text-amber-400" />
              <span>信誉声望值: <strong className="text-slate-200">{session.user.reputationScore}</strong></span>
            </div>
            <span>•</span>
            <div>Discord ID: <span className="font-mono text-slate-300">{session.user.discordId}</span></div>
          </div>
        </div>
      </FadeIn>

      {/* Recent Activity */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-blue-400" />
          <span>我发布的帖子 ({myThreads.length})</span>
        </h2>

        {myThreads.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
            您尚未发布过任何讨论帖子。
          </div>
        ) : (
          <div className="space-y-3">
            {myThreads.map((t) => (
              <Link
                key={t.id}
                href={`/bbs/thread/${t.slug}`}
                className="block p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all"
              >
                <h3 className="font-bold text-sm text-slate-200 hover:text-blue-400">{t.title}</h3>
                <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                  <span>{new Date(t.createdAt).toLocaleDateString("zh-CN")}</span>
                  <span>•</span>
                  <span>{t.likesCount} 点赞</span>
                  <span>•</span>
                  <span>{t.repliesCount} 回复</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}