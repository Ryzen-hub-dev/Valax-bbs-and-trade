"use client";

import { useEffect, useState } from "react";
import { Shield, Smartphone, Laptop, Globe, LogOut, CheckCircle2, AlertTriangle, RefreshCw, KeyRound, Radio } from "lucide-react";
import { MotionContainer } from "@/components/animations/MotionContainer";

interface SessionInfo {
  publicSessionId: string;
  userAgent: string;
  maskedIp: string;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
}

export default function SecurityDashboardPage() {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchSessions = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/auth/sessions");
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
      } else {
        setMessage({ type: "error", text: "Failed to load active sessions. Please re-login." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error loading sessions." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleRevokeSession = async (publicSessionId: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicSessionId }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "Session revoked successfully." });
        fetchSessions();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to revoke session." });
      }
    } catch {
      setMessage({ type: "error", text: "Failed to communicate with server." });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRevokeOthers = async () => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ revokeOthers: true }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({ type: "success", text: "All other sessions have been logged out." });
        fetchSessions();
      } else {
        setMessage({ type: "error", text: data.error || "Failed to revoke other sessions." });
      }
    } catch {
      setMessage({ type: "error", text: "Network error occurred." });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl py-6 space-y-8">
      {/* Header Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-r from-obsidian-900 via-obsidian-950 to-obsidian-900 p-8 sm:p-10 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-cyan text-xs font-semibold">
            <Shield className="h-3.5 w-3.5" />
            <span>Cryptographic Session Isolation</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            Security & Active Sessions
          </h1>
          <p className="text-xs text-neutral-400 leading-relaxed">
            Inspect active login sessions across devices. Revoke unrecognized access instantly with zero token exposure.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="px-3.5 py-2 text-xs font-semibold bg-obsidian-850 border border-white/[0.08] text-neutral-300 rounded-xl hover:border-white/[0.16] hover:text-white transition flex items-center gap-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleRevokeOthers}
            disabled={actionLoading || sessions.length <= 1}
            className="px-4 py-2 text-xs font-bold bg-red-950/60 border border-red-800/60 text-red-300 rounded-xl hover:bg-red-900/60 transition flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log Out Other Devices
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-2xl border flex items-center gap-3 text-xs ${
            message.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
              : "bg-red-950/40 border-red-800/60 text-red-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="p-16 text-center text-neutral-400 glass-card rounded-2xl space-y-3">
          <RefreshCw className="w-6 h-6 animate-spin mx-auto text-amber-400" />
          <p className="text-xs">Loading active cryptographic sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-16 text-center text-neutral-400 glass-card rounded-2xl">
          <p className="text-xs">No active sessions found.</p>
        </div>
      ) : (
        <MotionContainer direction="up" stagger={0.06} className="space-y-4">
          {sessions.map((sess) => {
            const isMobile = /mobile|android|iphone|ipad/i.test(sess.userAgent);
            return (
              <div
                key={sess.publicSessionId}
                className={`p-6 rounded-2xl glass-card transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-5 ${
                  sess.isCurrent
                    ? "border-amber-500/40 bg-amber-500/[0.03] shadow-glow-gold"
                    : "hover:border-white/[0.14]"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-2xl flex items-center justify-center ${
                      sess.isCurrent ? "bg-amber-500/10 text-amber-400 border border-amber-500/30" : "bg-obsidian-800 text-neutral-400 border border-white/[0.06]"
                    }`}
                  >
                    {isMobile ? <Smartphone className="w-5 h-5" /> : <Laptop className="w-5 h-5" />}
                  </div>

                  <div className="space-y-1.5 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-white text-sm">
                        {isMobile ? "Mobile Device" : "Desktop Browser"}
                      </span>
                      {sess.isCurrent && (
                        <span className="badge-emerald inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          <Radio className="w-2.5 h-2.5 animate-pulse text-emerald-400" />
                          Current Session
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-400 max-w-md line-clamp-1 font-normal" title={sess.userAgent}>
                      {sess.userAgent}
                    </p>

                    <div className="flex flex-wrap items-center gap-4 text-[11px] text-neutral-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Globe className="w-3 h-3 text-cyan-400" />
                        {sess.maskedIp}
                      </span>
                      <span>•</span>
                      <span className="flex items-center gap-1 font-mono text-[10px] text-neutral-400">
                        <KeyRound className="w-3 h-3 text-amber-500" />
                        {sess.publicSessionId.slice(0, 16)}...
                      </span>
                      <span>•</span>
                      <span>Signed in: {new Date(sess.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(sess.publicSessionId)}
                    disabled={actionLoading}
                    className="px-3.5 py-1.5 text-xs font-bold text-red-400 border border-red-900/50 hover:bg-red-950/60 hover:border-red-700 rounded-xl transition self-start sm:self-center"
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </MotionContainer>
      )}
    </div>
  );
}