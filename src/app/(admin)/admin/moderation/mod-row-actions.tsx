"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X, ShieldAlert } from "lucide-react";

export function ModerationRowActions({
  reportId,
  productId,
}: {
  reportId?: string;
  productId?: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleReportAction = async (action: "dismiss" | "delete_content") => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "report", reportId, action }),
      });
      if (!res.ok) throw new Error("Action failed");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProductAction = async (action: "approve" | "reject") => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/moderation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "product", productId, action }),
      });
      if (!res.ok) throw new Error("Action failed");
      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (reportId) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => handleReportAction("dismiss")}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs"
        >
          Dismiss
        </button>
        <button
          onClick={() => handleReportAction("delete_content")}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-red-950 border border-red-700 text-red-300 hover:bg-red-900 text-xs font-semibold"
        >
          Delete Target
        </button>
      </div>
    );
  }

  if (productId) {
    return (
      <div className="flex items-center gap-2 justify-end">
        <button
          onClick={() => handleProductAction("approve")}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 hover:bg-emerald-900 text-xs font-semibold flex items-center gap-1"
        >
          <Check className="h-3 w-3" />
          Approve
        </button>
        <button
          onClick={() => handleProductAction("reject")}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-red-950 border border-red-700 text-red-300 hover:bg-red-900 text-xs font-semibold flex items-center gap-1"
        >
          <X className="h-3 w-3" />
          Reject
        </button>
      </div>
    );
  }

  return null;
}