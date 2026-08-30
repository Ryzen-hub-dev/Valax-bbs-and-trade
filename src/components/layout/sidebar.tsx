"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, ShoppingBag, FolderLock, Wallet, Shield, PlusCircle, Bookmark, Compass, Sparkles } from "lucide-react";

export function Sidebar() {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/", icon: Compass },
    { label: "BBS Forum", href: "/bbs", icon: MessageSquare },
    { label: "New Discussion", href: "/bbs/new", icon: PlusCircle },
    { label: "Marketplace", href: "/market", icon: ShoppingBag },
    { label: "Publish Asset", href: "/market/publish", icon: Sparkles },
    { label: "My Inventory", href: "/inventory", icon: FolderLock },
    { label: "Credit Wallet", href: "/wallet", icon: Wallet },
  ];

  return (
    <aside className="hidden lg:block w-64 shrink-0 py-6 pr-6 border-r border-slate-800/80">
      <div className="space-y-6 sticky top-24">
        <div className="space-y-1">
          <div className="px-3 pb-2 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Navigation
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? "bg-blue-600 text-white shadow-md shadow-blue-600/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/60"
                }`}
              >
                <Icon className={`h-4 w-4 ${isActive ? "text-white" : "text-slate-400"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>

        {/* Security badge notice */}
        <div className="p-4 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-2">
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-300">
            <Shield className="h-4 w-4 text-emerald-400" />
            <span>Zero File Uploads</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            All script deliveries are verified via external GitHub Releases. No user binaries are stored locally.
          </p>
        </div>
      </div>
    </aside>
  );
}