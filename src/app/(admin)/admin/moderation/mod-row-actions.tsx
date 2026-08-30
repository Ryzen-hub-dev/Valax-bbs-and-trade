"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, Trash2, Pin } from "lucide-react";

export function ModRowActions({
  type,
  targetId,
}: {
  type: "resolve_report" | "delete_thread" | "pin_thread" | "approve_product" | "reject_product";
  targetId: string;
}) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async () => {
    setIsProcessing(true);
    try {
      await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, targetId }),
      });
      router.refresh();
    } catch {} finally {
      setIsProcessing(false);
    }
  };

  if (type === "resolve_report") {
    return (
      <button
        disabled={isProcessing}
        onClick={handleAction}
        className="px-3 py-1 rounded-lg bg-emerald-950/60 border border-emerald-700/50 text-emerald-400 text-xs font-semibold hover:bg-emerald-900/60"
      >
        标记已处理
      </button>
    );
  }

  if (type === "approve_product") {
    return (
      <button
        disabled={isProcessing}
        onClick={handleAction}
        className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold"
      >
        批准上架
      </button>
    );
  }

  if (type === "reject_product") {
    return (
      <button
        disabled={isProcessing}
        onClick={handleAction}
        className="px-3 py-1 rounded-lg bg-red-950/60 border border-red-700/50 text-red-400 text-xs font-semibold hover:bg-red-900/60"
      >
        驳回
      </button>
    );
  }

  return (
    <button
      disabled={isProcessing}
      onClick={handleAction}
      className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-xs hover:bg-slate-700"
    >
      执行
    </button>
  );
}