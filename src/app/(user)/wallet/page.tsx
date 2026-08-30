import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserWallet } from "@/lib/ledger";
import { db } from "@/db";
import { walletLedger } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Coins, ArrowUpRight, ArrowDownLeft, ShieldCheck, Clock, FileText } from "lucide-react";
import { FadeIn } from "@/components/animations/gsap-wrapper";
import { DepositModal } from "./deposit-modal";

export default async function WalletPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const wallet = await getUserWallet(session.user.id);

  const transactions = await db
    .select()
    .from(walletLedger)
    .where(eq(walletLedger.userId, session.user.id))
    .orderBy(desc(walletLedger.createdAt))
    .limit(50);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Overview Cards */}
      <FadeIn className="p-6 sm:p-8 rounded-2xl border border-slate-800 bg-gradient-to-r from-slate-900 via-slate-900/90 to-amber-950/30 flex flex-col md:flex-row md:items-center md:justify-between gap-6 shadow-xl">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-400">
            <Coins className="h-4 w-4" />
            <span>Valax Utility Credits (站内双重账本)</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl sm:text-5xl font-black text-white">{wallet.balance}</span>
            <span className="text-base font-semibold text-slate-400">Credits 可用额度</span>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            用于兑换数字商品、下载经过验证的开发脚本、赞赏社区贡献者或购买定制服务。
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-3">
          <DepositModal />
        </div>
      </FadeIn>

      {/* Immutable Ledger Table */}
      <div className="space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <FileText className="h-5 w-5 text-amber-400" />
              <span>不可篡改交易双重账本 (Ledger Journal)</span>
            </h2>
            <p className="text-xs text-slate-500">每笔记录均包含事前/事后余额、幂等流水号与完整审计跟踪</p>
          </div>
          <span className="text-xs text-slate-400">{transactions.length} 条记录</span>
        </div>

        {transactions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/30 text-slate-400 text-sm">
            暂无账本变动流水记录。
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 shadow-lg">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
                <tr>
                  <th className="p-3.5">类型 / 来源</th>
                  <th className="p-3.5">变动额度</th>
                  <th className="p-3.5">变动前余额</th>
                  <th className="p-3.5">变动后余额</th>
                  <th className="p-3.5">幂等流水键 (Idempotency Key)</th>
                  <th className="p-3.5">时间</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {transactions.map((t) => {
                  const isPositive = t.amount >= 0;
                  return (
                    <tr key={t.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-3.5 font-sans font-medium text-slate-200">
                        <div className="flex items-center gap-2">
                          {isPositive ? (
                            <ArrowDownLeft className="h-4 w-4 text-emerald-400 shrink-0" />
                          ) : (
                            <ArrowUpRight className="h-4 w-4 text-red-400 shrink-0" />
                          )}
                          <div>
                            <div>{t.source}</div>
                            {t.notes && <div className="text-[10px] text-slate-500 font-normal">{t.notes}</div>}
                          </div>
                        </div>
                      </td>
                      <td className={`p-3.5 font-bold ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                        {isPositive ? `+${t.amount}` : t.amount}
                      </td>
                      <td className="p-3.5 text-slate-400">{t.balanceBefore}</td>
                      <td className="p-3.5 text-slate-200 font-bold">{t.balanceAfter}</td>
                      <td className="p-3.5 text-[10px] text-slate-500 truncate max-w-xs">{t.idempotencyKey}</td>
                      <td className="p-3.5 font-sans text-slate-500 whitespace-nowrap">
                        {new Date(t.createdAt).toLocaleString("zh-CN")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}