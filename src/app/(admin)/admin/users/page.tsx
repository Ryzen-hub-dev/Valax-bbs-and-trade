import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { Users, Shield, Award } from "lucide-react";
import { UserRowActions } from "./user-row-actions";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage() {
  const allUsers = await db.select().from(users).orderBy(desc(users.createdAt)).limit(50);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-purple-400" />
            <span>User Accounts & Permissions</span>
          </h2>
          <p className="text-xs text-slate-400">
            Control platform privileges, apply bans, mutes, or revoke active sessions.
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400">
            <tr>
              <th className="p-4">User</th>
              <th className="p-4">Discord ID</th>
              <th className="p-4">Role</th>
              <th className="p-4">Reputation</th>
              <th className="p-4">Status</th>
              <th className="p-4">Joined At</th>
              <th className="p-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {allUsers.map((u) => (
              <tr key={u.id} className="hover:bg-slate-900/80 transition-colors">
                <td className="p-4 flex items-center gap-2.5">
                  {u.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full object-cover" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-300">
                      {u.username[0]}
                    </div>
                  )}
                  <span className="font-bold text-slate-200">{u.username}</span>
                </td>
                <td className="p-4 font-mono text-slate-400">{u.discordId}</td>
                <td className="p-4">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                    u.role === "admin"
                      ? "bg-purple-950 text-purple-300 border border-purple-700"
                      : u.role === "moderator"
                      ? "bg-blue-950 text-blue-300 border border-blue-700"
                      : "bg-slate-800 text-slate-300"
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="p-4 font-bold text-amber-400">{u.reputationScore}</td>
                <td className="p-4">
                  {u.isBanned ? (
                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-semibold">BANNED</span>
                  ) : u.isMuted ? (
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-semibold">MUTED</span>
                  ) : (
                    <span className="text-emerald-400 font-medium">Active</span>
                  )}
                </td>
                <td className="p-4 text-slate-500">{new Date(u.createdAt).toLocaleDateString("en-US")}</td>
                <td className="p-4 text-right">
                  <UserRowActions user={u} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}