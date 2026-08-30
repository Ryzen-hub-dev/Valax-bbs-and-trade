"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MessageSquare, ShoppingBag, ArrowRight, Sparkles, Shield, ShieldCheck, Lock, Terminal, Github, KeyRound, Copy, Check, Radio, Coins } from "lucide-react";
import gsap from "gsap";

export function HeroStage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !containerRef.current) return;

    const ctx = gsap.context(() => {
      // Stagger entrance for narrative content
      gsap.from(".hero-text-elem", {
        opacity: 0,
        y: 30,
        duration: 0.8,
        stagger: 0.09,
        ease: "power3.out",
        clearProps: "all",
      });

      // Stagger entrance for floating product stage artifacts
      gsap.from(".hero-artifact", {
        opacity: 0,
        y: 40,
        scale: 0.95,
        duration: 1,
        stagger: 0.15,
        ease: "power3.out",
        delay: 0.2,
        clearProps: "all",
      });

      // Floating gentle hover for artifacts on desktop
      if (window.innerWidth >= 1024) {
        gsap.to(".artifact-float-1", {
          y: -8,
          duration: 3.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
        gsap.to(".artifact-float-2", {
          y: 8,
          duration: 4.2,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 0.5,
        });
        gsap.to(".artifact-float-3", {
          y: -6,
          duration: 3.8,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
          delay: 1,
        });
      }

      // Background ambient glow breath
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          scale: 1.12,
          opacity: 0.25,
          duration: 4.5,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-obsidian-900 via-obsidian-950 to-obsidian-950 p-6 sm:p-10 lg:p-14 shadow-2xl"
    >
      {/* Background Ambient Radial Glow */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute -top-32 left-1/3 -translate-x-1/2 h-[460px] w-[780px] rounded-full bg-amber-500/12 blur-[150px]"
      />

      <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-center">
        {/* Left Column: Brand Narrative & Conversion */}
        <div className="lg:col-span-7 space-y-7">
          {/* Official Subplatform Badge */}
          <div className="hero-text-elem inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full badge-gold text-xs font-bold shadow-glow-gold">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            <span>Valax Scrub Ecosystem Subplatform</span>
          </div>

          {/* Main Title */}
          <div className="hero-text-elem space-y-2">
            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.1]">
              Valax Scrub <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
                BBS & Digital Trade
              </span>
            </h1>
          </div>

          {/* Subtitle */}
          <p className="hero-text-elem text-sm sm:text-base text-neutral-300 leading-relaxed font-normal max-w-xl">
            The high-precision developer platform for technical knowledge exchange and verified external software delivery. Zero server binary hosting, authentic GitHub Release verification, and an immutable double-entry Utility Credit ledger.
          </p>

          {/* Action CTAs */}
          <div className="hero-text-elem flex flex-wrap items-center gap-3.5 pt-1">
            <Link
              href="/bbs"
              className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-obsidian-950 text-xs font-black shadow-glow-gold transition-all duration-200 active:scale-95"
            >
              <MessageSquare className="h-4 w-4" />
              <span>Explore BBS Community</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>

            <Link
              href="/market"
              className="flex items-center gap-2 px-5 py-3.5 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 text-neutral-200 hover:text-white text-xs font-bold border border-white/[0.08] hover:border-white/[0.18] transition-all"
            >
              <ShoppingBag className="h-4 w-4 text-cyan-400" />
              <span>Browse Releases</span>
            </Link>

            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-bold border border-indigo-500/30 transition-colors"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>Discord OAuth</span>
            </Link>
          </div>

          {/* Architecture Trust Badges */}
          <div className="hero-text-elem flex flex-wrap items-center gap-6 pt-4 border-t border-white/[0.06] text-xs text-neutral-400">
            <div className="flex items-center gap-1.5 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>Zero Server Binaries</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <Coins className="h-4 w-4 text-amber-400" />
              <span>Non-Financial Utility</span>
            </div>
            <div className="flex items-center gap-1.5 font-medium">
              <KeyRound className="h-4 w-4 text-cyan-400" />
              <span>128-bit Session Guard</span>
            </div>
          </div>
        </div>

        {/* Right Column: Valax Dedicated Visual Product Stage */}
        <div ref={stageRef} className="lg:col-span-5 relative">
          <div className="relative rounded-3xl border border-white/[0.08] bg-obsidian-950/80 p-5 sm:p-6 backdrop-blur-2xl shadow-2xl space-y-4">
            {/* Center Brand Crest & Status */}
            <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
              <div className="flex items-center gap-3">
                <div className="relative flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-glow-gold">
                  <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-obsidian-950">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/logo.svg" alt="Valax Logo" className="h-6 w-6" />
                  </div>
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm tracking-tight flex items-center gap-2">
                    VALAX ENGINE
                    <span className="badge-emerald text-[9px] px-2 py-0.2 rounded-full font-bold">ACTIVE</span>
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-mono">NODE v1.0.0 • TURSO LIBSQL</span>
                </div>
              </div>
              <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
            </div>

            {/* Artifact 1: Verified GitHub Release Card */}
            <div className="hero-artifact artifact-float-1 rounded-2xl border border-cyan-500/30 bg-obsidian-900/90 p-4 space-y-2 shadow-glow-cyan">
              <div className="flex items-center justify-between text-xs">
                <span className="badge-cyan text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  Verified Release
                </span>
                <span className="text-emerald-400 font-bold text-[10px] flex items-center gap-1 font-mono">
                  <Github className="h-3 w-3" /> SHA-256 MATCHED
                </span>
              </div>
              <div className="text-xs font-bold text-white">Valax Automation CLI Toolset</div>
              <div className="text-[10px] text-neutral-400 font-mono flex items-center justify-between">
                <span>github.com/valax/cli@v2.4.0</span>
                <span className="text-amber-400 font-bold">150 Credits</span>
              </div>
            </div>

            {/* Artifact 2: BBS Forum RFC Code Reader Card */}
            <div className="hero-artifact artifact-float-2 rounded-2xl border border-amber-500/30 bg-obsidian-900/90 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="badge-gold text-[9px] font-bold px-2 py-0.5 rounded-full uppercase">
                  BBS RFC #008
                </span>
                <button
                  onClick={handleCopy}
                  className="text-neutral-400 hover:text-white text-[10px] flex items-center gap-1 font-mono transition-colors"
                >
                  {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                  <span>{copied ? "Copied" : "Copy"}</span>
                </button>
              </div>
              <pre className="text-[10px] text-neutral-300 font-mono overflow-x-auto bg-obsidian-950 p-2.5 rounded-xl border border-white/[0.04]">
{`const tx = await db.transaction("write");
await tx.insert(productPurchases).values(...);
await tx.commit();`}
              </pre>
            </div>

            {/* Artifact 3: Cryptographic Session Guard Card */}
            <div className="hero-artifact artifact-float-3 rounded-2xl border border-white/[0.06] bg-obsidian-900/90 p-3.5 flex items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2.5">
                <div className="h-7 w-7 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <KeyRound className="h-3.5 w-3.5" />
                </div>
                <div>
                  <div className="font-bold text-white text-xs">Cryptographic Session Guard</div>
                  <div className="text-[10px] text-neutral-400 font-mono">psess_7093ae37... (Masked)</div>
                </div>
              </div>
              <span className="badge-emerald text-[9px] px-2 py-0.5 rounded-full font-bold">
                Isolated
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}