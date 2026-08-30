import Link from "next/link";
import { LogIn, Shield, ArrowLeft } from "lucide-react";
import { FadeIn } from "@/components/animations/gsap-wrapper";

export default function LoginPage() {
  return (
    <div className="max-w-md mx-auto py-16 space-y-6">
      <Link
        href="/"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to Overview
      </Link>

      <FadeIn className="p-8 rounded-3xl border border-slate-800 bg-slate-900/60 shadow-2xl space-y-6 text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.svg" alt="Valax Logo" className="h-16 w-16 mx-auto rounded-2xl shadow-xl shadow-blue-600/20" />

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-white tracking-tight">Login to Valax Scrub</h1>
          <p className="text-xs text-slate-400">
            Sign in securely using your Discord account. No password required.
          </p>
        </div>

        <a
          href="/api/auth/discord"
          className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-bold text-sm shadow-lg shadow-[#5865F2]/25 transition-all transform active:scale-95"
        >
          <LogIn className="h-5 w-5" />
          <span>Continue with Discord</span>
        </a>

        <div className="pt-4 border-t border-slate-800 text-[11px] text-slate-500 space-y-1">
          <div className="flex items-center justify-center gap-1 font-semibold text-slate-400">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span>Secure Authentication</span>
          </div>
          <p>We only request basic identification and email. Your credentials remain safe.</p>
        </div>
      </FadeIn>
    </div>
  );
}