"use client";

import React, { useState } from "react";
import { MessageSquare, ShoppingBag, ShieldCheck, Coins, KeyRound, CheckCircle2, Github, Terminal, Copy, Check, ExternalLink, Activity } from "lucide-react";

export function ProductPreviewShowcase() {
  const [activeTab, setActiveTab] = useState<"forum" | "market" | "security" | "ledger">("forum");
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-obsidian-900/70 backdrop-blur-xl p-6 sm:p-10 shadow-2xl space-y-8">
      {/* Tab Navigation */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-white/[0.06]">
        <div className="space-y-1">
          <span className="badge-gold text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
            Interactive Product Preview
          </span>
          <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white">
            Engineered for Precision & Trust
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 p-1 rounded-2xl bg-obsidian-950 border border-white/[0.08]">
          <button
            onClick={() => setActiveTab("forum")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "forum"
                ? "bg-amber-500 text-obsidian-950 shadow-glow-gold"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <MessageSquare className="h-3.5 w-3.5" />
            <span>BBS Forum</span>
          </button>
          <button
            onClick={() => setActiveTab("market")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "market"
                ? "bg-cyan-500 text-obsidian-950 shadow-glow-cyan"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            <span>Marketplace</span>
          </button>
          <button
            onClick={() => setActiveTab("security")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "security"
                ? "bg-emerald-500 text-obsidian-950"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <KeyRound className="h-3.5 w-3.5" />
            <span>Security Center</span>
          </button>
          <button
            onClick={() => setActiveTab("ledger")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "ledger"
                ? "bg-purple-500 text-white"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            <Coins className="h-3.5 w-3.5" />
            <span>Utility Ledger</span>
          </button>
        </div>
      </div>

      {/* Tab 1: BBS Forum Interactive Mockup */}
      {activeTab === "forum" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-white/[0.06] bg-obsidian-950/80 p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/[0.04]">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-amber-500 to-amber-700 flex items-center justify-center text-obsidian-950 font-bold text-xs">
                  VX
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">Valax Core Engineer</span>
                    <span className="badge-gold text-[10px] px-2 py-0.5 rounded-full font-bold">Admin</span>
                  </div>
                  <span className="text-[11px] text-neutral-400">Published in #Technical-Architecture • 2 hours ago</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="badge-emerald inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="h-3 w-3" /> Resolved RFC
                </span>
              </div>
            </div>

            <h4 className="text-base sm:text-lg font-bold text-white tracking-tight">
              RFC-008: Formal Double-Entry Invariants & Cryptographic Idempotency Keys
            </h4>

            <p className="text-xs text-neutral-300 leading-relaxed font-normal">
              To guarantee zero duplicate deductions during concurrent network retries, all state transitions must be executed within LibSQL atomic transactions bound by composite unique constraints.
            </p>

            {/* Code snippet with copy button */}
            <div className="rounded-xl border border-white/[0.06] bg-obsidian-900 p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-400 text-[11px] pb-2 border-b border-white/[0.04]">
                <span className="flex items-center gap-1.5 text-amber-400">
                  <Terminal className="h-3 w-3" /> ledger_state_machine.ts
                </span>
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1 text-neutral-400 hover:text-white transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="text-neutral-300 text-[11px] overflow-x-auto">
{`const tx = await client.transaction("write");
await tx.execute("UPDATE wallet_accounts SET balance = balance - ? WHERE user_id = ? AND balance >= ?;", [price, buyerId, price]);
await tx.execute("INSERT INTO product_purchases (id, buyer_id, product_id, idempotency_key) VALUES (?, ?, ?, ?);", [entId, buyerId, prodId, key]);
await tx.commit();`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Marketplace Interactive Mockup */}
      {activeTab === "market" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 rounded-2xl border border-cyan-500/30 bg-obsidian-950/80 space-y-4 shadow-glow-cyan">
              <div className="flex items-center justify-between">
                <span className="badge-cyan text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Tools
                </span>
                <span className="badge-emerald inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Github className="h-3 w-3" /> Verified Release
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Valax Automation CLI Toolset</h4>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                  High-performance command line utilities for workflow automation and release packaging.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/[0.04] text-[11px] text-neutral-400 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Version:</span> <span className="text-neutral-200">v2.4.0</span>
                </div>
                <div className="flex justify-between">
                  <span>External Release:</span> <span className="text-cyan-400">github.com/valax/cli/v2.4</span>
                </div>
                <div className="flex justify-between">
                  <span>SHA-256 Digest:</span> <span className="text-neutral-400">e3b0c44298fc1c14...</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 badge-gold px-3 py-1.5 rounded-xl text-xs font-black">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span>150</span>
                  <span className="text-[10px] font-normal opacity-80">Credits</span>
                </div>
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> 100% External Safe
                </span>
              </div>
            </div>

            <div className="p-6 rounded-2xl border border-white/[0.06] bg-obsidian-950/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="badge-gold text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                  Templates
                </span>
                <span className="badge-emerald inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  <Github className="h-3 w-3" /> Verified Release
                </span>
              </div>

              <div>
                <h4 className="text-base font-bold text-white">Obsidian Dark UI Component Kit</h4>
                <p className="text-xs text-neutral-400 mt-1 line-clamp-2">
                  Modern Tailwind and React design system tailored for high-density developer dashboards.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/[0.04] text-[11px] text-neutral-400 space-y-1 font-mono">
                <div className="flex justify-between">
                  <span>Version:</span> <span className="text-neutral-200">v1.2.0</span>
                </div>
                <div className="flex justify-between">
                  <span>External Release:</span> <span className="text-cyan-400">github.com/valax/ui-kit</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Mode:</span> <span className="text-neutral-200">GitHub Release Tag</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="flex items-center gap-1.5 badge-gold px-3 py-1.5 rounded-xl text-xs font-black">
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span>200</span>
                  <span className="text-[10px] font-normal opacity-80">Credits</span>
                </div>
                <span className="text-xs text-neutral-400 font-medium">Instant Entitlement</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 3: Security Dashboard Interactive Mockup */}
      {activeTab === "security" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-emerald-500/30 bg-obsidian-950/80 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                <span>Active Multi-Device Cryptographic Sessions</span>
              </div>
              <span className="text-[11px] text-emerald-400 font-mono">2 Connected Devices</span>
            </div>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-obsidian-900 border border-amber-500/30 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-white">macOS • Chrome 128.0</span>
                      <span className="badge-emerald text-[9px] px-2 py-0.2 rounded-full font-bold">Current Session</span>
                    </div>
                    <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                      ID: psess_7093ae37... • IP: 198.51.***.***
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-emerald-400 font-semibold">Active Now</span>
              </div>

              <div className="p-4 rounded-xl bg-obsidian-900 border border-white/[0.04] flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg bg-obsidian-800 border border-white/[0.06] flex items-center justify-center text-neutral-400">
                    <KeyRound className="h-4 w-4" />
                  </div>
                  <div>
                    <span className="text-xs font-bold text-neutral-300">iOS • Mobile Safari 17.5</span>
                    <div className="text-[10px] text-neutral-400 font-mono mt-0.5">
                      ID: psess_994e2a4e... • IP: 203.0.***.***
                    </div>
                  </div>
                </div>
                <span className="text-[10px] text-neutral-400">Signed in 1 day ago</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab 4: Utility Ledger Interactive Mockup */}
      {activeTab === "ledger" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="rounded-2xl border border-purple-500/30 bg-obsidian-950/80 p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2 text-xs font-bold text-white">
                <Activity className="h-4 w-4 text-purple-400" />
                <span>Immutable Utility Credit Double-Entry Ledger</span>
              </div>
              <span className="badge-gold text-[10px] font-bold px-2 py-0.5 rounded-full">Audited Invariant</span>
            </div>

            <div className="space-y-2 font-mono text-[11px]">
              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/[0.04] flex items-center justify-between">
                <span className="text-neutral-300">tx_9812_purchase_entitlement</span>
                <span className="text-red-400 font-bold">-150 Credits</span>
                <span className="text-neutral-400">Balance: 575</span>
              </div>
              <div className="p-3 rounded-xl bg-obsidian-900 border border-white/[0.04] flex items-center justify-between">
                <span className="text-neutral-300">tx_9810_bounty_reward</span>
                <span className="text-emerald-400 font-bold">+200 Credits</span>
                <span className="text-neutral-400">Balance: 725</span>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed font-sans pt-1">
              Valax Utility Credits are non-financial internal credits strictly utilized for tool entitlements, script authorizations, and community recognition. No cash-out, speculation, or dividend distributions.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}