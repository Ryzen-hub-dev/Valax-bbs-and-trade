import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { isUserAdmin } from "@/lib/rbac";
import {
  MessageSquare,
  ShoppingBag,
  Sparkles,
  Award,
  HelpCircle,
  Code2,
  Megaphone,
  FolderLock,
  Wallet,
  ShieldAlert,
  Compass,
} from "lucide-react";

export async function Sidebar() {
  const session = await getCurrentSession();
  const isAdmin = session ? isUserAdmin(session.user) : false;

  return (
    <aside className="hidden lg:flex flex-col w-64 shrink-0 border-r border-slate-800/80 bg-slate-950/40 min-h-[calc(100vh-4rem)] p-4">
      <div className="space-y-6">
        {/* Navigation Categories */}
        <div>
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            社区导览
          </h3>
          <div className="mt-2 space-y-1">
            <Link
              href="/"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <Compass className="h-4 w-4 text-blue-400" />
              总览主页
            </Link>
            <Link
              href="/bbs"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <MessageSquare className="h-4 w-4 text-indigo-400" />
              全部帖子与版块
            </Link>
            <Link
              href="/market"
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <ShoppingBag className="h-4 w-4 text-emerald-400" />
              数字市场
            </Link>
          </div>
        </div>

        {/* Featured Boards */}
        <div>
          <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
            热门版块
          </h3>
          <div className="mt-2 space-y-1 text-xs">
            <Link
              href="/bbs/announcements"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <Megaphone className="h-3.5 w-3.5 text-amber-400" />
              官方公告
            </Link>
            <Link
              href="/bbs/scripts-and-dev"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <Code2 className="h-3.5 w-3.5 text-cyan-400" />
              脚本与开发讨论
            </Link>
            <Link
              href="/bbs/market-discussion"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              交易与商品交流
            </Link>
            <Link
              href="/bbs/support"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <HelpCircle className="h-3.5 w-3.5 text-blue-400" />
              求助与问答 (可解决)
            </Link>
            <Link
              href="/bbs/bounties-and-rewards"
              className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
            >
              <Award className="h-3.5 w-3.5 text-purple-400" />
              悬赏与贡献积分
            </Link>
          </div>
        </div>

        {/* User Personal Center */}
        {session && (
          <div>
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
              个人资产与记录
            </h3>
            <div className="mt-2 space-y-1">
              <Link
                href="/inventory"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
              >
                <FolderLock className="h-4 w-4 text-violet-400" />
                已购数字资产 & 密钥
              </Link>
              <Link
                href="/wallet"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800/60 hover:text-white transition-colors"
              >
                <Wallet className="h-4 w-4 text-amber-400" />
                Utility Credit 账本
              </Link>
            </div>
          </div>
        )}

        {/* Admin Section */}
        {isAdmin && (
          <div>
            <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-purple-400">
              管理与风控
            </h3>
            <div className="mt-2 space-y-1">
              <Link
                href="/admin"
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-purple-300 hover:bg-purple-950/40 hover:text-purple-100 transition-colors"
              >
                <ShieldAlert className="h-4 w-4 text-purple-400" />
                管理控制台
              </Link>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}