import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/db";
import { productPurchases, products, orderDeliverySnapshots, ordersMarket } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { FolderLock, Download, Copy, Key, ExternalLink, ShieldCheck, Github, Coins, Sparkles, Terminal, CheckCircle2 } from "lucide-react";
import { MotionContainer } from "@/components/animations/MotionContainer";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  let purchases: any[] = [];

  try {
    purchases = await db
      .select({
        id: productPurchases.id,
        licenseKey: productPurchases.licenseKey,
        tokensSpent: productPurchases.tokensSpent,
        createdAt: productPurchases.createdAt,
        status: productPurchases.status,
        product: {
          id: products.id,
          title: products.title,
          slug: products.slug,
          version: products.releaseVersion,
          releaseUrl: products.releaseUrl,
          documentationUrl: products.documentationUrl,
        },
        snapshot: {
          id: orderDeliverySnapshots.id,
          orderId: orderDeliverySnapshots.orderId,
          purchasedVersion: orderDeliverySnapshots.purchasedVersion,
          releaseTag: orderDeliverySnapshots.releaseTag,
          repositoryUrl: orderDeliverySnapshots.repositoryUrl,
          releaseUrl: orderDeliverySnapshots.releaseUrl,
          releaseAssetUrl: orderDeliverySnapshots.releaseAssetUrl,
          releaseCommitSha: orderDeliverySnapshots.releaseCommitSha,
          releaseChecksum: orderDeliverySnapshots.releaseChecksum,
          deliveredAt: orderDeliverySnapshots.deliveredAt,
        },
      })
      .from(productPurchases)
      .innerJoin(products, eq(productPurchases.productId, products.id))
      .leftJoin(ordersMarket, eq(productPurchases.id, ordersMarket.entitlementId))
      .leftJoin(orderDeliverySnapshots, eq(ordersMarket.id, orderDeliverySnapshots.orderId))
      .where(eq(productPurchases.buyerId, session.user.id))
      .orderBy(desc(productPurchases.createdAt));
  } catch (err) {
    console.error("Inventory fetch error:", err);
  }

  return (
    <div className="space-y-10 max-w-5xl mx-auto py-6">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-r from-obsidian-900 via-obsidian-950 to-obsidian-900 p-8 sm:p-10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-emerald text-xs font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Automated Instant Delivery Center</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            My Purchased Digital Assets
          </h1>
          <p className="text-xs text-neutral-400 leading-relaxed font-normal">
            Access your acquired developer tools, immutable release snapshots, and cryptographic entitlement keys. No seller contact required.
          </p>
        </div>

        <Link
          href="/market"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 text-neutral-200 hover:text-white text-xs font-bold border border-white/[0.08] hover:border-white/[0.18] transition-all shrink-0"
        >
          <span>Marketplace</span>
          <ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>

      {/* Purchases List */}
      {purchases.length === 0 ? (
        <div className="p-16 text-center rounded-3xl border border-white/[0.06] bg-obsidian-950/60 text-neutral-400 space-y-4">
          <FolderLock className="h-10 w-10 text-neutral-600 mx-auto" />
          <div className="space-y-1">
            <h3 className="text-base font-bold text-neutral-200">No Acquired Assets Yet</h3>
            <p className="text-xs text-neutral-400 max-w-sm mx-auto">
              You have not acquired any digital tools or developer scripts with your Valax Utility Credits.
            </p>
          </div>
          <Link
            href="/market"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl badge-gold text-xs font-bold shadow-glow-gold"
          >
            Explore Digital Marketplace &rarr;
          </Link>
        </div>
      ) : (
        <MotionContainer direction="up" stagger={0.06} className="space-y-4">
          {purchases.map((p) => {
            const displayVersion = p.snapshot?.purchasedVersion || p.product.version || "1.0.0";
            const displayReleaseUrl = p.snapshot?.releaseUrl || p.product.releaseUrl || p.snapshot?.repositoryUrl || "https://github.com";
            const displayChecksum = p.snapshot?.releaseChecksum;

            return (
              <div
                key={p.id}
                className="p-6 rounded-2xl border border-white/[0.08] bg-obsidian-950/80 hover:border-white/[0.14] transition-all space-y-4 shadow-xl"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/[0.06]">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="badge-cyan text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full">
                        v{displayVersion}
                      </span>
                      <span className="badge-emerald inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="h-3 w-3" /> Fulfilled & Verified
                      </span>
                    </div>
                    <Link
                      href={`/market/${p.product.slug}`}
                      className="text-base font-bold text-white hover:text-cyan-400 transition-colors block"
                    >
                      {p.product.title}
                    </Link>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {p.product.documentationUrl && (
                      <a
                        href={p.product.documentationUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-2 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 text-neutral-300 text-xs font-semibold border border-white/[0.08] transition-colors flex items-center gap-1.5"
                      >
                        <ExternalLink className="h-3.5 w-3.5 text-neutral-400" />
                        <span>Docs</span>
                      </a>
                    )}

                    <a
                      href={displayReleaseUrl}
                      target="_blank"
                      rel="noopener noreferrer nofollow"
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-obsidian-950 text-xs font-black transition-all shadow-md flex items-center gap-2 active:scale-95"
                    >
                      <Github className="h-4 w-4" />
                      <span>Open GitHub Release</span>
                    </a>
                  </div>
                </div>

                {/* Technical Delivery Snapshot & License Key */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div className="p-3.5 rounded-xl bg-obsidian-900 border border-white/[0.04] space-y-1.5">
                    <div className="flex items-center gap-2 text-neutral-400 font-medium">
                      <Key className="h-3.5 w-3.5 text-amber-400" />
                      <span>Entitlement License Key:</span>
                    </div>
                    <code className="block px-2.5 py-1 rounded-lg bg-obsidian-950 text-amber-300 font-mono text-[11px] select-all border border-white/[0.06]">
                      {p.licenseKey}
                    </code>
                  </div>

                  <div className="p-3.5 rounded-xl bg-obsidian-900 border border-white/[0.04] space-y-1.5 font-mono text-[11px] text-neutral-400">
                    <div className="flex justify-between">
                      <span>Entitlement ID:</span>
                      <span className="text-neutral-200">{p.id}</span>
                    </div>
                    {displayChecksum && (
                      <div className="flex justify-between truncate">
                        <span>SHA-256 Digest:</span>
                        <span className="text-neutral-300 ml-2" title={displayChecksum}>
                          {displayChecksum.slice(0, 16)}...
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-[10px] text-neutral-500 pt-1">
                      <span>Acquired: {new Date(p.createdAt).toLocaleString()}</span>
                      <span className="text-amber-400 font-bold">{p.tokensSpent} Credits</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </MotionContainer>
      )}
    </div>
  );
}