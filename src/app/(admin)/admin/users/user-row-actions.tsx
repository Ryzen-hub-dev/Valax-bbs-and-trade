"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Ban, VolumeX, LogOut, Check } from "lucide-react";

export function UserRowActions({
  user,
}: {
  user: {
    id: string;
    username: string;
    role: string;
    isBanned: boolean;
    isMuted: boolean;
  };
}) {
  const router = useRouter();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleAction = async (action: string, extra?: any) => {
    if (!confirm(`确定执行操作 [${action}] 对用户 ${user.username} 吗？`)) return;

    setIsProcessing(true);
    try {
      await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetUserId: user.id,
          action,
          ...extra,
        }),
      });
      router.refresh();
    } catch {} finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5">
      {user.isBanned ? (
        <button
          disabled={isProcessing}
          onClick={() => handleAction("unban")}
          className="px-2.5 py-1 rounded bg-emerald-950/60 text-emerald-400 border border-emerald-700/50 text-[11px] font-semibold hover:bg-emerald-900/60"
        >
          解封
        </button>
      ) : (
        <button
          disabled={isProcessing}
          onClick={() => handleAction("ban", { reason: "Admin Disciplinary Ban" })}
          className="px-2.5 py-1 rounded bg-red-950/60 text-red-400 border border-red-700/50 text-[11px] font-semibold hover:bg-red-900/60"
        >
          封禁
        </button>
      )}

      {user.isMuted ? (
        <button
          disabled={isProcessing}
          onClick={() => handleAction("unmute")}
          className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[11px] hover:bg-slate-700"
        >
          解禁言
        </button>
      ) : (
        <button
          disabled={isProcessing}
          onClick={() => handleAction("mute")}
          className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 text-[11px] hover:bg-slate-700"
        >
          禁言
        </button>
      )}

      <button
        disabled={isProcessing}
        onClick={() => handleAction("revoke_sessions")}
        className="px-2.5 py-1 rounded bg-slate-800 text-slate-400 hover:text-amber-400 text-[11px]"
        title="强制注销全部活跃会话"
      >
        注销会话
      </button>
    </div>
  );
}