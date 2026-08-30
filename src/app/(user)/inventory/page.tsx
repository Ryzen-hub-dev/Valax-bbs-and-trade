import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/db";
import { productPurchases, products } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { FolderLock, Download, Copy, Key, ExternalLink, ShieldCheck } from "lucide-react";
import { FadeIn } from "@/components/animations/gsap-wrapper";

export const dynamic = "force-dynamic";

export default async function InventoryPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const purchases = await db
    .select({
      id: productPurchases.id,
      licenseKey: productPurchases.licenseKey,
      tokensSpent: productPurchases.tokensSpent,
      createdAt: productPurchases.createdAt,
      status: productPurchases.status,
      product: {
        title: products.title,
        slug: products.slug,
        version: products.version,
        githubReleaseUrl: products.githubReleaseUrl,
        documentationUrl: products.documentationUrl,
      },
    })
    .from(productPurchases)
    .innerJoin(products, eq(productPurchases.productId, products.id))
    .where(eq(productPurchases.buyerId, session.user.id))
    .orderBy(desc(productPurchases.createdAt));

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <FolderLock className="h-6 w-6 text-blue-400" />
          <span>My Purchased Assets & Licenses</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Manage your acquired developer licenses, view unique keys, and access verified GitHub download links.
        </p>
      </div>

      {purchases.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-slate-800 bg-slate-900/40 space-y-4">
          <FolderLock className="h-12 w-12 text-slate-600 mx-auto" />
          <p className="text-sm text-slate-400">You haven&apos;t purchased any digital items yet.</p>
          <Link
            href="/market"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg shadow-blue-600/20 transition-all"
          >
            Explore Digital Marketplace &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {purchases.map((p) => (
            <FadeIn
              key={p.id}
              className="p-6 rounded-2xl border border-slate-800 bg-slate-900/50 flex flex-col md:flex-row md:items-center justify-between gap-6"
            >
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-blue-950/80 text-blue-400 text-xs font-mono font-semibold border border-blue-800/40">
                    v{p.product.version}
                  </span>
                  <Link
                    href={`/market/${p.product.slug}`}
                    className="text-base font-bold text-white hover:text-blue-400 transition-colors"
                  >
                    {p.product.title}
                  </Link>
                </div>

                <div className="flex items-center gap-2">
                  <Key className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span className="text-xs text-slate-400 font-medium">License:</span>
                  <code className="px-2 py-0.5 rounded bg-slate-950 text-slate-200 text-xs font-mono select-all border border-slate-800">
                    {p.licenseKey}
                  </code>
                </div>

                <div className="text-[11px] text-slate-500">
                  Purchased on {new Date(p.createdAt).toLocaleDateString("en-US")} for {p.tokensSpent} Credits
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                {p.product.documentationUrl && (
                  <a
                    href={p.product.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <ExternalLink className="h-3.5 w-3.5" />
                    Docs
                  </a>
                )}
                <a
                  href={p.product.githubReleaseUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all shadow-md flex items-center gap-1.5"
                >
                  <Download className="h-3.5 w-3.5" />
                  GitHub Release
                </a>
              </div>
            </FadeIn>
          ))}
        </div>
      )}
    </div>
  );
}