"use client";

import React, { useState } from "react";
import { Coins, CreditCard, Check, AlertCircle, X, ShieldAlert } from "lucide-react";

const TIERS = [
  { credits: "100", usd: "$5.00", label: "基础体验额度" },
  { credits: "500", usd: "$20.00", label: "进阶开发者额度 (省20%)" },
  { credits: "1200", usd: "$45.00", label: "专家创作者额度 (省25%)" },
  { credits: "3000", usd: "$100.00", label: "商业大额服务 (省33%)" },
];

export function DepositModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedTier, setSelectedTier] = useState("500");
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleCreatePayPalOrder = async () => {
    setIsProcessing(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tierCredits: selectedTier }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "创建支付订单失败");
      }

      if (data.approveUrl) {
        window.location.href = data.approveUrl;
      } else {
        throw new Error("未能获取 PayPal 支付链接");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsProcessing(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold text-xs shadow-lg shadow-amber-500/20 transition-all transform active:scale-95"
      >
        <Coins className="h-4 w-4" />
        <span>充值 Utility Credits</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg p-6 sm:p-8 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                  <Coins className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">充值 Valax Utility Credits</h3>
                  <p className="text-xs text-slate-400">仅用于站内商品、服务和社区权益</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {errorMsg && (
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              {TIERS.map((t) => (
                <button
                  key={t.credits}
                  type="button"
                  onClick={() => setSelectedTier(t.credits)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    selectedTier === t.credits
                      ? "border-amber-500 bg-amber-500/10 shadow-md shadow-amber-500/10"
                      : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-lg font-black text-amber-400">{t.credits} Credits</span>
                    <span className="text-xs font-bold text-slate-200">{t.usd}</span>
                  </div>
                  <div className="mt-1 text-[11px] text-slate-400">{t.label}</div>
                </button>
              ))}
            </div>

            <div className="p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-1.5 font-bold text-slate-300">
                <ShieldAlert className="h-3.5 w-3.5 text-amber-400" />
                <span>合规提示与防沉迷声明</span>
              </div>
              <p>• 本积分不可兑换现金，不构成任何形式的投资或证券份额。</p>
              <p>• 支付经由官方 PayPal Sandbox / Live 安全网关处理，无隐形费用。</p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                取消
              </button>
              <button
                type="button"
                disabled={isProcessing}
                onClick={handleCreatePayPalOrder}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] disabled:opacity-50 text-white text-xs font-bold shadow-lg shadow-[#0070BA]/25 transition-all"
              >
                <CreditCard className="h-4 w-4" />
                {isProcessing ? "跳转 PayPal 中..." : "前往 PayPal 安全支付"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}