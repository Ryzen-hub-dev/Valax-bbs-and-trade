"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, ShieldAlert, AlertCircle, X } from "lucide-react";

export function LedgerAdjustModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [targetUserId, setTargetUserId] = useState("");
  const [amount, setAmount] = useState<number>(100);
  const [reason, setReason] = useState("");
  const [confirmationCode, setConfirmationCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleAdjust = async (e: React.FormEvent) => {
    e.preventDefault();
    if (confirmationCode !== "CONFIRM_VALAX_ADJUST") {
      setErrorMsg("请输入正确的双重确认代码: CONFIRM_VALAX_ADJUST");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/admin/ledger", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId,
          amount: Number(amount),
          reason,
          confirmationCode,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "调整失败");

      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold shadow-md transition-colors"
      >
        <Coins className="h-4 w-4" />
        <span>手动增减用户积分 (双重确认)</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <form onSubmit={handleAdjust} className="w-full max-w-md p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-white">积分手动调整与流水记录</h3>
              <button type="button" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">目标用户 ID (usr_xxx)</label>
              <input
                type="text"
                required
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
                placeholder="usr_..."
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">变动数量 (正数为增加，负数为扣除)</label>
              <input
                type="number"
                required
                value={amount}
                onChange={(e) => setAmount(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">审计调整原因</label>
              <input
                type="text"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="例如: 社区悬赏活动奖励 / 异常回滚"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs focus:outline-none"
              />
            </div>

            <div className="p-3 rounded-xl bg-purple-950/40 border border-purple-800/40 space-y-2 text-xs text-purple-300">
              <div className="flex items-center gap-1.5 font-bold">
                <ShieldAlert className="h-4 w-4 text-purple-400" />
                <span>敏感操作二次确认保护</span>
              </div>
              <p className="text-[11px] text-purple-300/80">请输入 <strong>CONFIRM_VALAX_ADJUST</strong> 确认提交：</p>
              <input
                type="text"
                required
                value={confirmationCode}
                onChange={(e) => setConfirmationCode(e.target.value)}
                placeholder="CONFIRM_VALAX_ADJUST"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-purple-700/60 text-white text-xs font-mono focus:outline-none"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 text-xs text-slate-400 hover:text-white"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-bold shadow-md"
              >
                {isSubmitting ? "写入账本中..." : "确认执行调整"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}