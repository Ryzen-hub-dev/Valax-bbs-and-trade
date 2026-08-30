import { db } from "@/db";
import { walletLedger, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { FileText, Coins } from "lucide-react";
import { LedgerAdjustModal } from "./ledger-adjust-modal";

export default async function AdminLedgerPage() {
  const transactions = await db
    .select({
      id: walletLedger.id,
      amount: walletLedger.amount,
      balanceBefore: walletLedger.balanceBefore,
      balanceAfter: walletLedger.balanceAfter,
      type: walletLedger.type,
      source: walletLedger.source,
      idempotencyKey: walletLedger.idempotencyKey,
      notes: walletLedger.notes,
      createdAt: walletLedger.createdAt,
      user: { username: users.username },
    })
    .from(walletLedger)
    .innerJoin(users, eq(walletLedger.userId, users.id))
    .orderBy(desc(walletLedger.createdAt))
    .limit(100);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-emerald-400" />
            <span>全局不可篡改双重账本审计 (Ledger Log)</span>
          </h2>
          <p className="text-xs text-slate-400">系统内全部充值、消费、收益分成和调账的完整账目凭证</p>
        </div>
        <LedgerAdjustModal />
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="p-3.5">用户</th>
              <th className="p-3.5">交易类型 / 来源</th>
              <th className="p-3.5">变动额度</th>
              <th className="p-3.5">变动前</th>
              <th className="p-3.5">变动后</th>
              <th className="p-3.5">流水号 (Idempotency Key)</th>
              <th className="p-3.5">时间</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono">
            {transactions.map((t) => (
              <tr key={t.id} className="hover:bg-slate-800/40">
                <td className="p-3.5 font-sans font-semibold text-slate-200">{t.user.username}</td>
                <td className="p-3.5 font-sans">
                  <div>{t.source}</div>
                  {t.notes && <div className="text-[10px] text-slate-500">{t.notes}</div>}
                </td>
                <td className={`p-3.5 font-bold ${t.amount >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                  {t.amount >= 0 ? `+${t.amount}` : t.amount}
                </td>
                <td className="p-3.5 text-slate-400">{t.balanceBefore}</td>
                <td className="p-3.5 text-white font-bold">{t.balanceAfter}</td>
                <td className="p-3.5 text-[10px] text-slate-500 truncate max-w-xs">{t.idempotencyKey}</td>
                <td className="p-3.5 font-sans text-slate-500 whitespace-nowrap">
                  {new Date(t.createdAt).toLocaleString("zh-CN")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}