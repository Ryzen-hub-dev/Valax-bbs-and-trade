"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Ban, VolumeX, KeyRound, Check } from "lucide-react";

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
  const [isLoading, setIsLoading] = useState(false);

  const handleAction = async (action: string) => {
    if (!confirm(`Are you sure you want to perform "${action}" on user "${user.username}"?`)) return;

    setIsLoading(true);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, action }),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Action failed");
      }

      router.refresh();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-1.5 justify-end">
      {user.isBanned ? (
        <button
          onClick={() => handleAction("unban")}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 hover:bg-emerald-900 transition-colors text-[11px] font-semibold"
        >
          Unban
        </button>
      ) : (
        <button
          onClick={() => handleAction("ban")}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-red-950 border border-red-700 text-red-300 hover:bg-red-900 transition-colors text-[11px] font-semibold flex items-center gap-1"
        >
          <Ban className="h-3 w-3" />
          Ban
        </button>
      )}

      {user.isMuted ? (
        <button
          onClick={() => handleAction("unmute")}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors text-[11px]"
        >
          Unmute
        </button>
      ) : (
        <button
          onClick={() => handleAction("mute")}
          disabled={isLoading}
          className="px-2.5 py-1 rounded bg-amber-950/80 border border-amber-700/60 text-amber-300 hover:bg-amber-900/60 transition-colors text-[11px] flex items-center gap-1"
        >
          <VolumeX className="h-3 w-3" />
          Mute
        </button>
      )}

      <button
        onClick={() => handleAction("revoke_sessions")}
        disabled={isLoading}
        className="px-2.5 py-1 rounded bg-purple-950/80 border border-purple-700/60 text-purple-300 hover:bg-purple-900/60 transition-colors text-[11px] flex items-center gap-1"
        title="Revoke all active sessions immediately"
      >
        <KeyRound className="h-3 w-3" />
        Kick
      </button>
    </div>
  );
}