"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { AlertCircle, Eye, Send } from "lucide-react";

interface BoardOption {
  id: string;
  name: string;
}

export default function NewThreadPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedBoardId = searchParams.get("boardId") || "";

  const [boards, setBoards] = useState<BoardOption[]>([]);
  const [boardId, setBoardId] = useState(preselectedBoardId);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch("/api/bbs/boards")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setBoards(data);
          if (!boardId && data.length > 0) setBoardId(data[0].id);
        }
      })
      .catch(() => {});
  }, [boardId]);

  const handleAddTag = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, "");
      if (val && !tags.includes(val) && tags.length < 5) {
        setTags([...tags, val]);
        setTagInput("");
      }
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(tags.filter((t) => t !== tag));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!title.trim() || !content.trim() || !boardId) {
      setErrorMsg("请完整填写标题、内容并选择目标版块");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/bbs/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ boardId, title, content, tags }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "发布失败");
      }

      router.push(`/bbs/thread/${data.slug}`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">发布新讨论帖子</h1>
        <p className="mt-1 text-xs text-slate-400">
          支持 GitHub 外链、代码高亮与安全 Markdown 格式。请遵守社区守则，勿发违规内容。
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-500/40 bg-red-950/30 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">发布版块</label>
            <select
              value={boardId}
              onChange={(e) => setBoardId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 text-sm focus:outline-none focus:border-blue-500"
            >
              {boards.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">帖子标题</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="清晰、简明地描述你的主题..."
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 text-sm focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">标签 (最多 5 个，回车添加)</label>
          <div className="flex flex-wrap items-center gap-2 p-2 rounded-xl border border-slate-800 bg-slate-900">
            {tags.map((t) => (
              <span
                key={t}
                className="px-2.5 py-1 rounded-lg bg-blue-950/60 border border-blue-700/50 text-blue-300 text-xs flex items-center gap-1.5"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="hover:text-red-400 text-slate-400 font-bold"
                >
                  &times;
                </button>
              </span>
            ))}
            {tags.length < 5 && (
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder="输入标签名..."
                className="bg-transparent text-xs text-slate-200 focus:outline-none px-2 py-1 flex-1 min-w-[120px]"
              />
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-800 bg-slate-950/60">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("write")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "write" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                编辑内容 (Markdown)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  activeTab === "preview" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                实时预览
              </button>
            </div>
            <span className="text-[11px] text-slate-500">支持代码块、GitHub 外链图片、表格</span>
          </div>

          {activeTab === "write" ? (
            <textarea
              required
              rows={12}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="在此编写正文内容..."
              className="w-full p-4 bg-transparent text-slate-100 text-sm font-mono focus:outline-none resize-y leading-relaxed"
            />
          ) : (
            <div className="p-6 min-h-[250px] bg-slate-950/30">
              {content.trim() ? (
                <SafeMarkdown content={content} />
              ) : (
                <div className="text-center py-12 text-slate-500 text-xs">暂无内容可供预览</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-4">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-blue-600/25 transition-all"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "正在发布..." : "立即发布帖子"}
          </button>
        </div>
      </form>
    </div>
  );
}