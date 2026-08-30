import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { products, productPurchases, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { FadeIn } from "@/components/animations/gsap-wrapper";
import { Github, ExternalLink, ShieldCheck, Tag, Code, Coins, FileText, CheckCircle2 } from "lucide-react";
import { PurchaseButton } from "./purchase-button";

export default async function ProductDetailPage({
  params,
}: {
  params: { slug: string };
}) {
  const session = await getCurrentSession();

  const product = (
    await db
      .select({
        id: products.id,
        title: products.title,
        slug: products.slug,
        shortDescription: products.shortDescription,
        description: products.description,
        category: products.category,
        tokenPrice: products.tokenPrice,
        version: products.version,
        compatibility: products.compatibility,
        changelog: products.changelog,
        githubRepositoryUrl: products.githubRepositoryUrl,
        githubReleaseUrl: products.githubReleaseUrl,
        externalDemoUrl: products.externalDemoUrl,
        documentationUrl: products.documentationUrl,
        salesCount: products.salesCount,
        ratingAverage: products.ratingAverage,
        createdAt: products.createdAt,
        developerId: products.developerId,
        developer: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(products)
      .innerJoin(users, eq(products.developerId, users.id))
      .where(and(eq(products.slug, params.slug), eq(products.status, "active")))
      .limit(1)
  )[0];

  if (!product) notFound();

  // Check purchase status
  let alreadyPurchased = false;
  let licenseKey = "";
  if (session) {
    const purchase = (
      await db
        .select()
        .from(productPurchases)
        .where(
          and(
            eq(productPurchases.productId, product.id),
            eq(productPurchases.buyerId, session.user.id),
            eq(productPurchases.status, "active")
          )
        )
        .limit(1)
    )[0];

    if (purchase) {
      alreadyPurchased = true;
      licenseKey = purchase.licenseKey;
    }
  }

  const isDeveloper = session?.user.id === product.developerId;

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-slate-400">
        <Link href="/market" className="hover:text-white transition-colors">数字市场</Link>
        <span>/</span>
        <span className="text-emerald-400 font-medium">{product.category}</span>
        <span>/</span>
        <span className="truncate max-w-xs">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Details (Left 2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <FadeIn className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900/60 shadow-xl space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-emerald-950/80 border border-emerald-700/60 text-emerald-300 text-xs font-semibold">
                  {product.category}
                </span>
                <span className="text-xs text-slate-500 font-mono">v{product.version}</span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-white">{product.title}</h1>
              <p className="text-sm text-slate-300 leading-relaxed">{product.shortDescription}</p>
            </div>

            {/* Description Body */}
            <div className="pt-6 border-t border-slate-800 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">商品与架构详情</h2>
              <SafeMarkdown content={product.description} />
            </div>

            {/* Changelog */}
            {product.changelog && (
              <div className="pt-6 border-t border-slate-800 space-y-3">
                <h2 className="text-sm font-bold uppercase tracking-wider text-slate-400">版本更新记录 (Changelog)</h2>
                <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
                  {product.changelog}
                </div>
              </div>
            )}
          </FadeIn>
        </div>

        {/* Sidebar Info & Action (Right 1 col) */}
        <div className="space-y-6">
          {/* Purchase Action Card */}
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/80 shadow-xl space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">所需积分</span>
              <div className="flex items-center gap-1.5 text-2xl font-black text-amber-400">
                <Coins className="h-6 w-6 text-amber-400" />
                <span>{product.tokenPrice}</span>
                <span className="text-xs font-medium text-amber-400/80">Credits</span>
              </div>
            </div>

            <PurchaseButton
              productId={product.id}
              tokenPrice={product.tokenPrice}
              userLoggedIn={!!session}
              alreadyPurchased={alreadyPurchased}
              isDeveloper={isDeveloper}
              existingLicenseKey={licenseKey}
              githubReleaseUrl={product.githubReleaseUrl}
            />

            {/* Verified External Links */}
            <div className="pt-4 border-t border-slate-800 space-y-2.5 text-xs">
              <span className="font-semibold text-slate-300 block mb-2">安全交付与代码仓库</span>
              <a
                href={product.githubReleaseUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-emerald-400" />
                  <span>GitHub Release</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
              </a>

              {product.githubRepositoryUrl && (
                <a
                  href={product.githubRepositoryUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-blue-400" />
                    <span>开源仓库 / 源码</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                </a>
              )}

              {product.documentationUrl && (
                <a
                  href={product.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-cyan-400" />
                    <span>使用文档</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-slate-500" />
                </a>
              )}
            </div>

            {/* Developer Card */}
            <div className="pt-4 border-t border-slate-800 flex items-center gap-3">
              {product.developer.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={product.developer.avatarUrl}
                  alt={product.developer.username}
                  className="h-9 w-9 rounded-full border border-slate-700 object-cover"
                />
              ) : (
                <div className="h-9 w-9 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                  {product.developer.username[0]}
                </div>
              )}
              <div className="text-xs">
                <div className="text-slate-400">开发者 / 发布者</div>
                <div className="font-bold text-slate-200">{product.developer.username}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}