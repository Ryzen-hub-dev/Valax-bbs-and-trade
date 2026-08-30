import Link from "next/link";
import { db } from "@/db";
import { forumThreads, products, users } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { MessageSquare, ShoppingBag, Coins, ShieldCheck, Flame, PlusCircle, ArrowRight, Sparkles, Code2, Award } from "lucide-react";
import { FadeIn, StaggerList } from "@/components/animations/gsap-wrapper";

export default async function RootPortalPage() {
  const hotThreads = await db
    .select({
      id: forumThreads.id,
      title: forumThreads.title,
      slug: forumThreads.slug,
      repliesCount: forumThreads.repliesCount,
      likesCount: forumThreads.likesCount,
      createdAt: forumThreads.createdAt,
      author: { username: users.username },
    })
    .from(forumThreads)
    .innerJoin(users, eq(forumThreads.authorId, users.id))
    .where(eq(forumThreads.status, "published"))
    .orderBy(desc(forumThreads.likesCount))
    .limit(5);

  const featuredProducts = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      shortDescription: products.shortDescription,
      category: products.category,
      tokenPrice: products.tokenPrice,
      version: products.version,
      salesCount: products.salesCount,
      developer: { username: users.username },
    })
    .from(products)
    .innerJoin(users, eq(products.developerId, users.id))
    .where(eq(products.status, "active"))
    .orderBy(desc(products.salesCount))
    .limit(4);

  return (
    <div className="space-y-12">
      {/* Hero Section */}
      <FadeIn className="relative overflow-hidden p-8 sm:p-12 rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950/40 shadow-2xl space-y-6">
        <div className="space-y-4 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/30 text-blue-400 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Valax Scrub BBS & Digital Marketplace 子站</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            极简、安全、专为脚本与开发者打造的 <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400">BBS 社区 & 数字交易市场</span>
          </h1>

          <p className="text-sm sm:text-base text-slate-400 leading-relaxed">
            零文件上传、纯外部 GitHub 交付安全规范，结合不可篡改的 Valax Utility Credit 双重账本。加入讨论、购买工具或展示你的代码成果。
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-4 pt-2">
          <Link
            href="/bbs"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold shadow-lg shadow-blue-600/30 transition-all transform active:scale-95"
          >
            <MessageSquare className="h-4 w-4" />
            浏览 BBS 社区
          </Link>
          <Link
            href="/market"
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 text-sm font-semibold border border-slate-700 transition-all"
          >
            <ShoppingBag className="h-4 w-4 text-emerald-400" />
            探索数字商品市场
          </Link>
        </div>
      </FadeIn>

      {/* Feature Highlights Grid */}
      <StaggerList className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400">
            <Code2 className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-base text-white">安全外部交付</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            网站不存储任何用户二进制文件，完全由经审查的 GitHub Release 提供下载通道，保障环境纯净。
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Coins className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-base text-white">Utility Credit 双账本</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Turso LibSQL 强一致性账户与不可篡改流水审计日志，确保每笔积分流向皆可溯源。
          </p>
        </div>

        <div className="p-6 rounded-2xl border border-slate-800/80 bg-slate-900/40 space-y-3">
          <div className="h-10 w-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <Award className="h-5 w-5" />
          </div>
          <h3 className="font-bold text-base text-white">Discord 身份认证</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            全站使用 Discord OAuth 授权与 HttpOnly 安全会话，免除繁琐密码管理，支持即时会话吊销。
          </p>
        </div>
      </StaggerList>

      {/* Split Section (Hot BBS Threads + Featured Marketplace Assets) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left: Hot BBS Threads */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Flame className="h-4 w-4 text-amber-400" />
              <span>热门技术讨论</span>
            </h2>
            <Link href="/bbs" className="text-xs text-blue-400 hover:text-blue-300 font-medium">
              查看全部 &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {hotThreads.map((t) => (
              <Link
                key={t.id}
                href={`/bbs/thread/${t.slug}`}
                className="block p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all"
              >
                <h3 className="font-bold text-sm text-slate-100 hover:text-blue-400 transition-colors line-clamp-1">
                  {t.title}
                </h3>
                <div className="mt-2 flex items-center justify-between text-xs text-slate-500">
                  <span>作者: {t.author.username}</span>
                  <div className="flex items-center gap-3">
                    <span>{t.likesCount} 点赞</span>
                    <span>{t.repliesCount} 回复</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Right: Featured Marketplace Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingBag className="h-4 w-4 text-emerald-400" />
              <span>精选数字商品 & 脚本</span>
            </h2>
            <Link href="/market" className="text-xs text-emerald-400 hover:text-emerald-300 font-medium">
              进入市场 &rarr;
            </Link>
          </div>

          <div className="space-y-3">
            {featuredProducts.map((p) => (
              <Link
                key={p.id}
                href={`/market/${p.slug}`}
                className="p-4 rounded-xl border border-slate-800 bg-slate-900/40 hover:bg-slate-900/80 hover:border-slate-700 transition-all flex items-center justify-between gap-4"
              >
                <div className="min-w-0 space-y-1">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800/40">
                    {p.category}
                  </span>
                  <h3 className="font-bold text-sm text-slate-100 truncate">{p.title}</h3>
                  <div className="text-xs text-slate-500">创作者: {p.developer.username}</div>
                </div>

                <div className="shrink-0 text-right space-y-1">
                  <div className="flex items-center gap-1 text-sm font-bold text-amber-400">
                    <Coins className="h-4 w-4" />
                    <span>{p.tokenPrice}</span>
                  </div>
                  <div className="text-[10px] text-slate-500">已售 {p.salesCount}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}