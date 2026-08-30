import { db } from "@/db";
import { reports, products, users } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { Flag, ShoppingBag } from "lucide-react";
import { ModerationRowActions } from "./mod-row-actions";

export const dynamic = "force-dynamic";

export default async function AdminModerationPage() {
  const pendingReports = await db
    .select({
      id: reports.id,
      targetType: reports.targetType,
      targetId: reports.targetId,
      reason: reports.reason,
      details: reports.details,
      createdAt: reports.createdAt,
      reporter: { username: users.username },
    })
    .from(reports)
    .innerJoin(users, eq(reports.reporterId, users.id))
    .where(eq(reports.status, "pending"))
    .orderBy(desc(reports.createdAt));

  const pendingProducts = await db
    .select({
      id: products.id,
      title: products.title,
      slug: products.slug,
      category: products.category,
      tokenPrice: products.tokenPrice,
      githubReleaseUrl: products.githubReleaseUrl,
      createdAt: products.createdAt,
      developer: { username: users.username },
    })
    .from(products)
    .innerJoin(users, eq(products.developerId, users.id))
    .where(eq(products.moderationStatus, "pending"))
    .orderBy(desc(products.createdAt));

  return (
    <div className="space-y-8">
      {/* Pending Reports Section */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <Flag className="h-4 w-4 text-red-400" />
          <span>User Reports Queue ({pendingReports.length})</span>
        </h2>

        {pendingReports.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
            No pending user reports. The community is clean!
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="p-4">Target Type</th>
                  <th className="p-4">Reason</th>
                  <th className="p-4">Reported By</th>
                  <th className="p-4">Timestamp</th>
                  <th className="p-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingReports.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-900/80 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-200 uppercase">{r.targetType}</td>
                    <td className="p-4 text-amber-400 font-medium">{r.reason}</td>
                    <td className="p-4 text-slate-300">{r.reporter.username}</td>
                    <td className="p-4 text-slate-500">{new Date(r.createdAt).toLocaleString("en-US")}</td>
                    <td className="p-4 text-right">
                      <ModerationRowActions reportId={r.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pending Product Reviews */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-emerald-400" />
          <span>Product Submission Queue ({pendingProducts.length})</span>
        </h2>

        {pendingProducts.length === 0 ? (
          <div className="p-8 text-center rounded-xl border border-slate-800 bg-slate-900/30 text-slate-400 text-xs">
            No marketplace assets awaiting approval.
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
                <tr>
                  <th className="p-4">Product Title</th>
                  <th className="p-4">Developer</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4">GitHub Release</th>
                  <th className="p-4 text-right">Review Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {pendingProducts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-900/80 transition-colors">
                    <td className="p-4 font-bold text-slate-200">{p.title}</td>
                    <td className="p-4 text-slate-300">{p.developer.username}</td>
                    <td className="p-4 text-slate-400">{p.category}</td>
                    <td className="p-4 font-bold text-amber-400">{p.tokenPrice} Credits</td>
                    <td className="p-4">
                      <a
                        href={p.githubReleaseUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-400 hover:underline truncate max-w-xs block"
                      >
                        {p.githubReleaseUrl}
                      </a>
                    </td>
                    <td className="p-4 text-right">
                      <ModerationRowActions productId={p.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}