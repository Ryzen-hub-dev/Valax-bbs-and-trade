import Link from "next/link";
import { ShieldCheck, ExternalLink, Lock } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-white/[0.06] bg-obsidian-950/90 py-10 text-xs text-neutral-400 mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2.5">
              <span className="font-bold text-white text-sm tracking-tight">Valax Scrub BBS & Trade</span>
              <span className="badge-gold text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider">
                Official Subsystem
              </span>
            </div>
            <p className="text-xs text-neutral-400 leading-relaxed">
              Official community forum and verified digital asset marketplace. Operates as a specialized subsystem independent of the main site at{" "}
              <a
                href="https://valaxscrub.shop"
                target="_blank"
                rel="noopener noreferrer"
                className="text-amber-400 hover:underline inline-flex items-center gap-1 font-medium"
              >
                valaxscrub.shop <ExternalLink className="h-3 w-3 inline" />
              </a>
              .
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-xs font-medium text-neutral-300">
            <Link href="/bbs" className="hover:text-amber-400 transition-colors">BBS Forum</Link>
            <Link href="/market" className="hover:text-amber-400 transition-colors">Digital Marketplace</Link>
            <Link href="/wallet" className="hover:text-amber-400 transition-colors">Utility Ledger</Link>
            <Link href="/dashboard/security" className="hover:text-cyan-400 transition-colors">Security Center</Link>
          </div>
        </div>

        {/* Regulatory & Security Compliance Statement */}
        <div className="pt-6 border-t border-white/[0.06] text-[11px] text-neutral-400 space-y-2">
          <div className="flex items-center gap-2 font-semibold text-neutral-300">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span>Compliance, Non-Financial Utility & Zero-Upload Security Policy</span>
          </div>
          <p className="leading-relaxed">
            Valax Credits are non-financial utility tokens designed strictly for internal community reputation, digital tool entitlements, and forum features. They do not constitute securities, shares, financial investments, debt instruments, dividends, or yield commitments. Direct binary file upload is permanently disabled across the platform; all distributed releases are verified external GitHub / provider links.
          </p>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 text-neutral-400 border-t border-white/[0.04] text-[10px]">
            <span>&copy; {new Date().getFullYear()} Valax Scrub Ecosystem. All rights reserved.</span>
            <div className="flex items-center gap-2 mt-1 sm:mt-0">
              <Lock className="h-3 w-3 text-amber-500" />
              <span>Target: bbs-and-trade.valaxscrub.shop</span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}