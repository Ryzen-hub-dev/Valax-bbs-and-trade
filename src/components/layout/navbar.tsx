import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { getUserWallet } from "@/lib/ledger";
import { isUserAdmin } from "@/lib/rbac";
import { Coins, LogIn, LogOut, Shield, User, ShoppingBag, MessageSquare } from "lucide-react";

export async function Navbar() {
  let session = null;
  let wallet = null;
  let isAdmin = false;

  try {
    session = await getCurrentSession();
    if (session) {
      wallet = await getUserWallet(session.user.id);
      isAdmin = isUserAdmin(session.user);
    }
  } catch (err) {
    console.error("Navbar session check error:", err);
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2.5 group">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Valax Logo" className="h-9 w-9 rounded-lg shadow-lg shadow-blue-500/20 group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <span className="text-base font-bold text-white tracking-tight flex items-center gap-1.5">
                Valax Scrub <span className="text-xs font-semibold px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-400 border border-blue-700/50">BBS & Trade</span>
              </span>
              <span className="text-[10px] text-slate-400">Community & Digital Marketplace</span>
            </div>
          </Link>

          {/* Quick Nav */}
          <nav className="hidden md:flex items-center gap-1 text-sm font-medium text-slate-300">
            <Link href="/bbs" className="px-3 py-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1.5">
              <MessageSquare className="h-4 w-4 text-blue-400" />
              BBS Community
            </Link>
            <Link href="/market" className="px-3 py-1.5 rounded-md hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-1.5">
              <ShoppingBag className="h-4 w-4 text-emerald-400" />
              Marketplace
            </Link>
          </nav>
        </div>

        {/* User / Auth State */}
        <div className="flex items-center gap-3">
          {session ? (
            <>
              {/* Utility Credit Badge */}
              <Link
                href="/wallet"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 transition-all shadow-sm"
                title="Valax Utility Credits (Non-financial platform credits)"
              >
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                <span>{wallet?.balance ?? 0}</span>
                <span className="hidden sm:inline text-amber-400/80">Credits</span>
              </Link>

              {/* Admin Dashboard Link */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-purple-950/60 border border-purple-700/50 text-purple-300 text-xs font-medium hover:bg-purple-900/60 transition-colors"
                >
                  <Shield className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Admin Panel</span>
                </Link>
              )}

              {/* Profile & Logout */}
              <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-sm text-slate-200 hover:text-white group"
                >
                  {session.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.avatarUrl}
                      alt={session.user.username}
                      className="h-8 w-8 rounded-full border border-slate-700 object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-slate-800 flex items-center justify-center text-slate-300">
                      <User className="h-4 w-4" />
                    </div>
                  )}
                  <span className="hidden md:inline font-medium text-xs text-slate-300 group-hover:text-white">
                    {session.user.username}
                  </span>
                </Link>

                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="p-1.5 rounded-md text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </>
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md shadow-indigo-600/20 transition-all"
            >
              <LogIn className="h-4 w-4" />
              <span>Login with Discord</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}