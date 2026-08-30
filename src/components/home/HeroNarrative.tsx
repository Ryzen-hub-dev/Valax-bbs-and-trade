"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { MessageSquare, ShoppingBag, ArrowRight, Sparkles, Shield, Lock, Terminal } from "lucide-react";
import gsap from "gsap";

export function HeroNarrative() {
  const heroRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !heroRef.current) return;

    const ctx = gsap.context(() => {
      // Staggered hero narrative elements
      gsap.from(".hero-elem", {
        opacity: 0,
        y: 28,
        duration: 0.8,
        stagger: 0.1,
        ease: "power3.out",
        clearProps: "all",
      });

      // Subtle ambient pulse for the glow background
      if (glowRef.current) {
        gsap.to(glowRef.current, {
          scale: 1.15,
          opacity: 0.22,
          duration: 4,
          repeat: -1,
          yoyo: true,
          ease: "sine.inOut",
        });
      }
    }, heroRef);

    return () => ctx.revert();
  }, []);

  return (
    <section ref={heroRef} className="relative overflow-hidden rounded-3xl border border-white/[0.08] bg-gradient-to-b from-obsidian-900 via-obsidian-950 to-obsidian-950 p-8 sm:p-14 lg:p-16 shadow-2xl">
      {/* Ambient Pulsing Glow */}
      <div
        ref={glowRef}
        className="pointer-events-none absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[720px] rounded-full bg-amber-500/15 blur-[140px]"
      />

      <div className="relative z-10 space-y-8 max-w-3xl">
        {/* Brand Lockup & Tagline */}
        <div className="hero-elem inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full badge-gold text-xs font-bold shadow-glow-gold">
          <Sparkles className="h-3.5 w-3.5 text-amber-400" />
          <span>Official Developer BBS & Verified Release Exchange</span>
        </div>

        {/* Headline */}
        <h1 className="hero-elem text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
          Valax Scrub <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-amber-200 to-amber-500">
            BBS & Digital Trade
          </span>
        </h1>

        {/* Narrative Description */}
        <p className="hero-elem text-sm sm:text-base text-neutral-300 leading-relaxed font-normal max-w-2xl">
          The high-precision developer platform for technical knowledge exchange and verified software distribution. Engineered with zero server binary uploads, authentic GitHub Release delivery, and an immutable double-entry Utility Credit ledger.
        </p>

        {/* Action CTAs */}
        <div className="hero-elem flex flex-wrap items-center gap-4 pt-2">
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
            className="flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-obsidian-850 hover:bg-obsidian-800 text-neutral-200 text-xs font-bold border border-white/[0.08] hover:border-white/[0.18] transition-all"
          >
            <ShoppingBag className="h-4 w-4 text-cyan-400" />
            <span>Browse Verified Releases</span>
          </Link>
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-3.5 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-semibold border border-indigo-500/30 transition-colors"
          >
            <Lock className="h-3.5 w-3.5" />
            <span>Discord OAuth Login</span>
          </Link>
        </div>
      </div>
    </section>
  );
}