import Link from "next/link";
import { db } from "@/db";
import { forumThreads, products, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { MessageSquare, ShoppingBag, Coins, ShieldCheck, Flame, PlusCircle, Sparkles, Code2, Award, AlertCircle } from "lucide-react";
import { FadeIn, StaggerList } from "@/components/animations/gsap-wrapper";

export const dynamic = "force-dynamic";

export default async function RootPortalPage() {
  let hotThreads: any[] = [];
  let featuredProducts: any[] = [];
  let dbError = false;

  try {
    hotThreads = await db
      .select({
        id: forumThreads.id,
        title: forumThreads.title,
        slug: forumThreads.slug,
        repliesCount: forumThreads.repliesCount,
        likesCount: forumThreads.likesCount,
        createdAt: forumThreads.createdAt,
        author: { username: users.username },
      })
      .from(forumThreads)
      .innerJoin(users, eq(forumThreads.authorId, users.id))
      .where(eq(forumThreads.status, "published"))
      .orderBy(desc(forumThreads.likesCount))
      .limit(5);

    featuredProducts = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        shortDescription: products.shortDescription,
        category: products.category,
        tokenPrice: products.tokenPrice,
        version: products.version,
        salesCount: products.salesCount,
        developer: { username: users.username },
      })
      .from(products)
      .innerJoin(users, eq(products.developerId, users.id))
      .where(eq(products.status, "active"))
      .orderBy(desc(products.salesCount))
      .limit(4);
  } catch (err) {
    console.error("Database connection warning on landing page:", err);
    dbError = true;
  }

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <FadeIn className="relative overflow-hidden p-8 sm:p-12 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 shadow-2xl space-y-6">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Valax Scrub BBS & Digital Marketplace Subplatform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            Lightweight, Secure & Built for Developers: <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">BBS Community & Digital Trade</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            Zero binary uploads, verified GitHub Release external delivery, and an immutable double-entry Valax Utility Credit ledger. Join discussions, acquire tools, and showcase your scripts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            href="/bbs"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition-all transform active:scale-95"
          >
            <MessageSquare className="h-4 w-4" />
            Explore BBS Community
          </Link>
          <Link
            href="/market"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold border border-slate-700 transition-all"
          >
            <ShoppingBag className="h-4 w-4 text-emerald-400" />
            Browse Marketplace
          </Link>
        </div>
      </FadeIn>

      {dbError && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-5 w-5 shrink-0 text-amber-400" />
          <div>
            <p className="font-semibold">Notice: Database environment variables not configured in Vercel</p>
            <p className="text-amber-300/80 mt-0.5">Please add TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in your Vercel Project Settings &gt; Environment Variables.</p>
          </div>
        </div>
      )}

      {/* Feature Highlights Grid */}
      <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Code2 className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-base text-white">Verified External Delivery</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            The platform never hosts user executable binaries. All assets link directly to verified external GitHub Releases.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Coins className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-base text-white">Utility Credit Dual Ledger</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Turso LibSQL strong consistency with immutable transaction journal logs ensuring full traceability.
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Award className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-base text-white">Discord Authentication</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Fast passwordless login via Discord OAuth with HttpOnly security and instant remote session revocation.
          </p>
        </div>
      </StaggerList>

      {/* Split Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Hot BBS Threads */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              <span>Trending Technical Discussions</span>
            </h2>
            <Link href="/bbs" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
              View All &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {hotThreads.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
                No discussions yet. Be the first to start a conversation!
              </div>
            ) : (
              hotThreads.map((t) => (
                <Link
                  key={t.id}
                  href={`/bbs/thread/${t.slug}`}
                  className="block p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all"
                >
                  <h3 className="font-bold text-sm text-slate-100 hover:text-blue-400 transition-colors line-clamp-1">
                    {t.title}
                  </h3>
                  <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                    <span>By {t.author?.username || "Community Member"}</span>
                    <div className="flex items-center gap-3">
                      <span>{t.likesCount} Likes</span>
                      <span>{t.repliesCount} Replies</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Right: Featured Marketplace Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-emerald-400" />
              <span>Featured Developer Assets</span>
            </h2>
            <Link href="/market" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
              Visit Market &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {featuredProducts.length === 0 ? (
              <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
                No items listed yet. Click &quot;Publish Asset&quot; to list your script!
              </div>
            ) : (
              featuredProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/market/${p.slug}`}
                  className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all flex items-center justify-between gap-4"
                >
                  <div className="min-w-0 space-y-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                      {p.category}
                    </span>
                    <h3 className="font-bold text-sm text-slate-100 truncate">{p.title}</h3>
                    <div className="text-xs text-slate-500">Creator: {p.developer?.username || "Developer"}</div>
                  </div>

                  <div className="shrink-0 text-right space-y-1">
                    <div className="flex items-center gap-1 text-sm font-bold text-amber-400">
                      <Coins className="h-4 w-4" />
                      <span>{p.tokenPrice}</span>
                    </div>
                    <div className="text-[10px] text-slate-500">{p.salesCount} sold</div>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}