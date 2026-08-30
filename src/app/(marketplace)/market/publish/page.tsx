"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { AlertCircle, Eye, Send, Github } from "lucide-react";

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
      setErrorMsg("You must provide a valid external GitHub Release URL (e.g., https://github.com/owner/repo/releases/tag/v1.0.0)");
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
        throw new Error(data.error || "Failed to submit product");
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
        <h1 className="text-2xl font-bold text-white">Publish Digital Asset / Developer Script</h1>
        <p className="mt-1 text-xs text-slate-400">
          In compliance with our zero binary upload policy, all deliverables must link to a verified external GitHub Release.
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Asset Title</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Valax Auto Tooling Script"
              className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-200 text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="Scripts">Scripts (Automation & Logic)</option>
              <option value="Templates">Templates (Themes & Blueprints)</option>
              <option value="Tools">Tools (Standalone Utilities)</option>
              <option value="Services">Services (Custom Development)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Short Summary (10-200 characters)</label>
          <input
            type="text"
            required
            value={shortDescription}
            onChange={(e) => setShortDescription(e.target.value)}
            placeholder="Brief overview displayed on marketplace cards..."
            className="w-full px-4 py-2.5 rounded-xl border border-slate-800 bg-slate-900 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Price (Credits)</label>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Version</label>
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
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Compatibility</label>
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

        <div className="p-5 rounded-xl border border-slate-800 bg-slate-900/40 space-y-4">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-200">
            <Github className="h-4 w-4 text-emerald-400" />
            <span>GitHub Delivery Configuration (Strictly Verified)</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">GitHub Release Download URL *</label>
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
              <label className="block text-xs font-semibold text-slate-300 mb-1">Source Repository URL (Optional)</label>
              <input
                type="url"
                value={githubRepositoryUrl}
                onChange={(e) => setGithubRepositoryUrl(e.target.value)}
                placeholder="https://github.com/owner/repo"
                className="w-full px-3.5 py-2 rounded-lg border border-slate-800 bg-slate-950 text-slate-200 text-xs font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Documentation URL (Optional)</label>
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
                Description (Markdown)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  activeTab === "preview" ? "bg-slate-800 text-white" : "text-slate-400 hover:text-slate-200"
                }`}
              >
                <Eye className="h-3.5 w-3.5" />
                Live Preview
              </button>
            </div>
          </div>

          {activeTab === "write" ? (
            <textarea
              required
              rows={10}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe feature breakdown, installation guidelines, prerequisites..."
              className="w-full p-4 bg-transparent text-slate-100 text-sm font-mono focus:outline-none resize-y leading-relaxed"
            />
          ) : (
            <div className="p-6 min-h-[200px] bg-slate-950/30">
              {description.trim() ? (
                <SafeMarkdown content={description} />
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs">Nothing to preview yet</div>
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
            {isSubmitting ? "Submitting..." : "Submit for Moderation"}
          </button>
        </div>
      </form>
    </div>
  );
}