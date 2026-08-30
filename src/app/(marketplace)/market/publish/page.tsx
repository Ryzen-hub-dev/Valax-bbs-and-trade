"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { AlertCircle, Eye, Send, Github, ShieldAlert } from "lucide-react";

export default function PublishProductPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Scripts");
  const [tokenPrice, setTokenPrice] = useState(50);
  const [version, setVersion] = useState("1.0.0");
  const [compatibility, setCompatibility] = useState("Valax Standard");
  const [changelog, setChangelog] = useState("Initial release");
  const [githubReleaseUrl, setGithubReleaseUrl] = useState("");
  const [githubRepositoryUrl, setGithubRepositoryUrl] = useState("");
  const [documentationUrl, setDocumentationUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!githubReleaseUrl.includes("github.com") || !githubReleaseUrl.includes("/releases")) {
      setErrorMsg("必须提供符合规范的 GitHub Release 外部链接 (例如: https://github.com/owner/repo/releases/tag/v1.0.0)");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/market/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          shortDescription,
          description,
          category,
          tokenPrice: Number(tokenPrice),
          version,
          compatibility,
          changelog,
          githubReleaseUrl,
          githubRepositoryUrl: githubRepositoryUrl || undefined,
          documentationUrl: documentationUrl || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "发布失败");
      }

      router.push(`/market/${data.slug}`);
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">上架数字商品 / 开发脚本</h1>
        <p className="mt-1 text-xs text-slate-400">
          遵守零文件上传政策，所有商品二进制交付必须指向通过验证的外部 GitHub Release。
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-xl border border-red-500/40 bg-red-950/30 text-red-300 text-sm flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">商品名称</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="例如: Valax Auto Cleaner Tool"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">分类</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="Scripts">Scripts (自动化脚本)</option>
              <option value="Templates">Templates (主题与模板)</option>
              <option value="Tools">Tools (独立工具箱)</option>
              <option value="Services">Services (定制与社区服务)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">一句话简要描述</label>
          <input
            type="text"
            required
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="展示在列表卡片上的简短介绍 (10-200字)..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Token 售价 (Credits)</label>
            <input
              type="number"
              min="0"
              required
              value={tokenPrice}
              onChange={(e) => setTokenPrice(Number(e.target.value))}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">发布版本</label>
            <input
              type="text"
              required
              value={version}
              onChange={(e) => setVersion(e.target.value)}
              placeholder="1.0.0"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">兼容性</label>
            <input
              type="text"
              required
              value={compatibility}
              onChange={(e) => setCompatibility(e.target.value)}
              placeholder="Valax 1.0+"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* GitHub External Links */}
        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Github className="h-4 w-4 text-emerald-400" />
            <span>外部 GitHub 交付配置 (必须校验)</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub Release 外部下载链接 *</label>
            <input
              type="url"
              required
              value={githubReleaseUrl}
              onChange={(e) => setGithubReleaseUrl(e.target.value)}
              placeholder="https://github.com/owner/repo/releases/tag/v1.0.0"
              className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub 源码/仓库链接 (选填)</label>
              <input
                type="url"
                value={githubRepositoryUrl}
                onChange={(e) => setGithubRepositoryUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">文档链接 (选填)</label>
              <input
                type="url"
                value={documentationUrl}
                onChange={(e) => setDocumentationUrl(e.target.value)}
                placeholder="https://docs.example.com"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Detailed Markdown description */}
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
                商品详情说明 (Markdown)
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
          </div>

          {activeTab === "write" ? (
            <textarea
              required
              rows={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="详细描述商品功能、安装指南、使用案例..."
              className="w-full p-4 bg-transparent text-slate-100 text-sm font-mono focus:outline-none resize-y leading-relaxed"
            />
          ) : (
            <div className="p-6 min-h-[200px] bg-slate-950/30">
              {description.trim() ? (
                <SafeMarkdown content={description} />
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">暂无内容可供预览</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-semibold shadow-lg shadow-emerald-600/25 transition-all"
          >
            <Send className="h-4 w-4" />
            {isSubmitting ? "提交中..." : "提交上架审核"}
          </button>
        </div>
      </form>
    </div>
  );
}