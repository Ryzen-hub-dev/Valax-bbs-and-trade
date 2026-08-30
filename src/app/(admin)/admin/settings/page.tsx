import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { Settings, Check, ShieldCheck } from "lucide-react";

export default async function AdminSettingsPage() {
  const allSettings = await db.select().from(systemSettings);

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Settings className="h-5 w-5 text-slate-400" />
          <span>系统功能开关与合规配置</span>
        </h2>
        <p className="text-xs text-slate-400">配置驱动的系统运行参数（仅管理员可修改生效）</p>
      </div>

      <div className="space-y-4">
        {allSettings.map((s) => (
          <div key={s.key} className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 flex items-center justify-between">
            <div>
              <div className="font-bold text-sm text-slate-200 font-mono">{s.key}</div>
              <div className="text-xs text-slate-400 mt-1">当前值: <span className="font-mono text-emerald-400">{s.value}</span></div>
            </div>
            <span className="px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold">
              已启用
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}