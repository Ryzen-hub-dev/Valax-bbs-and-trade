import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentSession } from "@/lib/auth";
import { isUserAdmin } from "@/lib/rbac";
import { Shield, Users, Flag, Database, Sliders, ArrowLeft, BarChart3 } from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getCurrentSession();
  if (!session || !isUserAdmin(session.user)) {
    redirect("/bbs");
  }

  const navLinks = [
    { label: "Dashboard", href: "/admin", icon: BarChart3 },
    { label: "User Management", href: "/admin/users", icon: Users },
    { label: "Moderation Queue", href: "/admin/moderation", icon: Flag },
    { label: "Ledger Inspector", href: "/admin/ledger", icon: Database },
    { label: "System Settings", href: "/admin/settings", icon: Sliders },
  ];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-4 rounded-2xl bg-purple-950/40 border border-purple-700/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-purple-600/20 text-purple-400 border border-purple-500/30">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-sm font-bold text-white">Valax Scrub Administrative Console</h1>
            <p className="text-[11px] text-purple-300/80">
              High-privilege area. Every action is recorded to the immutable audit log.
            </p>
          </div>
        </div>
        <Link
          href="/bbs"
          className="flex items-center gap-1 text-xs text-purple-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Back to Site
        </Link>
      </div>

      {/* Sub Navigation */}
      <div className="flex flex-wrap items-center gap-2 pb-2 border-b border-slate-800">
        {navLinks.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900/60 border border-slate-800 hover:bg-purple-950/40 hover:border-purple-700/50 hover:text-white transition-colors"
            >
              <Icon className="h-4 w-4 text-purple-400" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>

      <div>{children}</div>
    </div>
  );
}