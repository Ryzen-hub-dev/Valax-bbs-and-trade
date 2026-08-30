import { db } from "@/db";
import { walletLedger, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { Database, ArrowDownLeft, ArrowUpRight } from "lucide-react";
import { LedgerAdjustModal } from "./ledger-adjust-modal";

export const dynamic = "force-dynamic";

export default async function AdminLedgerPage() {
  const transactions = await db
    .select({
      id: walletLedger.id,
      userId: walletLedger.userId,
      amount: walletLedger.amount,
      balanceAfter: walletLedger.balanceAfter,
      type: walletLedger.type,
      notes: walletLedger.notes,
      createdAt: walletLedger.createdAt,
      user: { username: users.username },
    })
    .from(walletLedger)
    .innerJoin(users, eq(walletLedger.userId, users.id))
    .orderBy(desc(walletLedger.createdAt))
    .limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="h-5 w-5 text-purple-400" />
            <span>Dual-Ledger Global Journal</span>
          </h2>
          <p className="text-xs text-slate-400">
            Audit every credit mutation, PayPal deposit, product purchase, creator split, and administrative adjustment.
          </p>
        </div>
        <LedgerAdjustModal />
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Type</th>
              <th className="p-4">Delta Amount</th>
              <th className="p-4">Balance After</th>
              <th className="p-4">Reference Notes</th>
              <th className="p-4">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {transactions.map((tx) => (
              <tr key={tx.id} className="hover:bg-slate-900/80 transition-colors">
                <td className="p-4 font-bold text-slate-200">{tx.user.username}</td>
                <td className="p-4 font-mono uppercase text-[11px] text-purple-300">{tx.type}</td>
                <td className="p-4 font-mono font-bold">
                  {tx.amount > 0 ? (
                    <span className="text-emerald-400 flex items-center gap-1">
                      <ArrowDownLeft className="h-3 w-3" /> +{tx.amount}
                    </span>
                  ) : (
                    <span className="text-red-400 flex items-center gap-1">
                      <ArrowUpRight className="h-3 w-3" /> {tx.amount}
                    </span>
                  )}
                </td>
                <td className="p-4 font-mono text-slate-400">{tx.balanceAfter}</td>
                <td className="p-4 text-slate-300 max-w-sm truncate">{tx.notes || "-"}</td>
                <td className="p-4 text-slate-500">{new Date(tx.createdAt).toLocaleString("en-US")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}