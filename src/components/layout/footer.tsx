import Link from "next/link";
import { ShieldCheck, ExternalLink } from "lucide-react";

export function Footer() {
  return (
    <footer className="w-full border-t border-slate-800/80 bg-slate-950/60 py-8 text-slate-400 text-xs mt-auto">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-200 text-sm">Valax Scrub BBS and Trade</span>
              <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">Subplatform</span>
            </div>
            <p className="text-[11px] text-slate-400 max-w-xl">
              Independent community board and digital marketplace for the Valax Scrub ecosystem. Main site: <a href="https://valaxscrub.shop" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">valaxscrub.shop</a>.
            </p>
          </div>

          <div className="flex items-center gap-4 text-xs">
            <Link href="/bbs" className="hover:text-white transition-colors">BBS Forum</Link>
            <Link href="/market" className="hover:text-white transition-colors">Marketplace</Link>
            <Link href="/wallet" className="hover:text-white transition-colors">Utility Ledger</Link>
          </div>
        </div>

        {/* Legal Disclaimer */}
        <div className="pt-4 border-t border-slate-800/60 text-[11px] text-slate-400 space-y-1.5">
          <div className="flex items-center gap-1.5 font-semibold text-slate-300">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>Compliance & Token Classification Statement</span>
          </div>
          <p>
            Valax Utility Credits are non-financial utility tokens designed exclusively for in-platform digital items, developer tool access, and community benefits. They do not represent equity, debt, securities, investment contracts, or profit distribution promises.
          </p>
          <div className="flex items-center justify-between pt-2 text-slate-500">
            <span>&copy; {new Date().getFullYear()} Valax Scrub. All rights reserved.</span>
            <span>Target Domain: bbs-and-trade.valaxscrub.shop</span>
          </div>
        </div>
      </div>
    </footer>
  );
}