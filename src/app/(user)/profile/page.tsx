import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/db";
import { forumThreads, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { User, Award, MessageSquare, ShoppingBag, Shield, Clock } from "lucide-react";
import { FadeIn } from "@/components/animations/gsap-wrapper";

export const dynamic = "force-dynamic";

export default async function ProfilePage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const myThreads = await db
    .select()
    .from(forumThreads)
    .where(eq(forumThreads.authorId, session.user.id))
    .orderBy(desc(forumThreads.createdAt))
    .limit(10);

  const myProducts = await db
    .select()
    .from(products)
    .where(eq(products.developerId, session.user.id))
    .orderBy(desc(products.createdAt))
    .limit(10);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <FadeIn className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          {session.user.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={session.user.avatarUrl}
              alt={session.user.username}
              className="h-16 w-16 rounded-full border-2 border-blue-500/40 object-cover shadow-lg"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-slate-800 flex items-center justify-center text-xl font-bold text-slate-300">
              {session.user.username[0]}
            </div>
          )}

          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-extrabold text-white">{session.user.username}</h1>
              <span className="px-2 py-0.5 rounded bg-blue-950 text-blue-400 text-[10px] font-semibold border border-blue-800/40 uppercase">
                {session.user.role}
              </span>
            </div>
            <div className="text-xs text-slate-400 flex items-center gap-3">
              <span className="flex items-center gap-1 text-amber-400 font-semibold">
                <Award className="h-3.5 w-3.5" />
                Reputation: {session.user.reputationScore}
              </span>
              <span>Discord ID: {session.user.discordId}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/inventory"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors"
          >
            My Licenses
          </Link>
          <Link
            href="/wallet"
            className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 hover:bg-amber-500/30 text-amber-400 text-xs font-semibold transition-colors"
          >
            Credit Wallet
          </Link>
        </div>
      </FadeIn>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-400" />
            <span>My Discussion Topics ({myThreads.length})</span>
          </h2>
          {myThreads.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
              No threads published yet.
            </div>
          ) : (
            <div className="space-y-3">
              {myThreads.map((t) => (
                <Link
                  key={t.id}
                  href={`/bbs/thread/${t.slug}`}
                  className="block p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 transition-colors"
                >
                  <h3 className="text-sm font-bold text-slate-100 truncate">{t.title}</h3>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span>{new Date(t.createdAt).toLocaleDateString("en-US")}</span>
                    <span>{t.repliesCount} replies</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-emerald-400" />
            <span>My Listed Products ({myProducts.length})</span>
          </h2>
          {myProducts.length === 0 ? (
            <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
              No products listed yet.
            </div>
          ) : (
            <div className="space-y-3">
              {myProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/market/${p.slug}`}
                  className="block p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 transition-colors"
                >
                  <h3 className="text-sm font-bold text-slate-100 truncate">{p.title}</h3>
                  <div className="mt-1 flex items-center justify-between text-xs text-slate-500">
                    <span className="capitalize text-emerald-400">{p.category}</span>
                    <span>{p.salesCount} sold</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}