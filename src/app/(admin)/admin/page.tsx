import { db } from "@/db";
import { users, forumThreads, products, auditLogs, walletLedger } from "@/db/schema";
import { count, desc } from "drizzle-orm";
import { Users, MessageSquare, ShoppingBag, ShieldAlert, Activity } from "lucide-react";
import { StaggerList } from "@/components/animations/gsap-wrapper";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const usersCount = (await db.select({ value: count() }).from(users))[0]?.value ?? 0;
  const threadsCount = (await db.select({ value: count() }).from(forumThreads))[0]?.value ?? 0;
  const productsCount = (await db.select({ value: count() }).from(products))[0]?.value ?? 0;
  const ledgerCount = (await db.select({ value: count() }).from(walletLedger))[0]?.value ?? 0;

  const recentAudits = await db
    .select()
    .from(auditLogs)
    .orderBy(desc(auditLogs.createdAt))
    .limit(10);

  const stats = [
    { label: "Total Registered Users", value: usersCount, icon: Users, color: "text-blue-400" },
    { label: "BBS Forum Threads", value: threadsCount, icon: MessageSquare, color: "text-emerald-400" },
    { label: "Digital Market Products", value: productsCount, icon: ShoppingBag, color: "text-amber-400" },
    { label: "Total Ledger Transactions", value: ledgerCount, icon: ShieldAlert, color: "text-purple-400" },
  ];

  return (
    <div className="space-y-8">
      <StaggerList className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.label}
              className="p-5 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-400">{s.label}</span>
                <Icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <div className="text-2xl font-black text-white">{s.value}</div>
            </div>
          );
        })}
      </StaggerList>

      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Activity className="h-4 w-4 text-purple-400" />
          <span>Real-time Administrative Audit Logs</span>
        </h2>

        {recentAudits.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
            No administrative actions recorded yet.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="p-3.5">Action</th>
                  <th className="p-3.5">Operator ID</th>
                  <th className="p-3.5">Target</th>
                  <th className="p-3.5">Details</th>
                  <th className="p-3.5">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentAudits.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-900/80 transition-colors">
                    <td className="p-3.5 font-semibold text-purple-300 font-mono">{a.action}</td>
                    <td className="p-3.5 text-slate-400 font-mono">{a.operatorId}</td>
                    <td className="p-3.5 text-slate-300">{a.targetType}:{a.targetId}</td>
                    <td className="p-3.5 text-slate-400 font-mono truncate max-w-xs">{a.details}</td>
                    <td className="p-3.5 text-slate-500">{new Date(a.createdAt).toLocaleString("en-US")}</td>
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