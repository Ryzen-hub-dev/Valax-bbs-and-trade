import Link from "next/link";
import { ShieldCheck, Lock, Sparkles } from "lucide-react";
import { FadeIn } from "@/components/animations/gsap-wrapper";

export default function LoginPage() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center">
      <FadeIn className="w-full max-w-md p-8 rounded-2xl border border-slate-800 bg-slate-900/70 shadow-2xl backdrop-blur-md">
        <div className="text-center space-y-3">
          <div className="mx-auto h-12 w-12 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400 shadow-lg">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">登录 Valax Scrub 社区</h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            为保障社区安全与防止恶意脚本刷号，本站唯一支持通过官方 Discord 授权登录。
          </p>
        </div>

        <div className="mt-8 space-y-4">
          <a
            href="/api/auth/discord"
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-[#5865F2] hover:bg-[#4752C4] text-white font-semibold text-sm shadow-lg shadow-[#5865F2]/25 transition-all transform active:scale-95"
          >
            <svg className="h-5 w-5 fill-current" viewBox="0 0 24 24">
              <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994.021-.041.001-.09-.041-.106a13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.929 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.893.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
            </svg>
            使用 Discord 一键登录
          </a>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2 text-slate-300 font-medium">
              <ShieldCheck className="h-4 w-4 text-emerald-400" />
              <span>安全规范保障</span>
            </div>
            <p>• 不采集任何密码或邮箱登录凭证</p>
            <p>• 使用安全的 HttpOnly SameSite 会话令牌</p>
            <p>• 会话支持随时在个人中心或被管理员撤销</p>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}