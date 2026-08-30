import Link from "next/link";
import { getCurrentSession } from "@/lib/auth";
import { getUserWallet } from "@/lib/ledger";
import { isUserAdmin } from "@/lib/rbac";
import { Coins, LogIn, LogOut, Shield, User, ShoppingBag, MessageSquare, KeyRound, LayoutDashboard, Package } from "lucide-react";

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
    <header className="sticky top-0 z-50 w-full glass-nav border-b border-white/[0.06]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Lockup */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 p-0.5 shadow-glow-gold transition-all duration-300 group-hover:scale-105">
              <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-obsidian-950">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logo.svg" alt="Valax Logo" className="h-6 w-6" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-tight text-white flex items-center gap-2">
                VALAX SCRUB
                <span className="badge-gold text-[9px] font-bold px-2 py-0.2 rounded-full uppercase tracking-wider">
                  BBS & TRADE
                </span>
              </span>
              <span className="text-[10px] text-neutral-400 font-medium tracking-tight">Verified Developer Subplatform</span>
            </div>
          </Link>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 text-xs font-semibold">
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-all"
            >
              Overview
            </Link>
            <Link
              href="/bbs"
              className="px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-1.5"
            >
              <MessageSquare className="h-3.5 w-3.5 text-amber-400" />
              <span>Community</span>
            </Link>
            <Link
              href="/market"
              className="px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-1.5"
            >
              <ShoppingBag className="h-3.5 w-3.5 text-cyan-400" />
              <span>Releases</span>
            </Link>
            <Link
              href="/dashboard/security"
              className="px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-1.5"
            >
              <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
              <span>Security</span>
            </Link>

            {/* Authenticated user links */}
            {session && (
              <>
                <Link
                  href="/inventory"
                  className="px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-1.5"
                >
                  <Package className="h-3.5 w-3.5 text-purple-400" />
                  <span>Inventory</span>
                </Link>
                <Link
                  href="/wallet"
                  className="px-3 py-1.5 rounded-lg text-neutral-300 hover:text-white hover:bg-white/[0.04] transition-all flex items-center gap-1.5"
                >
                  <Coins className="h-3.5 w-3.5 text-amber-400" />
                  <span>Wallet</span>
                </Link>
              </>
            )}
          </nav>
        </div>

        {/* User / Auth State */}
        <div className="flex items-center gap-3">
          {session ? (
            <>
              {/* Utility Credit Badge */}
              <Link
                href="/wallet"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl badge-gold text-xs font-bold transition-all hover:shadow-glow-gold"
                title="Valax Utility Credits (Non-financial platform utility credits)"
              >
                <Coins className="h-3.5 w-3.5 text-amber-400" />
                <span>{wallet?.balance ?? 0}</span>
                <span className="hidden sm:inline opacity-75 font-normal text-[10px]">Credits</span>
              </Link>

              {/* Admin Badge */}
              {isAdmin && (
                <Link
                  href="/admin"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-950/60 border border-purple-500/40 text-purple-300 text-xs font-bold hover:bg-purple-900/60 transition-colors"
                >
                  <Shield className="h-3.5 w-3.5 text-purple-400" />
                  <span className="hidden sm:inline">Admin</span>
                </Link>
              )}

              {/* Profile & Logout */}
              <div className="flex items-center gap-2.5 pl-2 border-l border-white/[0.08]">
                <Link
                  href="/profile"
                  className="flex items-center gap-2 text-xs text-neutral-300 hover:text-white transition-colors group"
                >
                  {session.user.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.avatarUrl}
                      alt={session.user.username}
                      className="h-7 w-7 rounded-full border border-white/[0.1] object-cover group-hover:border-amber-400 transition-colors"
                    />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-obsidian-800 border border-white/[0.1] flex items-center justify-center text-neutral-300">
                      <User className="h-3.5 w-3.5" />
                    </div>
                  )}
                  <span className="hidden lg:inline font-bold text-neutral-200 text-xs">
                    {session.user.username}
                  </span>
                </Link>

                <form action="/api/auth/logout" method="POST">
                  <button
                    type="submit"
                    className="p-1.5 rounded-lg text-neutral-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
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
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-obsidian-950 text-xs font-black shadow-glow-gold transition-all duration-200 active:scale-95"
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