"use client";

import React, { useState } from "react";
import { MessageSquare, ShoppingBag, ShieldCheck, Coins, KeyRound, CheckCircle2, Github, Terminal, Copy, Check, ExternalLink, Activity, Radio, AlertTriangle, ArrowRight } from "lucide-react";

export function ProductStorySection() {
  const [activeThread, setActiveThread] = useState<"rfc" | "oauth">("rfc");
  const [copied, setCopied] = useState(false);
  const [sessionRevoked, setSessionRevoked] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="space-y-16 py-6">
      {/* Section Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <span className="badge-gold text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider">
          Product Narrative & Architecture
        </span>
        <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-white">
          Experience the Four Pillars of Valax
        </h2>
        <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed font-normal">
          Explore interactive previews of the core subsystems that power our developer exchange, security isolation, and immutable ledger.
        </p>
      </div>

      <div className="space-y-12">
        {/* Story 1: BBS Forum */}
        <div className="rounded-3xl border border-white/[0.08] bg-obsidian-950/80 p-6 sm:p-10 backdrop-blur-xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 badge-gold text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              <MessageSquare className="h-3 w-3 text-amber-400" />
              <span>Pillar 1 • BBS Forum</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              High-Signal Technical Discussions
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Engineered for developer RFCs, architecture proposals, and collaborative debugging. Markdown rendering with syntax-highlighted code blocks and verified author badges.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setActiveThread("rfc")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeThread === "rfc" ? "bg-amber-500 text-obsidian-950 shadow-glow-gold" : "bg-obsidian-900 text-neutral-400 border border-white/[0.06]"
                }`}
              >
                RFC Invariants
              </button>
              <button
                onClick={() => setActiveThread("oauth")}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeThread === "oauth" ? "bg-amber-500 text-obsidian-950 shadow-glow-gold" : "bg-obsidian-900 text-neutral-400 border border-white/[0.06]"
                }`}
              >
                OAuth Security
              </button>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-white/[0.08] bg-obsidian-900/90 p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.04] text-xs">
              <div className="flex items-center gap-2">
                <span className="badge-cyan text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  {activeThread === "rfc" ? "Architecture RFC" : "Security Spec"}
                </span>
                <span className="text-[10px] text-amber-400 font-bold font-mono">Product Preview</span>
              </div>
              <span className="text-[11px] text-neutral-400">By CoreDev • 2h ago</span>
            </div>

            <h4 className="font-bold text-sm sm:text-base text-white">
              {activeThread === "rfc"
                ? "RFC-008: Formal Double-Entry Invariants & Composite Constraints"
                : "SPEC-003: Cryptographic Session Isolation & Public ID Revocation"}
            </h4>

            <div className="rounded-xl border border-white/[0.04] bg-obsidian-950 p-4 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-neutral-400 text-[10px] pb-1.5 border-b border-white/[0.04]">
                <span className="text-amber-400 flex items-center gap-1.5">
                  <Terminal className="h-3 w-3" /> {activeThread === "rfc" ? "ledger_tx.ts" : "session_guard.ts"}
                </span>
                <button onClick={handleCopy} className="text-neutral-400 hover:text-white flex items-center gap-1">
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="text-neutral-300 text-[11px] overflow-x-auto">
{activeThread === "rfc"
  ? `const tx = await db.transaction("write");
await tx.execute("UPDATE wallet_accounts SET balance = balance - ? WHERE balance >= ?;", [amount, amount]);
await tx.commit();`
  : `const sessionHash = hashSessionToken(rawToken);
const publicSessionId = generatePublicSessionId();
await db.insert(sessions).values({ tokenHash: sessionHash, publicSessionId });`}
              </pre>
            </div>
          </div>
        </div>

        {/* Story 2: Verified Releases */}
        <div className="rounded-3xl border border-white/[0.08] bg-obsidian-950/80 p-6 sm:p-10 backdrop-blur-xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 badge-cyan text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              <ShoppingBag className="h-3 w-3 text-cyan-400" />
              <span>Pillar 2 • Verified Releases</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Zero Server-Hosted Executables
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              We never host or execute user binary files on server infrastructure. All software distributions link exclusively to authenticated GitHub Release tags with verifiable SHA-256 digests.
            </p>
            <div className="p-3.5 rounded-xl bg-obsidian-900 border border-white/[0.04] text-[11px] text-neutral-400 space-y-1">
              <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                <ShieldCheck className="h-4 w-4" /> 100% External Integrity Policy
              </div>
              <p className="text-[10px]">Zero malware hosting risks • Strict rehype sanitizer on all links</p>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-cyan-500/30 bg-obsidian-900/90 p-5 sm:p-6 space-y-4 shadow-glow-cyan">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-white/[0.04]">
              <div className="flex items-center gap-2">
                <span className="badge-cyan text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Audited Toolset
                </span>
                <span className="badge-emerald inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full">
                  <Github className="h-3 w-3" /> GitHub Release Verified
                </span>
              </div>
              <span className="text-amber-400 font-bold text-[11px] font-mono">150 Credits</span>
            </div>

            <div>
              <h4 className="text-sm sm:text-base font-bold text-white">Valax Automation CLI Toolset v2.4.0</h4>
              <p className="text-xs text-neutral-400 mt-1">High-performance utilities for workflow automation and release packaging.</p>
            </div>

            <div className="p-3.5 rounded-xl bg-obsidian-950 border border-white/[0.04] font-mono text-[11px] text-neutral-300 space-y-1.5">
              <div className="flex justify-between">
                <span className="text-neutral-400">Release URL:</span>
                <span className="text-cyan-400 flex items-center gap-1">
                  github.com/valax/cli/releases/v2.4.0 <ExternalLink className="h-3 w-3" />
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-neutral-400">SHA-256 Digest:</span>
                <span className="text-neutral-300">e3b0c44298fc1c149afbf4c8996fb92427ae41e4...</span>
              </div>
            </div>
          </div>
        </div>

        {/* Story 3: Security Center */}
        <div className="rounded-3xl border border-white/[0.08] bg-obsidian-950/80 p-6 sm:p-10 backdrop-blur-xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 badge-emerald text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              <KeyRound className="h-3 w-3 text-emerald-400" />
              <span>Pillar 3 • Security Center</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Cryptographic Session Isolation
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Every authenticated device receives an opaque 128-bit publicSessionId. Revoke untrusted or stale devices remotely without revealing token hashes or private session identifiers.
            </p>
            <button
              onClick={() => setSessionRevoked(!sessionRevoked)}
              className="px-4 py-2 rounded-xl text-xs font-bold bg-obsidian-900 border border-white/[0.08] hover:border-white/[0.18] text-neutral-200 transition-all flex items-center gap-2"
            >
              <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
              <span>{sessionRevoked ? "Reset Demo Session" : "Simulate Remote Revocation"}</span>
            </button>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-emerald-500/30 bg-obsidian-900/90 p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-400" />
                Active Device Registry
              </span>
              <span className="text-[10px] text-emerald-400 font-mono">
                {sessionRevoked ? "1 Active Session" : "2 Active Sessions"}
              </span>
            </div>

            <div className="p-3.5 rounded-xl bg-obsidian-950 border border-amber-500/30 flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>macOS • Desktop Chrome</span>
                  <span className="badge-emerald text-[8px] px-2 py-0.2 rounded-full font-bold">Current</span>
                </div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">ID: psess_7093ae37... • IP: 198.51.***.***</div>
              </div>
              <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
            </div>

            <div className={`p-3.5 rounded-xl bg-obsidian-950 border transition-all flex items-center justify-between ${sessionRevoked ? "border-red-900/40 opacity-50" : "border-white/[0.04]"}`}>
              <div>
                <div className="text-xs font-bold text-neutral-300">iOS • Mobile Safari</div>
                <div className="text-[10px] text-neutral-400 font-mono mt-0.5">ID: psess_994e2a4e... • IP: 203.0.***.***</div>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${sessionRevoked ? "bg-red-950 text-red-400 border border-red-800" : "text-neutral-400"}`}>
                {sessionRevoked ? "Revoked" : "Active"}
              </span>
            </div>
          </div>
        </div>

        {/* Story 4: Utility Credits */}
        <div className="rounded-3xl border border-white/[0.08] bg-obsidian-950/80 p-6 sm:p-10 backdrop-blur-xl shadow-2xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-5 space-y-4">
            <div className="inline-flex items-center gap-2 badge-gold text-[10px] font-bold px-2.5 py-0.5 rounded-full">
              <Coins className="h-3 w-3 text-amber-400" />
              <span>Pillar 4 • Utility Credits</span>
            </div>
            <h3 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Immutable Double-Entry Ledger
            </h3>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Valax Credits are non-financial utility tokens engineered strictly for internal tool entitlements, script authorizations, and community recognition. Zero investments, zero cash-out, zero yields.
            </p>
            <div className="p-3.5 rounded-xl bg-obsidian-900 border border-white/[0.04] text-[11px] text-neutral-400 space-y-1">
              <div className="text-amber-400 font-bold">Strict Mathematical Invariants</div>
              <p className="text-[10px]">LibSQL write transactions ensure zero balance overdrafts or duplicate deductions.</p>
            </div>
          </div>

          <div className="lg:col-span-7 rounded-2xl border border-purple-500/30 bg-obsidian-900/90 p-5 sm:p-6 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/[0.04]">
              <span className="text-xs font-bold text-white flex items-center gap-2">
                <Activity className="h-4 w-4 text-purple-400" />
                Ledger Transaction Stream
              </span>
              <span className="badge-gold text-[9px] font-bold px-2 py-0.2 rounded-full">Audited Invariant</span>
            </div>

            <div className="p-3 rounded-xl bg-obsidian-950 border border-white/[0.04] font-mono text-[11px] flex items-center justify-between">
              <div>
                <div className="text-white font-bold">tx_8910_entitlement_purchase</div>
                <div className="text-[10px] text-neutral-400">Asset: Valax CLI Toolset</div>
              </div>
              <span className="text-red-400 font-bold">-150 Credits</span>
            </div>

            <div className="p-3 rounded-xl bg-obsidian-950 border border-white/[0.04] font-mono text-[11px] flex items-center justify-between">
              <div>
                <div className="text-white font-bold">tx_8908_community_bounty</div>
                <div className="text-[10px] text-neutral-400">Award: RFC-008 Resolution</div>
              </div>
              <span className="text-emerald-400 font-bold">+200 Credits</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}