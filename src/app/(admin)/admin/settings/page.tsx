import { db } from "@/db";
import { systemSettings } from "@/db/schema";
import { Sliders, ShieldCheck } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function AdminSettingsPage() {
  const settings = await db.select().from(systemSettings);

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Sliders className="h-5 w-5 text-purple-400" />
          <span>System Feature Flags & Policies</span>
        </h2>
        <p className="text-xs text-slate-400">
          Configure runtime platform policies, rate limits, and market commission percentages.
        </p>
      </div>

      <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/40 space-y-6">
        <div className="space-y-4">
          {settings.map((s) => (
            <div
              key={s.key}
              className="flex items-center justify-between p-4 rounded-xl border border-slate-800 bg-slate-950/60"
            >
              <div>
                <div className="text-sm font-bold text-white font-mono">{s.key}</div>
                <div className="text-xs text-slate-400">System runtime configuration flag</div>
              </div>
              <div className="font-mono text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-purple-300">
                {s.value}
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 rounded-xl bg-purple-950/20 border border-purple-800/40 text-xs text-purple-300 space-y-1">
          <div className="flex items-center gap-1 font-semibold">
            <ShieldCheck className="h-4 w-4 text-purple-400" />
            <span>Zero-Restart Dynamic Configuration</span>
          </div>
          <p>
            Feature flags and platform fee splits update dynamically across edge nodes with automatic cache invalidation.
          </p>
        </div>
      </div>
    </div>
  );
}