import { db } from "@/db";
import { users, forumThreads, products, walletAccounts, auditLogs, reports } from "@/db/schema";
import { count, desc, eq, sql } from "drizzle-orm";
import { Users, MessageSquare, ShoppingBag, Coins, ShieldAlert, Clock } from "lucide-react";
import { FadeIn } from "@/components/animations/gsap-wrapper";

export default async function AdminDashboardPage() {
  const totalUsers = (await db.select({ val: count() }).from(users))[0]?.val || 0;
  const totalThreads = (await db.select({ val: count() }).from(forumThreads))[0]?.val || 0;
  const totalProducts = (await db.select({ val: count() }).from(products))[0]?.val || 0;
  const pendingReports = (await db.select({ val: count() }).from(reports).where(eq(reports.status, "pending")))[0]?.val || 0;
  
  const totalCirculation = (await db.select({ val: sql<number>`SUM(${walletAccounts.balance})` }).from(walletAccounts))[0]?.val || 0;

  const recentAudits = await db
    .select({
      id: auditLogs.id,
      action: auditLogs.action,
      targetType: auditLogs.targetType,
      targetId: auditLogs.targetId,
      details: auditLogs.details,
      createdAt: auditLogs.createdAt,
      operator: { username: users.username },
    })
    .from(auditLogs)
    .innerJoin(users, eq(auditLogs.operatorId, users.id))
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

  return (
    <div className="space-y-8">
      {/* Stats Cards */}
      <FadeIn className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>注册总用户</span>
            <Users className="h-4 w-4 text-blue-400" />
          </div>
          <div className="text-3xl font-black text-white">{totalUsers}</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>社区帖子数</span>
            <MessageSquare className="h-4 w-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-black text-white">{totalThreads}</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>市场数字商品</span>
            <ShoppingBag className="h-4 w-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black text-white">{totalProducts}</div>
        </div>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span>流通 Utility Credits</span>
            <Coins className="h-4 w-4 text-amber-400" />
          </div>
          <div className="text-3xl font-black text-amber-400">{totalCirculation}</div>
        </div>
      </FadeIn>

      {/* Pending Reports Alert */}
      {pendingReports > 0 && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-500/40 text-amber-300 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4" />
            <span>当前有 <strong>{pendingReports}</strong> 条待处理的社区违规举报！</span>
          </div>
          <a href="/admin/moderation" className="underline font-bold hover:text-white">
            立即审核 &rarr;
          </a>
        </div>
      )}

      {/* Recent Audit Logs */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Clock className="h-4 w-4 text-purple-400" />
          <span>最新管理员操作审计记录 (Audit Trail)</span>
        </h2>

        {recentAudits.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
            暂无审计记录。
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">操作员</th>
                  <th className="p-3.5">操作指令</th>
                  <th className="p-3.5">目标类型 / ID</th>
                  <th className="p-3.5">附带参数</th>
                  <th className="p-3.5">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {recentAudits.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-sans font-medium text-slate-200">{a.operator.username}</td>
                    <td className="p-3.5 text-purple-300 font-bold">{a.action}</td>
                    <td className="p-3.5 text-slate-400">{a.targetType}: {a.targetId}</td>
                    <td className="p-3.5 text-[10px] text-slate-500 max-w-xs truncate">{a.details || "-"}</td>
                    <td className="p-3.5 font-sans text-slate-500 whitespace-nowrap">
                      {new Date(a.createdAt).toLocaleString("zh-CN")}
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