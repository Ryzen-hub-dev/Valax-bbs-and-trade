import Link from "next/link";
import { db } from "@/db";
import { products, users } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { ShoppingBag, PlusCircle, Coins, ShieldCheck, Tag, ArrowRight, CheckCircle2 } from "lucide-react";
import { MotionContainer } from "@/components/animations/MotionContainer";

export const dynamic = "force-dynamic";

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: { category?: string; sort?: string };
}) {
  const category = searchParams.category;
  let items: any[] = [];

  try {
    items = await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        shortDescription: products.shortDescription,
        category: products.category,
        tokenPrice: products.tokenPrice,
        version: products.version,
        salesCount: products.salesCount,
        ratingAverage: products.ratingAverage,
        previewImageUrl: products.previewImageUrl,
        createdAt: products.createdAt,
        developer: {
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(products)
      .innerJoin(users, eq(products.developerId, users.id))
      .where(
        and(
          eq(products.status, "active"),
          eq(products.moderationStatus, "approved"),
          category ? eq(products.category, category) : undefined
        )
      )
      .orderBy(desc(products.createdAt))
      .limit(30);
  } catch (err) {
    console.error("Marketplace fetch error:", err);
  }

  const categories = ["All", "Scripts", "Templates", "Tools", "Services"];

  return (
    <div className="space-y-12 py-4">
      {/* Marketplace Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-r from-obsidian-900 via-obsidian-950 to-obsidian-900 p-8 sm:p-10 shadow-2xl flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-emerald text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Verified GitHub Release Distribution</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
            Digital Asset & Tool Marketplace
          </h1>
          <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-normal">
            Discover verified developer scripts, templates, and utilities. Instant entitlement delivery with Valax Utility Credits.
          </p>
        </div>

        <Link
          href="/market/publish"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-obsidian-950 text-xs font-bold shadow-lg shadow-emerald-500/20 transition-all shrink-0 active:scale-95"
        >
          <PlusCircle className="h-4 w-4" />
          <span>Publish Asset</span>
        </Link>
      </div>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-white/[0.06]">
        {categories.map((c) => {
          const isActive = (c === "All" && !category) || category === c;
          const href = c === "All" ? "/market" : `/market?category=${c}`;
          return (
            <Link
              key={c}
              href={href}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                isActive
                  ? "bg-amber-500 text-obsidian-950 shadow-glow-gold"
                  : "bg-obsidian-900 border border-white/[0.06] text-neutral-400 hover:text-white hover:border-white/[0.12]"
              }`}
            >
              {c}
            </Link>
          );
        })}
      </div>

      {/* Products Grid */}
      {items.length === 0 ? (
        <div className="p-16 text-center rounded-2xl glass-card text-neutral-400 text-xs">
          No active releases in this category yet. Click &quot;Publish Asset&quot; to list a new release!
        </div>
      ) : (
        <MotionContainer direction="up" stagger={0.06} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-2xl glass-card hover:border-cyan-400/40 transition-all duration-300 flex flex-col justify-between group hover:-translate-y-1"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="badge-cyan text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider flex items-center gap-1">
                    <Tag className="h-3 w-3" />
                    {item.category}
                  </span>
                  <span className="text-[11px] text-neutral-400 font-mono font-medium">v{item.version}</span>
                </div>

                <Link href={`/market/${item.slug}`} className="block">
                  <h3 className="text-base font-bold text-neutral-100 group-hover:text-cyan-400 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="mt-2 text-xs text-neutral-400 line-clamp-2 leading-relaxed font-normal">
                    {item.shortDescription}
                  </p>
                </Link>
              </div>

              <div className="mt-6 pt-4 border-t border-white/[0.04] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg badge-gold font-black text-xs">
                    <Coins className="h-3.5 w-3.5 text-amber-400" />
                    <span>{item.tokenPrice}</span>
                    <span className="text-[10px] opacity-75 font-normal">Credits</span>
                  </div>
                  <span className="text-[10px] text-neutral-400">{item.salesCount} sold</span>
                </div>

                <Link
                  href={`/market/${item.slug}`}
                  className="px-3.5 py-1.5 rounded-xl bg-obsidian-800 hover:bg-obsidian-750 text-neutral-200 hover:text-white border border-white/[0.08] hover:border-white/[0.16] text-xs font-semibold transition-all flex items-center gap-1"
                >
                  <span>Details</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          ))}
        </MotionContainer>
      )}
    </div>
  );
}