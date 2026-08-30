import Link from "next/link";
import { db } from "@/db";
import { forumThreads, products, users, forumBoards } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { MessageSquare, ShoppingBag, Coins, Sparkles, Code2, Award, ShieldCheck, ArrowRight, Lock, KeyRound, CheckCircle2, Flame, ExternalLink, Activity, Users, Shield } from "lucide-react";
import { HeroNarrative } from "@/components/home/HeroNarrative";
import { ProductPreviewShowcase } from "@/components/home/ProductPreviewShowcase";
import { MotionContainer } from "@/components/animations/MotionContainer";

export const dynamic = "force-dynamic";

export default async function RootPortalPage() {
  let hotThreads: any[] = [];
  let featuredProducts: any[] = [];

  try {
    const [threads, prods] = await Promise.all([
      db
        .select({
          id: forumThreads.id,
          title: forumThreads.title,
          slug: forumThreads.slug,
          repliesCount: forumThreads.repliesCount,
          likesCount: forumThreads.likesCount,
          createdAt: forumThreads.createdAt,
          author: { username: users.username, avatarUrl: users.avatarUrl },
          board: { name: forumBoards.name, slug: forumBoards.slug },
        })
        .from(forumThreads)
        .innerJoin(users, eq(forumThreads.authorId, users.id))
        .leftJoin(forumBoards, eq(forumThreads.boardId, forumBoards.id))
        .where(eq(forumThreads.status, "published"))
        .orderBy(desc(forumThreads.likesCount))
        .limit(4),
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
    ]);

    hotThreads = threads;
    featuredProducts = prods;
  } catch (err) {
    console.error("Database read on landing page:", err);
  }

  return (
    <div className="space-y-20 py-4">
      {/* 1. Hero Narrative */}
      <HeroNarrative />

      {/* 2. Product Narrative Pillars */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="badge-cyan text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
            Architecture & Philosophy
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white">
            Built from the Ground Up for Developer Trust
          </h2>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-normal">
            Every layer of Valax BBS & Trade is designed for cryptographic transparency, strict security isolation, and immutable auditability.
          </p>
        </div>

        <MotionContainer direction="up" stagger={0.08} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="p-6 rounded-2xl glass-card space-y-3 hover:-translate-y-1 transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">Technical BBS Forum</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              High-signal RFC discussions, architecture reviews, and developer collaboration with syntax-highlighted code blocks.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card space-y-3 hover:-translate-y-1 transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-glow-cyan">
              <Code2 className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">Verified External Delivery</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              Direct binary uploads are permanently blocked. Software packages distribute exclusively through audited GitHub Releases.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card space-y-3 hover:-translate-y-1 transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400">
              <Coins className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">Utility Credit Dual Ledger</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              Double-entry accounting with LibSQL atomic rollback states, preventing concurrency race conditions or double deductions.
            </p>
          </div>

          <div className="p-6 rounded-2xl glass-card space-y-3 hover:-translate-y-1 transition-all duration-300">
            <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <KeyRound className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold text-white tracking-tight">Discord Identity & Session Guard</h3>
            <p className="text-xs text-neutral-400 leading-relaxed font-normal">
              Passwordless OAuth authentication with 128-bit publicSessionId isolation for instant multi-device remote revocation.
            </p>
          </div>
        </MotionContainer>
      </section>

      {/* 3. Interactive Product Preview Showcase */}
      <section className="space-y-4">
        <ProductPreviewShowcase />
      </section>

      {/* 4. Real Community Discussions */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">Active Community Discussions</h2>
            </div>
            <p className="text-xs text-neutral-400">Real-time technical threads and developer proposals</p>
          </div>

          <Link
            href="/bbs"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
          >
            <span>View All Topics</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {hotThreads.length === 0 ? (
          <div className="p-12 text-center rounded-2xl glass-card text-neutral-400 space-y-3">
            <MessageSquare className="h-8 w-8 text-neutral-600 mx-auto" />
            <p className="text-xs">No active discussions currently listed. Be the first to start a conversation!</p>
            <Link
              href="/bbs/new"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl badge-gold text-xs font-bold"
            >
              Start New Thread
            </Link>
          </div>
        ) : (
          <MotionContainer direction="up" stagger={0.06} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {hotThreads.map((t) => (
              <Link
                key={t.id}
                href={`/bbs/thread/${t.slug}`}
                className="p-6 rounded-2xl glass-card hover:border-amber-400/40 transition-all group flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="badge-cyan text-[10px] font-bold px-2 py-0.5 rounded-full">
                      {t.board?.name || "General"}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      {new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                  </div>
                  <h3 className="font-bold text-sm text-neutral-100 group-hover:text-amber-400 transition-colors line-clamp-2">
                    {t.title}
                  </h3>
                </div>

                <div className="mt-4 pt-3 border-t border-white/[0.04] flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Author: <strong className="text-neutral-300 font-semibold">{t.author?.username || "Developer"}</strong></span>
                  <div className="flex items-center gap-3">
                    <span>{t.likesCount} Likes</span>
                    <span>{t.repliesCount} Replies</span>
                  </div>
                </div>
              </Link>
            ))}
          </MotionContainer>
        )}
      </section>

      {/* 5. Verified Digital Releases */}
      <section className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.06]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-cyan-400" />
              <h2 className="text-lg font-bold text-white tracking-tight">Verified Developer Releases</h2>
            </div>
            <p className="text-xs text-neutral-400">Audited scripts, tooling, and developer templates</p>
          </div>

          <Link
            href="/market"
            className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
          >
            <span>Explore Marketplace</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

        {featuredProducts.length === 0 ? (
          <div className="p-12 text-center rounded-2xl glass-card text-neutral-400 space-y-3">
            <ShoppingBag className="h-8 w-8 text-neutral-600 mx-auto" />
            <p className="text-xs">No products currently published. Click below to submit an asset for review!</p>
            <Link
              href="/market/publish"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl badge-cyan text-xs font-bold"
            >
              Publish Developer Asset
            </Link>
          </div>
        ) : (
          <MotionContainer direction="up" stagger={0.06} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {featuredProducts.map((p) => (
              <div
                key={p.id}
                className="p-6 rounded-2xl glass-card hover:border-cyan-400/40 transition-all flex flex-col justify-between group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="badge-cyan text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {p.category}
                    </span>
                    <span className="text-[10px] text-neutral-400 font-mono">v{p.version}</span>
                  </div>

                  <Link href={`/market/${p.slug}`} className="block">
                    <h3 className="font-bold text-xs sm:text-sm text-neutral-100 group-hover:text-cyan-400 transition-colors line-clamp-2">
                      {p.title}
                    </h3>
                    <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 font-normal">
                      {p.shortDescription}
                    </p>
                  </Link>
                </div>

                <div className="mt-5 pt-3 border-t border-white/[0.04] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 badge-gold px-2.5 py-1 rounded-lg text-xs font-bold">
                    <Coins className="h-3 w-3 text-amber-400" />
                    <span>{p.tokenPrice}</span>
                  </div>

                  <Link
                    href={`/market/${p.slug}`}
                    className="text-[11px] text-neutral-400 hover:text-white font-medium flex items-center gap-1"
                  >
                    <span>View</span>
                    <ArrowRight className="h-3 w-3" />
                  </Link>
                </div>
              </div>
            ))}
          </MotionContainer>
        )}
      </section>

      {/* 6. Utility Credits & Governance Policy */}
      <section className="rounded-3xl border border-white/[0.08] bg-obsidian-950/90 p-8 sm:p-12 space-y-6">
        <div className="flex items-center gap-2.5">
          <ShieldCheck className="h-5 w-5 text-emerald-400" />
          <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
            Governance & Non-Financial Utility Credits
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-neutral-400 leading-relaxed">
          <div className="space-y-2 p-5 rounded-2xl bg-obsidian-900 border border-white/[0.04]">
            <h4 className="font-bold text-neutral-200 text-sm">Non-Financial Utility</h4>
            <p>
              Valax Credits are internal functional credits designed solely for software licensing, developer tooling access, and forum features. They are not investments, securities, or convertible currency.
            </p>
          </div>

          <div className="space-y-2 p-5 rounded-2xl bg-obsidian-900 border border-white/[0.04]">
            <h4 className="font-bold text-neutral-200 text-sm">Strict Zero-Upload Policy</h4>
            <p>
              The platform never hosts or serves user binary executables. All distributed assets are verified external GitHub Release tags, safeguarding the ecosystem against untrusted server storage.
            </p>
          </div>

          <div className="space-y-2 p-5 rounded-2xl bg-obsidian-900 border border-white/[0.04]">
            <h4 className="font-bold text-neutral-200 text-sm">Fail-Closed Admin Safeguards</h4>
            <p>
              High-risk transaction pathways, ledger adjustments, and payments remain strictly guarded by server-side feature flags, defaulting to closed on any database read interruption.
            </p>
          </div>
        </div>
      </section>

      {/* 7. Final Action CTA */}
      <section className="relative overflow-hidden rounded-3xl border border-amber-500/30 bg-gradient-to-r from-obsidian-900 via-obsidian-950 to-obsidian-900 p-8 sm:p-14 text-center space-y-6 shadow-glow-gold">
        <div className="max-w-xl mx-auto space-y-3">
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Ready to Build with the Valax Ecosystem?
          </h2>
          <p className="text-xs sm:text-sm text-neutral-300 leading-relaxed font-normal">
            Join the developer community, participate in RFC proposals, or browse verified GitHub software releases.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
          <Link
            href="/login"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-obsidian-950 text-xs font-black shadow-glow-gold transition-all active:scale-95"
          >
            <Lock className="h-4 w-4" />
            <span>Authenticate via Discord</span>
          </Link>
          <Link
            href="/bbs"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 text-neutral-200 text-xs font-bold border border-white/[0.08] hover:border-white/[0.18] transition-all"
          >
            <MessageSquare className="h-4 w-4 text-cyan-400" />
            <span>Join BBS Forum</span>
          </Link>
          <Link
            href="/market"
            className="flex items-center gap-2 px-6 py-3.5 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 text-neutral-200 text-xs font-bold border border-white/[0.08] hover:border-white/[0.18] transition-all"
          >
            <ShoppingBag className="h-4 w-4 text-emerald-400" />
            <span>View Marketplace</span>
          </Link>
        </div>
      </section>
    </div>
  );
}