"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Send, LogIn } from "lucide-react";
import Link from "next/link";

export function ReplyComposer({
  threadId,
  userLoggedIn,
}: {
  threadId: string;
  userLoggedIn: boolean;
}) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  if (!userLoggedIn) {
    return (
      <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/40 text-center space-y-3">
        <p className="text-xs text-slate-400">您需要使用 Discord 登录后才能参与回复与讨论。</p>
        <Link
          href="/login"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md transition-colors"
        >
          <LogIn className="h-3.5 w-3.5" />
          立即登录
        </Link>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/bbs/replies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ threadId, content }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "回复失败");
      }

      setContent("");
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-6 rounded-2xl border border-slate-800 bg-slate-900/40">
      <h3 className="text-sm font-semibold text-white">发表你的回复</h3>
      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-950/40 border border-red-500/40 text-red-300 text-xs">
          {errorMsg}
        </div>
      )}
      <textarea
        rows={4}
        required
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="友好交流与讨论... (支持 Markdown 语法与代码块)"
        className="w-full p-3.5 rounded-xl border border-slate-800 bg-slate-950/70 text-slate-100 text-sm focus:outline-none focus:border-blue-500 leading-relaxed font-mono"
      />
      <div className="flex items-center justify-between">
        <span className="text-[11px] text-slate-500">外链仅支持经校验的安全 HTTP(S) 来源</span>
        <button
          type="submit"
          disabled={isSubmitting}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold shadow-md shadow-blue-600/20 transition-all"
        >
          <Send className="h-3.5 w-3.5" />
          {isSubmitting ? "发送中..." : "发表回复"}
        </button>
      </div>
    </form>
  );
}