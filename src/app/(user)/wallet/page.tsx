import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { getUserWallet } from "@/lib/ledger";
import { db } from "@/db";
import { walletLedger } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Wallet, Coins, PlusCircle, ArrowUpRight, ArrowDownLeft, ShieldCheck, History } from "lucide-react";
import { FadeIn } from "@/components/animations/gsap-wrapper";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");

  const account = await getUserWallet(session.user.id);

  const transactions = await db
    .select()
    .from(walletLedger)
    .where(eq(walletLedger.userId, session.user.id))
    .orderBy(desc(walletLedger.createdAt))
    .limit(20);

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-white flex items-center gap-2">
          <Wallet className="h-6 w-6 text-amber-400" />
          <span>Utility Credit Wallet & Ledger</span>
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Double-entry immutable ledger tracking your in-platform credits for digital assets and marketplace transactions.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <FadeIn className="p-6 rounded-2xl border border-amber-500/30 bg-gradient-to-br from-amber-950/20 to-slate-900/60 shadow-xl space-y-4 md:col-span-2">
          <span className="text-xs font-semibold text-amber-400/90 uppercase tracking-wider">Available Balance</span>
          <div className="flex items-baseline gap-3">
            <span className="text-4xl sm:text-5xl font-black text-white">{account?.balance ?? 0}</span>
            <span className="text-amber-400 font-bold text-base">Utility Credits</span>
          </div>

          <div className="flex items-center gap-4 pt-2">
            <Link
              href="/wallet?deposit=true"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all"
            >
              <PlusCircle className="h-4 w-4" />
              Deposit with PayPal
            </Link>
            <Link
              href="/market"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              Spend in Market &rarr;
            </Link>
          </div>
        </FadeIn>

        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-3">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Dual-Ledger Audit</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Every transaction is recorded with an immutable idempotency key and cryptographic hash entry on Turso LibSQL.
          </p>
          <div className="pt-2 text-[10px] text-slate-500 font-mono">
            Status: ACTIVE
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <History className="h-5 w-5 text-blue-400" />
          <span>Ledger Transaction History</span>
        </h2>

        {transactions.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
            No transaction records found.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="p-4">Type / Action</th>
                  <th className="p-4">Amount</th>
                  <th className="p-4">Balance After</th>
                  <th className="p-4">Reference Notes</th>
                  <th className="p-4">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-900/80 transition-colors">
                    <td className="p-4 font-semibold text-slate-200">
                      <span className="capitalize">{tx.type.replace(/_/g, " ")}</span>
                    </td>
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
                    <td className="p-4 text-slate-300 max-w-xs truncate">{tx.notes || "-"}</td>
                    <td className="p-4 text-slate-500">{new Date(tx.createdAt).toLocaleString("en-US")}</td>
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