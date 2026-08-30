import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { products, productPurchases, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getCurrentSession } from "@/lib/auth";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { MotionContainer } from "@/components/animations/MotionContainer";
import { Github, ExternalLink, ShieldCheck, Tag, Code, Coins, FileText, CheckCircle2, Terminal, Info } from "lucide-react";
import { PurchaseButton } from "./purchase-button";

export const dynamic = "force-dynamic";

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
        version: products.releaseVersion,
        releaseTag: products.releaseTag,
        repositoryUrl: products.repositoryUrl,
        releaseUrl: products.releaseUrl,
        releaseChecksum: products.releaseChecksum,
        verificationStatus: products.verificationStatus,
        lastVerifiedAt: products.lastVerifiedAt,
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
  const effectiveReleaseUrl = product.releaseUrl || product.githubReleaseUrl;
  const effectiveRepoUrl = product.repositoryUrl || product.githubRepositoryUrl;

  return (
    <div className="space-y-8 max-w-6xl mx-auto py-4">
      <div className="flex items-center gap-2 text-xs text-neutral-400">
        <Link href="/market" className="hover:text-white transition-colors">Marketplace</Link>
        <span>/</span>
        <span className="text-cyan-400 font-medium">{product.category}</span>
        <span>/</span>
        <span className="truncate max-w-xs text-neutral-200">{product.title}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 sm:p-8 rounded-3xl border border-white/[0.08] bg-obsidian-950/80 shadow-2xl space-y-6">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge-cyan text-xs font-bold px-2.5 py-0.5 rounded-full">
                  {product.category}
                </span>
                <span className="badge-gold text-xs font-mono font-bold px-2.5 py-0.5 rounded-full">
                  {product.releaseTag || `v${product.version}`}
                </span>
                <span className="badge-emerald inline-flex items-center gap-1 text-xs font-bold px-2.5 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" />
                  <span>Verified GitHub Release</span>
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{product.title}</h1>
              <p className="text-sm text-neutral-300 leading-relaxed">{product.shortDescription}</p>
            </div>

            {/* Delivery Guarantee Notice */}
            <div className="p-4 rounded-2xl border border-emerald-500/20 bg-emerald-950/20 text-emerald-300 text-xs flex items-start gap-3">
              <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-400 mt-0.5" />
              <div>
                <span className="font-bold block text-emerald-200">Automated Instant Delivery Guarantee</span>
                Upon acquiring with Utility Credits, the exact verified release snapshot and cryptographic license will be instantly linked to your Inventory. No developer messaging required.
              </div>
            </div>

            <div className="pt-6 border-t border-white/[0.06] space-y-4">
              <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Technical Details & Overview</h2>
              <SafeMarkdown content={product.description} />
            </div>

            {product.changelog && (
              <div className="pt-6 border-t border-white/[0.06] space-y-3">
                <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-400">Release Notes & Changelog</h2>
                <div className="p-4 rounded-2xl bg-obsidian-900 border border-white/[0.06] font-mono text-xs text-neutral-300 whitespace-pre-wrap leading-relaxed">
                  {product.changelog}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action Sidebar */}
        <div className="space-y-6">
          <div className="p-6 rounded-3xl border border-white/[0.08] bg-obsidian-950/90 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-xs text-neutral-400">Acquisition Price</span>
              <div className="flex items-center gap-1.5 text-2xl font-black text-amber-400">
                <Coins className="h-6 w-6 text-amber-400" />
                <span>{product.tokenPrice}</span>
                <span className="text-xs font-bold text-amber-400/80">Credits</span>
              </div>
            </div>

            <PurchaseButton
              productId={product.id}
              tokenPrice={product.tokenPrice}
              userLoggedIn={!!session}
              alreadyPurchased={alreadyPurchased}
              isDeveloper={isDeveloper}
              existingLicenseKey={licenseKey}
              githubReleaseUrl={effectiveReleaseUrl}
            />

            <div className="pt-4 border-t border-white/[0.06] space-y-2.5 text-xs">
              <span className="font-bold text-neutral-300 block mb-2">Verified External Links</span>

              <a
                href={effectiveReleaseUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-white/[0.06] text-neutral-300 hover:text-white hover:border-white/[0.14] transition-all"
              >
                <div className="flex items-center gap-2">
                  <Github className="h-4 w-4 text-emerald-400" />
                  <span>GitHub Release Page</span>
                </div>
                <ExternalLink className="h-3.5 w-3.5 text-neutral-500" />
              </a>

              {effectiveRepoUrl && (
                <a
                  href={effectiveRepoUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-white/[0.06] text-neutral-300 hover:text-white hover:border-white/[0.14] transition-all"
                >
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-cyan-400" />
                    <span>Source Repository</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-neutral-500" />
                </a>
              )}

              {product.documentationUrl && (
                <a
                  href={product.documentationUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex items-center justify-between p-3 rounded-xl bg-obsidian-900 border border-white/[0.06] text-neutral-300 hover:text-white hover:border-white/[0.14] transition-all"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-amber-400" />
                    <span>Documentation</span>
                  </div>
                  <ExternalLink className="h-3.5 w-3.5 text-neutral-500" />
                </a>
              )}
            </div>

            {product.releaseChecksum && (
              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/[0.04] space-y-1">
                <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">SHA-256 Digest</span>
                <code className="block text-[10px] font-mono text-cyan-300 truncate select-all">
                  {product.releaseChecksum}
                </code>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}