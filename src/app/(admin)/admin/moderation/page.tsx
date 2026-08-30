import { db } from "@/db";
import { reports, products, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { AlertTriangle, ShoppingBag, ShieldCheck } from "lucide-react";
import { ModRowActions } from "./mod-row-actions";

export default async function AdminModerationPage() {
  const pendingReportsList = await db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      details: reports.details,
      status: reports.status,
      createdAt: reports.createdAt,
      reporter: { username: users.username },
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .where(eq(reports.status, "pending"))
    .orderBy(desc(reports.createdAt))
    .limit(50);

  const pendingProducts = await db
    .select({
      id: products.id,
      title: products.title,
      category: products.category,
      tokenPrice: products.tokenPrice,
      githubReleaseUrl: products.githubReleaseUrl,
      createdAt: products.createdAt,
      developer: { username: users.username },
    })
    .from(products)
    .innerJoin(users, eq(products.developerId, users.id))
    .where(eq(products.moderationStatus, "pending"))
    .orderBy(desc(products.createdAt))
    .limit(20);

  return (
    <div className="space-y-8">
      {/* Reports Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-400" />
            <span>待处理违规举报队列 ({pendingReportsList.length})</span>
          </h2>
        </div>

        {pendingReportsList.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
            暂无未处理举报。
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">举报人</th>
                  <th className="p-3.5">违规对象</th>
                  <th className="p-3.5">举报理由</th>
                  <th className="p-3.5">时间</th>
                  <th className="p-3.5 text-right">审核操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {pendingReportsList.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-sans font-semibold text-slate-200">{r.reporter.username}</td>
                    <td className="p-3.5 text-purple-300">{r.targetType} #{r.targetId}</td>
                    <td className="p-3.5 text-amber-400 font-sans">{r.reason}</td>
                    <td className="p-3.5 font-sans text-slate-500">{new Date(r.createdAt).toLocaleString("zh-CN")}</td>
                    <td className="p-3.5 text-right font-sans">
                      <ModRowActions type="resolve_report" targetId={r.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Product Review Queue */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <ShoppingBag className="h-5 w-5 text-emerald-400" />
            <span>待上架商品审核队列 ({pendingProducts.length})</span>
          </h2>
        </div>

        {pendingProducts.length === 0 ? (
          <div className="p-8 text-center rounded-2xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
            暂无待审核商品。
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">商品名称</th>
                  <th className="p-3.5">创作者</th>
                  <th className="p-3.5">价格</th>
                  <th className="p-3.5">外部 Release 交付链接</th>
                  <th className="p-3.5 text-right">审核操作</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-white">{p.title}</td>
                    <td className="p-3.5 text-slate-300">{p.developer.username}</td>
                    <td className="p-3.5 text-amber-400 font-bold">{p.tokenPrice} Credits</td>
                    <td className="p-3.5 text-blue-400 font-mono text-[11px] truncate max-w-xs">{p.githubReleaseUrl}</td>
                    <td className="p-3.5 text-right space-x-2">
                      <ModRowActions type="approve_product" targetId={p.id} />
                      <ModRowActions type="reject_product" targetId={p.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}