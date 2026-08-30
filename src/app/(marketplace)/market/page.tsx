import Link from "next/link";
import { db } from "@/db";
import { products, users } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { ShoppingBag, PlusCircle, Coins, Github, ShieldCheck, Tag } from "lucide-react";
import { FadeIn, StaggerList } from "@/components/animations/gsap-wrapper";

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
    <div className="space-y-8">
      {/* Hero Banner */}
      <FadeIn className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/80 to-emerald-950/40 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-semibold mb-1 uppercase tracking-wider">
            <ShieldCheck className="h-4 w-4" />
            <span>Verified GitHub Releases Only</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Valax Scrub Digital Assets & Script Market
          </h1>
          <p className="mt-2 text-sm text-slate-400 max-w-2xl leading-relaxed">
            Acquire developer tools, automation scripts, and custom services. Secure delivery exclusively through verified GitHub Releases with Valax Utility Credits.
          </p>
        </div>
        <Link
          href="/market/publish"
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-600/25 transition-all shrink-0"
        >
          <PlusCircle className="h-4 w-4" />
          Publish Digital Asset
        </Link>
      </FadeIn>

      {/* Category Pills */}
      <div className="flex flex-wrap items-center gap-2">
        {categories.map((c) => {
          const isActive = (c === "All" && !category) || category === c;
          const href = c === "All" ? "/market" : `/market?category=${c}`;
          return (
            <Link
              key={c}
              href={href}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                isActive
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                  : "bg-slate-900/60 border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
              }`}
            >
              {c}
            </Link>
          );
        })}
      </div>

      {/* Products Grid */}
      {items.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-slate-800 bg-slate-900/30 text-slate-400">
          No approved items in this category yet.
        </div>
      ) : (
        <StaggerList className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all flex flex-col justify-between group"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1">
                    <Tag className="h-3 w-3 text-slate-400" />
                    {item.category}
                  </span>
                  <span className="text-xs text-slate-500 font-mono">v{item.version}</span>
                </div>

                <Link href={`/market/${item.slug}`} className="block">
                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {item.title}
                  </h3>
                  <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                    {item.shortDescription}
                  </p>
                </Link>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-sm">
                    <Coins className="h-4 w-4" />
                    <span>{item.tokenPrice}</span>
                  </div>
                  <span className="text-[11px] text-slate-500">{item.salesCount} sold</span>
                </div>

                <Link
                  href={`/market/${item.slug}`}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                >
                  View Details &rarr;
                </Link>
              </div>
            </div>
          ))}
        </StaggerList>
      )}
    </div>
  );
}