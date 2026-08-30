export function Footer() {
  return (
    <footer className="border-t border-slate-800/80 bg-slate-950/90 py-8 text-xs text-slate-400">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-4 text-center sm:text-left">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="font-bold text-slate-200">Valax Scrub BBS & Trade</span>
            <span className="text-slate-600">|</span>
            <span>https://bbs-and-trade.valaxscrub.shop</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>Serverless Edge Ready</span>
            <span>•</span>
            <span>Turso LibSQL Dual-Ledger</span>
          </div>
        </div>

        {/* Mandatory Non-Financial Disclaimer */}
        <div className="p-3.5 rounded-lg border border-slate-800 bg-slate-900/50 text-[11px] text-slate-400 leading-relaxed">
          <strong className="text-slate-300">特别法律与业务合规说明：</strong>
          Valax Token（站内积分）仅定义为 Valax Scrub 站内非金融 Utility Credit，仅用于购买站内数字商品、服务与社区权益，不代表股份、债权、证券、投资份额或收益承诺。本站严禁现金提现、真实投资承诺、博彩或非法交易。
        </div>
      </div>
    </footer>
  );
}