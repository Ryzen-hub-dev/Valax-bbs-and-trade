import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { isUserAdmin } from "@/lib/rbac";
import Link from "next/link";
import { Shield, Users, AlertTriangle, FileText, Settings, LayoutDashboard, ArrowLeft } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session || !isUserAdmin(session.user)) {
    redirect("/bbs");
  }

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-purple-900/50 bg-purple-950/20 p-6 rounded-2xl border border-purple-800/40">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-purple-600 text-white shadow-lg shadow-purple-600/30">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Valax Scrub 管理与风控控制台</span>
              <span className="text-xs px-2 py-0.5 rounded-md bg-purple-900/80 text-purple-200 border border-purple-600/50">
                ADMIN RBAC
              </span>
            </h1>
            <p className="text-xs text-purple-300/80">操作均受服务端二次审计与不可篡改流水日志追踪</p>
          </div>
        </div>

        <Link
          href="/bbs"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 text-xs font-medium hover:text-white transition-colors self-start sm:self-auto"
        >
          <ArrowLeft className="h-4 w-4" />
          返回社区前台
        </Link>
      </div>

      {/* Admin Subnav */}
      <div className="flex flex-wrap items-center gap-2 p-1.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs font-semibold">
        <Link
          href="/admin"
          className="px-4 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <LayoutDashboard className="h-4 w-4 text-purple-400" />
          总览仪表盘
        </Link>
        <Link
          href="/admin/users"
          className="px-4 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <Users className="h-4 w-4 text-blue-400" />
          用户与会话管理
        </Link>
        <Link
          href="/admin/moderation"
          className="px-4 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          审核与举报队列
        </Link>
        <Link
          href="/admin/ledger"
          className="px-4 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <FileText className="h-4 w-4 text-emerald-400" />
          积分与账本审计
        </Link>
        <Link
          href="/admin/settings"
          className="px-4 py-2 rounded-lg hover:bg-slate-800 text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <Settings className="h-4 w-4 text-slate-400" />
          系统开关与配置
        </Link>
      </div>

      <div>{children}</div>
    </div>
  );
}