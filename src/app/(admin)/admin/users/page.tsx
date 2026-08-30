import { db } from "@/db";
import { users } from "@/db/schema";
import { desc } from "drizzle-orm";
import { UserRowActions } from "./user-row-actions";
import { Users, Award, Shield } from "lucide-react";

export default async function AdminUsersPage() {
  const userList = await db.select().from(users).orderBy(desc(users.createdAt)).limit(100);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-400" />
            <span>用户与权限管理</span>
          </h2>
          <p className="text-xs text-slate-400">查看注册用户、封禁状态、角色以及一键吊销会话</p>
        </div>
        <span className="text-xs text-slate-500">共 {userList.length} 位用户</span>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-900/50 shadow-xl">
        <table className="w-full text-left text-xs text-slate-300">
          <thead className="bg-slate-950/80 text-slate-400 font-semibold border-b border-slate-800">
            <tr>
              <th className="p-3.5">用户名 / 头像</th>
              <th className="p-3.5">Discord ID</th>
              <th className="p-3.5">角色</th>
              <th className="p-3.5">声望</th>
              <th className="p-3.5">状态</th>
              <th className="p-3.5">注册时间</th>
              <th className="p-3.5 text-right">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {userList.map((u) => (
              <tr key={u.id} className="hover:bg-slate-800/40 transition-colors">
                <td className="p-3.5 flex items-center gap-2.5">
                  {u.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatarUrl} alt="" className="h-7 w-7 rounded-full border border-slate-700" />
                  ) : (
                    <div className="h-7 w-7 rounded-full bg-slate-800 flex items-center justify-center font-bold text-[10px]">
                      {u.username[0]}
                    </div>
                  )}
                  <span className="font-semibold text-slate-200">{u.username}</span>
                </td>
                <td className="p-3.5 font-mono text-slate-400">{u.discordId}</td>
                <td className="p-3.5">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      u.role === "admin"
                        ? "bg-purple-950 text-purple-300 border border-purple-700"
                        : "bg-slate-800 text-slate-300"
                    }`}
                  >
                    {u.role.toUpperCase()}
                  </span>
                </td>
                <td className="p-3.5 text-amber-400 font-bold">{u.reputationScore}</td>
                <td className="p-3.5">
                  {u.isBanned ? (
                    <span className="px-2 py-0.5 rounded bg-red-950 text-red-400 border border-red-800 font-bold text-[10px]">
                      已封禁
                    </span>
                  ) : u.isMuted ? (
                    <span className="px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800 font-bold text-[10px]">
                      已禁言
                    </span>
                  ) : (
                    <span className="text-emerald-400 text-[11px] font-medium">正常</span>
                  )}
                </td>
                <td className="p-3.5 text-slate-500 font-mono">
                  {new Date(u.createdAt).toLocaleDateString("zh-CN")}
                </td>
                <td className="p-3.5 text-right">
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