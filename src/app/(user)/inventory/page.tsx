import { redirect } from "next/navigation";
import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { db } from "@/db";
import { productPurchases, products, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { FolderLock, Download, Github, Key, CheckCircle, ExternalLink } from "lucide-react";
import { FadeIn, StaggerList } from "@/components/animations/gsap-wrapper";

export default async function InventoryPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const items = await db
    .select({
      id: productPurchases.id,
      tokensSpent: productPurchases.tokensSpent,
      licenseKey: productPurchases.licenseKey,
      status: productPurchases.status,
      purchasedAt: productPurchases.createdAt,
      product: {
        id: products.id,
        title: products.title,
        slug: products.slug,
        category: products.category,
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
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white flex items-center gap-2.5">
          <FolderLock className="h-7 w-7 text-violet-400" />
          <span>我的数字资产与授权</span>
        </h1>
        <p className="mt-1.5 text-xs text-slate-400">
          已购买的所有独立脚本授权、许可密钥及外部 GitHub Release 安全下载入口
        </p>
      </div>

      {items.length === 0 ? (
        <div className="p-16 text-center rounded-2xl border border-slate-800 bg-slate-900/30 text-slate-400 space-y-4">
          <p>您尚未购买任何数字资产。</p>
          <Link
            href="/market"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md transition-colors"
          >
            前往数字市场选购
          </Link>
        </div>
      ) : (
        <StaggerList className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4 shadow-xl flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-lg bg-emerald-950/80 border border-emerald-700/50 text-emerald-300 text-xs font-semibold">
                    {item.product.category}
                  </span>
                  <span className="text-xs font-mono text-slate-500">v{item.product.version}</span>
                </div>
                <Link
                  href={`/market/${item.product.slug}`}
                  className="text-lg font-bold text-white hover:text-emerald-400 transition-colors block"
                >
                  {item.product.title}
                </Link>
              </div>

              {/* License Key Box */}
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="flex items-center gap-1 font-semibold text-slate-300">
                    <Key className="h-3.5 w-3.5 text-amber-400" />
                    授权密钥 (License Key)
                  </span>
                  <span className="text-emerald-400 font-medium">有效激活</span>
                </div>
                <div className="font-mono text-xs text-slate-100 font-bold select-all break-all">
                  {item.licenseKey}
                </div>
              </div>

              {/* Download Entry */}
              <div className="pt-2 flex items-center justify-between gap-3">
                <a
                  href={item.product.githubReleaseUrl}
                  target="_blank"
                  rel="noopener noreferrer nofollow"
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-semibold text-xs transition-colors shadow-md shadow-violet-600/20"
                >
                  <Download className="h-4 w-4" />
                  GitHub Release 下载
                </a>

                {item.product.documentationUrl && (
                  <a
                    href={item.product.documentationUrl}
                    target="_blank"
                    rel="noopener noreferrer nofollow"
                    className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="查看文档"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ))}
        </StaggerList>
      )}
    </div>
  );
}