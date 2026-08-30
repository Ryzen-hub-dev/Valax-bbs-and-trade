"use client";

import React, { useState } from "react";
import { Coins, ShieldCheck, X, Check, ArrowRight } from "lucide-react";

const PACKAGES = [
  { credits: 100, usd: "10.00", label: "Starter Pack" },
  { credits: 500, usd: "45.00", label: "Developer Pack (10% Bonus)" },
  { credits: 1200, usd: "100.00", label: "Pro Ecosystem Pack (20% Bonus)" },
];

export function DepositModal({ isOpen, onClose }: { isOpen: boolean; onClose: boolean | (() => void) }) {
  const [selectedPack, setSelectedPack] = useState(PACKAGES[0]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!isOpen) return null;

  const handleClose = () => {
    if (typeof onClose === "function") onClose();
  };

  const handleCreatePayPalOrder = async () => {
    setIsLoading(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/paypal/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountUsd: selectedPack.usd,
          creditsAmount: selectedPack.credits,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create checkout order");
      }

      if (data.approvalUrl) {
        window.location.href = data.approvalUrl;
      } else {
        throw new Error("No PayPal approval link returned.");
      }
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg rounded-3xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-2xl space-y-6 relative">
        <button
          onClick={handleClose}
          className="absolute right-5 top-5 text-slate-400 hover:text-white"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="space-y-1">
          <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
            <Coins className="h-4 w-4" />
            <span>Valax Utility Credits</span>
          </div>
          <h2 className="text-xl font-bold text-white">Deposit Utility Credits via PayPal</h2>
          <p className="text-xs text-slate-400">
            Acquire non-financial platform credits for purchasing scripts and marketplace assets.
          </p>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
            {errorMsg}
          </div>
        )}

        <div className="space-y-3">
          {PACKAGES.map((pkg) => (
            <div
              key={pkg.credits}
              onClick={() => setSelectedPack(pkg)}
              className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                selectedPack.credits === pkg.credits
                  ? "border-amber-500/80 bg-amber-500/10 shadow-md shadow-amber-500/10"
                  : "border-slate-800 bg-slate-950 hover:border-slate-700"
              }`}
            >
              <div className="space-y-1">
                <div className="text-sm font-bold text-white">{pkg.label}</div>
                <div className="flex items-center gap-1.5 text-xs text-amber-400 font-semibold">
                  <Coins className="h-3.5 w-3.5" />
                  <span>+{pkg.credits} Credits</span>
                </div>
              </div>
              <div className="text-right">
                <div className="text-base font-black text-slate-100">${pkg.usd} USD</div>
                <span className="text-[10px] text-slate-500">Instant Fulfillment</span>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center gap-1 text-slate-300 font-semibold">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Compliance Disclaimer</span>
          </div>
          <p>
            Valax Credits are strictly consumable non-refundable utility points solely for digital services within the Valax Scrub platform. Credits cannot be withdrawn or redeemed for fiat currency.
          </p>
        </div>

        <button
          onClick={handleCreatePayPalOrder}
          disabled={isLoading}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-[#0070BA] hover:bg-[#005ea6] disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-blue-500/20 transition-all"
        >
          <span>{isLoading ? "Redirecting to PayPal..." : `Pay $${selectedPack.usd} with PayPal`}</span>
          <ArrowRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}