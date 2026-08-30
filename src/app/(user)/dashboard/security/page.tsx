"use client";

import { useEffect, useState } from "react";
import { Shield, Smartphone, Laptop, Globe, LogOut, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

interface SessionInfo {
  id: string;
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

  const handleRevokeSession = async (sessionId: string) => {
    setActionLoading(true);
    setMessage(null);
    try {
      const res = await fetch("/api/auth/sessions", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
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
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <Shield className="w-8 h-8 text-primary" />
            Security & Active Sessions
          </h1>
          <p className="text-neutral-400 mt-1 text-sm">
            Inspect active login sessions across your devices and revoke untrusted access.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchSessions}
            disabled={loading}
            className="px-3 py-2 text-sm bg-neutral-900 border border-neutral-800 text-neutral-300 rounded-lg hover:border-neutral-700 hover:text-white transition flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={handleRevokeOthers}
            disabled={actionLoading || sessions.length <= 1}
            className="px-4 py-2 text-sm bg-red-950/40 border border-red-800/60 text-red-300 rounded-lg hover:bg-red-900/50 hover:border-red-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <LogOut className="w-4 h-4" />
            Log Out Other Devices
          </button>
        </div>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl border mb-6 flex items-center gap-3 text-sm ${
            message.type === "success"
              ? "bg-emerald-950/40 border-emerald-800/60 text-emerald-300"
              : "bg-red-950/40 border-red-800/60 text-red-300"
          }`}
        >
          {message.type === "success" ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0 text-red-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-neutral-500 bg-neutral-900/30 border border-neutral-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-3 text-primary" />
          <p>Loading active sessions...</p>
        </div>
      ) : sessions.length === 0 ? (
        <div className="p-12 text-center text-neutral-400 bg-neutral-900/30 border border-neutral-800 rounded-2xl">
          <p>No active sessions found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sessions.map((sess) => {
            const isMobile = /mobile|android|iphone|ipad/i.test(sess.userAgent);
            return (
              <div
                key={sess.id}
                className={`p-5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  sess.isCurrent
                    ? "bg-primary/5 border-primary/40 shadow-sm shadow-primary/5"
                    : "bg-neutral-900/40 border-neutral-800 hover:border-neutral-700"
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl ${
                      sess.isCurrent ? "bg-primary/20 text-primary" : "bg-neutral-800 text-neutral-400"
                    }`}
                  >
                    {isMobile ? <Smartphone className="w-6 h-6" /> : <Laptop className="w-6 h-6" />}
                  </div>

                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-white text-base">
                        {isMobile ? "Mobile Device" : "Desktop Browser"}
                      </span>
                      {sess.isCurrent && (
                        <span className="px-2.5 py-0.5 text-xs font-semibold rounded-full bg-emerald-950 border border-emerald-800 text-emerald-400">
                          Current Device
                        </span>
                      )}
                    </div>

                    <p className="text-xs text-neutral-400 mt-1 max-w-md line-clamp-1" title={sess.userAgent}>
                      {sess.userAgent}
                    </p>

                    <div className="flex items-center gap-4 text-xs text-neutral-500 mt-2">
                      <span className="flex items-center gap-1.5">
                        <Globe className="w-3.5 h-3.5" />
                        {sess.maskedIp}
                      </span>
                      <span>• Signed in: {new Date(sess.createdAt).toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {!sess.isCurrent && (
                  <button
                    onClick={() => handleRevokeSession(sess.id)}
                    disabled={actionLoading}
                    className="px-3 py-1.5 text-xs text-red-400 border border-red-900/50 hover:bg-red-950/50 hover:border-red-700 rounded-lg transition self-start sm:self-center"
                  >
                    Revoke
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}