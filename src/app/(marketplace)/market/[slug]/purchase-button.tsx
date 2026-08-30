"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Check, Download, ShieldCheck, AlertCircle, LogIn } from "lucide-react";
import Link from "next/link";

export function PurchaseButton({
  productId,
  tokenPrice,
  userLoggedIn,
  alreadyPurchased,
  isDeveloper,
  existingLicenseKey,
  githubReleaseUrl,
}: {
  productId: string;
  tokenPrice: number;
  userLoggedIn: boolean;
  alreadyPurchased: boolean;
  isDeveloper: boolean;
  existingLicenseKey?: string;
  githubReleaseUrl: string;
}) {
  const router = useRouter();
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [purchasedInfo, setPurchasedInfo] = useState<{
    licenseKey: string;
    githubReleaseUrl: string;
  } | null>(alreadyPurchased ? { licenseKey: existingLicenseKey || "ACTIVE", githubReleaseUrl } : null);

  if (!userLoggedIn) {
    return (
      <Link
        href="/login"
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm shadow-lg transition-all"
      >
        <LogIn className="h-4 w-4" />
        Sign in with Discord to Purchase
      </Link>
    );
  }

  if (isDeveloper) {
    return (
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-center text-xs text-slate-400">
        You are the author / developer of this item.
      </div>
    );
  }

  if (purchasedInfo) {
    return (
      <div className="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 space-y-3">
        <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
          <ShieldCheck className="h-4 w-4" />
          <span>Active License Activated!</span>
        </div>
        <div className="p-2.5 rounded-lg bg-slate-950 font-mono text-xs text-slate-200 select-all border border-slate-800 break-all">
          License Key: {purchasedInfo.licenseKey}
        </div>
        <a
          href={purchasedInfo.githubReleaseUrl}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md"
        >
          <Download className="h-4 w-4" />
          Download from Verified GitHub Release
        </a>
      </div>
    );
  }

  const handlePurchase = async () => {
    setIsPurchasing(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/market/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Purchase failed");
      }

      setPurchasedInfo({
        licenseKey: data.licenseKey,
        githubReleaseUrl: data.githubReleaseUrl,
      });
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsPurchasing(false);
    }
  };

  return (
    <div className="space-y-3">
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      <button
        onClick={handlePurchase}
        disabled={isPurchasing}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 disabled:opacity-50 text-slate-950 font-bold text-sm shadow-lg shadow-amber-500/25 transition-all transform active:scale-95"
      >
        <Coins className="h-4 w-4" />
        <span>{isPurchasing ? "Processing..." : `Purchase License with ${tokenPrice} Credits`}</span>
      </button>
      <p className="text-[11px] text-center text-slate-500 leading-tight">
        Generates an exclusive License Key with instant access to the verified GitHub Release.
      </p>
    </div>
  );
}