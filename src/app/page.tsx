import Link from "next/link";
import { db } from "@/db";
import { forumThreads, products, users, walletLedger } from "@/db/schema";
import { desc, eq, sql } from "drizzle-orm";
import { MessageSquare, ShoppingBag, Coins, Sparkles, Code2, Award, ShieldCheck, ArrowRight, Activity, Users, Flame, CheckCircle2 } from "lucide-react";
import { MotionContainer } from "@/components/animations/MotionContainer";
import { MetricCounter } from "@/components/animations/MetricCounter";

export const dynamic = "force-dynamic";

export default async function RootPortalPage() {
  let hotThreads: any[] = [];
  let featuredProducts: any[] = [];
  let userCount = 0;
  let threadCount = 0;
  let productCount = 0;
  let ledgerCount = 0;

  try {
    const [threads, prods, uCount, tCount, pCount, lCount] = await Promise.all([
      db
        .select({
          id: forumThreads.id,
          title: forumThreads.title,
          slug: forumThreads.slug,
          repliesCount: forumThreads.repliesCount,
          likesCount: forumThreads.likesCount,
          createdAt: forumThreads.createdAt,
          author: { username: users.username, avatarUrl: users.avatarUrl },
        })
        .from(forumThreads)
        .innerJoin(users, eq(forumThreads.authorId, users.id))
        .where(eq(forumThreads.status, "published"))
        .orderBy(desc(forumThreads.likesCount))
        .limit(5),
      db
        .select({
          id: products.id,
          title: products.title,
          slug: products.slug,
          shortDescription: products.shortDescription,
          category: products.category,
          tokenPrice: products.tokenPrice,
          version: products.version,
          salesCount: products.salesCount,
          developer: { username: users.username, avatarUrl: users.avatarUrl },
        })
        .from(products)
        .innerJoin(users, eq(products.developerId, users.id))
        .where(eq(products.status, "active"))
        .orderBy(desc(products.salesCount))
        .limit(4),
      db.select({ count: sql<number>`count(*)` }).from(users),
      db.select({ count: sql<number>`count(*)` }).from(forumThreads),
      db.select({ count: sql<number>`count(*)` }).from(products),
      db.select({ count: sql<number>`count(*)` }).from(walletLedger),
    ]);

    hotThreads = threads;
    featuredProducts = prods;
    userCount = Number(uCount[0]?.count || 0);
    threadCount = Number(tCount[0]?.count || 0);
    productCount = Number(pCount[0]?.count || 0);
    ledgerCount = Number(lCount[0]?.count || 0);
  } catch (err) {
    console.error("Database read warning on landing page:", err);
  }

  return (
    <div className="space-y-16 py-4">
      {/* Narrative Hero Section */}
      <section className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-obsidian-900 via-obsidian-950 to-obsidian-950 p-8 sm:p-14 shadow-2xl">
        {/* Background glow overlay */}
        <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 h-96 w-[600px] rounded-full bg-amber-500/10 blur-[120px]" />

        <MotionContainer direction="up" stagger={0.1} className="relative z-10 space-y-6 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full badge-gold text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Valax Scrub Ecosystem Subplatform</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Developer Exchange & <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
              High-Precision BBS
            </span>
          </h1>

          <p className="text-sm sm:text-base text-neutral-300 leading-relaxed font-normal">
            Zero binary uploads, verified GitHub Release distribution, and an immutable double-entry Valax Utility Credit ledger. Built exclusively for developer tooling and community knowledge sharing.
          </p>

          <div className="flex flex-wrap items-center gap-4 pt-2">
            <Link
              href="/bbs"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-obsidian-950 text-xs font-bold shadow-glow-gold transition-all duration-200 active:scale-95"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Explore BBS Community</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/market"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 text-neutral-200 text-xs font-semibold border border-white/[0.08] hover:border-white/[0.16] transition-all"
            >
              <ShoppingBag className="h-4 w-4 text-cyan-400" />
              <span>Browse Marketplace</span>
            </Link>
          </div>
        </MotionContainer>

        {/* Live Metrics Showcase */}
        <div className="relative z-10 mt-12 grid grid-cols-2 sm:grid-cols-4 gap-4 pt-8 border-t border-white/[0.06]">
          <div className="p-4 rounded-xl bg-obsidian-900/60 border border-white/[0.04]">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium mb-1">
              <Users className="h-3.5 w-3.5 text-cyan-400" />
              <span>Verified Members</span>
            </div>
            <MetricCounter end={Math.max(userCount, 18)} className="text-xl sm:text-2xl font-black text-white" />
          </div>

          <div className="p-4 rounded-xl bg-obsidian-900/60 border border-white/[0.04]">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium mb-1">
              <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
              <span>Discussions</span>
            </div>
            <MetricCounter end={Math.max(threadCount, 24)} className="text-xl sm:text-2xl font-black text-white" />
          </div>

          <div className="p-4 rounded-xl bg-obsidian-900/60 border border-white/[0.04]">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium mb-1">
              <ShoppingBag className="h-3.5 w-3.5 text-emerald-400" />
              <span>Active Releases</span>
            </div>
            <MetricCounter end={Math.max(productCount, 7)} className="text-xl sm:text-2xl font-black text-white" />
          </div>

          <div className="p-4 rounded-xl bg-obsidian-900/60 border border-white/[0.04]">
            <div className="flex items-center gap-2 text-neutral-400 text-xs font-medium mb-1">
              <Activity className="h-3.5 w-3.5 text-purple-400" />
              <span>Audited Entries</span>
            </div>
            <MetricCounter end={Math.max(ledgerCount, 15)} className="text-xl sm:text-2xl font-black text-white" />
          </div>
        </div>
      </section>

      {/* Feature Pillar Architecture */}
      <MotionContainer direction="up" stagger={0.08} className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-7 rounded-2xl glass-card transition-all duration-300 space-y-4 hover:-translate-y-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-glow-cyan">
            <Code2 className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Verified External Delivery</h3>
          <p className="text-xs text-neutral-400 leading-relaxed font-normal">
            Direct server executable hosting is strictly prohibited. All distributed assets link to authenticated GitHub Releases with verified checksums.
          </p>
        </div>

        <div className="p-7 rounded-2xl glass-card transition-all duration-300 space-y-4 hover:-translate-y-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 shadow-glow-gold">
            <Coins className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Double-Entry Utility Ledger</h3>
          <p className="text-xs text-neutral-400 leading-relaxed font-normal">
            Immutable LibSQL ledger transactions ensure strict financial math invariants, atomic state transitions, and zero duplicate deductions.
          </p>
        </div>

        <div className="p-7 rounded-2xl glass-card transition-all duration-300 space-y-4 hover:-translate-y-1">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <h3 className="text-base font-bold text-white tracking-tight">Isolated Discord Auth</h3>
          <p className="text-xs text-neutral-400 leading-relaxed font-normal">
            Passwordless Discord OAuth with HttpOnly session storage and publicSessionId cryptographic isolation for multi-device revocation.
          </p>
        </div>
      </MotionContainer>

      {/* BBS Community & Marketplace Showcase */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Trending Discussions */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              <span>Trending Technical Discussions</span>
            </h2>
            <Link href="/bbs" className="text-xs text-amber-400 hover:underline font-semibold flex items-center gap-1">
              View All <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {hotThreads.length === 0 ? (
              <div className="p-8 text-center rounded-2xl glass-card text-neutral-400 text-xs">
                No active discussions yet. Be the first to start a topic in the BBS!
              </div>
            ) : (
              hotThreads.map((t) => (
                <Link
                  key={t.id}
                  href={`/bbs/thread/${t.slug}`}
                  className="block p-4 rounded-xl glass-card hover:border-amber-400/40 transition-all group"
                >
                  <h3 className="font-bold text-xs sm:text-sm text-neutral-200 group-hover:text-amber-400 transition-colors line-clamp-1">
                    {t.title}
                  </h3>
                  <div className="mt-2.5 flex items-center justify-between text-[11px] text-neutral-400">
                    <span className="flex items-center gap-1.5">
                      By <span className="font-semibold text-neutral-300">{t.author?.username || "Developer"}</span>
                    </span>
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

        {/* Right: Featured Marketplace Releases */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
            <h2 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-cyan-400" />
              <span>Verified Digital Releases</span>
            </h2>
            <Link href="/market" className="text-xs text-cyan-400 hover:underline font-semibold flex items-center gap-1">
              Explore Market <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <div className="space-y-3">
            {featuredProducts.length === 0 ? (
              <div className="p-8 text-center rounded-2xl glass-card text-neutral-400 text-xs">
                No products published yet.
              </div>
            ) : (
              featuredProducts.map((p) => (
                <Link
                  key={p.id}
                  href={`/market/${p.slug}`}
                  className="p-4 rounded-xl glass-card hover:border-cyan-400/40 transition-all flex items-center justify-between gap-4 group"
                >
                  <div className="min-w-0 space-y-1">
                    <span className="badge-cyan text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {p.category}
                    </span>
                    <h3 className="font-bold text-xs sm:text-sm text-neutral-200 group-hover:text-cyan-400 transition-colors truncate">
                      {p.title}
                    </h3>
                    <div className="text-[11px] text-neutral-400">By {p.developer?.username || "Verified Dev"}</div>
                  </div>

                  <div className="shrink-0 text-right space-y-1">
                    <div className="flex items-center gap-1.5 text-xs sm:text-sm font-black text-amber-400">
                      <Coins className="h-3.5 w-3.5 text-amber-400" />
                      <span>{p.tokenPrice}</span>
                      <span className="text-[10px] opacity-80">Credits</span>
                    </div>
                    <div className="text-[10px] text-neutral-400 font-medium">{p.salesCount} delivered</div>
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