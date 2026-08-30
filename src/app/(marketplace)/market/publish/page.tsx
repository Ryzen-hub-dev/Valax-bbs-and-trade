"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SafeMarkdown } from "@/components/markdown/safe-markdown";
import { AlertCircle, Eye, Send, Github, ShieldCheck, CheckCircle2, Terminal, Code2 } from "lucide-react";

export default function PublishProductPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Tools");
  const [tokenPrice, setTokenPrice] = useState(100);
  const [version, setVersion] = useState("1.0.0");
  const [releaseTag, setReleaseTag] = useState("v1.0.0");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [releaseUrl, setReleaseUrl] = useState("");
  const [releaseChecksum, setReleaseChecksum] = useState("");
  const [licenseTerms, setLicenseTerms] = useState("Standard Valax Developer License");
  const [supportUrl, setSupportUrl] = useState("");
  const [documentationUrl, setDocumentationUrl] = useState("");
  const [activeTab, setActiveTab] = useState<"write" | "preview">("write");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleRepoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setRepositoryUrl(val);
    if (val.startsWith("https://github.com/") && releaseTag && !releaseUrl) {
      const cleanRepo = val.replace(/\/+$/, "");
      setReleaseUrl(`${cleanRepo}/releases/tag/${releaseTag}`);
    }
  };

  const handleTagChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const tag = e.target.value;
    setReleaseTag(tag);
    if (repositoryUrl.startsWith("https://github.com/")) {
      const cleanRepo = repositoryUrl.replace(/\/+$/, "");
      setReleaseUrl(`${cleanRepo}/releases/tag/${tag}`);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (!repositoryUrl.startsWith("https://github.com/")) {
      setErrorMsg("Repository URL must be a valid GitHub URL (e.g. https://github.com/owner/repo)");
      return;
    }

    if (!releaseUrl.startsWith("https://github.com/") || !releaseUrl.includes("/releases/tag/")) {
      setErrorMsg("Release URL must be a valid GitHub Release Tag URL (e.g. https://github.com/owner/repo/releases/tag/v1.0.0)");
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
          releaseTag,
          repositoryUrl,
          releaseUrl,
          releaseChecksum: releaseChecksum.trim() || undefined,
          licenseTerms,
          supportUrl: supportUrl.trim() || undefined,
          documentationUrl: documentationUrl.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit product");
      }

      router.push("/dashboard/inventory");
    } catch (err: any) {
      setErrorMsg(err.message);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-4">
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full badge-cyan text-xs font-semibold">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
          <span>Automated Verified Delivery System</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
          Publish Verified Developer Asset
        </h1>
        <p className="text-xs text-neutral-400 leading-relaxed font-normal">
          In strict compliance with our zero server binary policy, deliverables must point to an active, verified external GitHub Release. Direct file uploads and manual customer messaging are strictly prohibited.
        </p>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl border border-red-500/40 bg-red-950/30 text-red-300 text-xs flex items-center gap-3">
          <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="p-6 rounded-2xl border border-white/[0.08] bg-obsidian-950/80 space-y-4 shadow-xl">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <Code2 className="h-4 w-4 text-amber-400" />
            <span>Product Metadata</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Asset Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Valax Automation CLI Toolset"
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-obsidian-900 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Category *</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-white/[0.08] bg-obsidian-900 text-neutral-200 text-xs focus:outline-none focus:border-cyan-500"
              >
                <option value="Tools">Tools (CLI & Binaries)</option>
                <option value="Scripts">Scripts (Automation & Logic)</option>
                <option value="Templates">Templates (UI & Boilerplates)</option>
                <option value="Services">Services (Engines & Modules)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Short Summary (10-255 characters) *</label>
            <input
              type="text"
              required
              value={shortDescription}
              onChange={(e) => setShortDescription(e.target.value)}
              placeholder="High-impact synopsis displayed on catalog cards..."
              className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-obsidian-900 text-white text-xs focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Price (Utility Credits) *</label>
              <input
                type="number"
                min="1"
                max="1000000"
                required
                value={tokenPrice}
                onChange={(e) => setTokenPrice(Number(e.target.value))}
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-obsidian-900 text-white text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Release Version *</label>
              <input
                type="text"
                required
                value={version}
                onChange={(e) => setVersion(e.target.value)}
                placeholder="2.4.0"
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-obsidian-900 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1.5">Exact Release Tag *</label>
              <input
                type="text"
                required
                value={releaseTag}
                onChange={handleTagChange}
                placeholder="v2.4.0"
                className="w-full px-4 py-2.5 rounded-xl border border-white/[0.08] bg-obsidian-900 text-white text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* GitHub Delivery Invariants */}
        <div className="p-6 rounded-2xl border border-cyan-500/20 bg-obsidian-950/90 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 text-sm font-bold text-cyan-300">
            <Github className="h-4 w-4" />
            <span>GitHub Delivery & Verification Engine</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">GitHub Repository URL *</label>
              <input
                type="url"
                required
                value={repositoryUrl}
                onChange={handleRepoChange}
                placeholder="https://github.com/owner/repository"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-obsidian-900 text-neutral-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">GitHub Release Tag URL *</label>
              <input
                type="url"
                required
                value={releaseUrl}
                onChange={(e) => setReleaseUrl(e.target.value)}
                placeholder="https://github.com/owner/repository/releases/tag/v2.4.0"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-obsidian-900 text-neutral-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">SHA-256 Integrity Checksum (Recommended)</label>
              <input
                type="text"
                value={releaseChecksum}
                onChange={(e) => setReleaseChecksum(e.target.value)}
                placeholder="64-char hexadecimal hash (e.g. e3b0c44298fc1c14...)"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-obsidian-900 text-neutral-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">License & Usage Terms</label>
              <input
                type="text"
                value={licenseTerms}
                onChange={(e) => setLicenseTerms(e.target.value)}
                placeholder="e.g. MIT License / Valax Developer EULA"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-obsidian-900 text-neutral-200 text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Documentation URL (Optional)</label>
              <input
                type="url"
                value={documentationUrl}
                onChange={(e) => setDocumentationUrl(e.target.value)}
                placeholder="https://docs.example.com"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-obsidian-900 text-neutral-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-300 mb-1">Support URL (Optional - For售后 support only)</label>
              <input
                type="url"
                value={supportUrl}
                onChange={(e) => setSupportUrl(e.target.value)}
                placeholder="https://discord.gg/... or https://github.com/owner/repo/issues"
                className="w-full px-3.5 py-2.5 rounded-xl border border-white/[0.08] bg-obsidian-900 text-neutral-200 text-xs font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Detailed Markdown Description */}
        <div className="rounded-2xl border border-white/[0.08] bg-obsidian-950/80 overflow-hidden shadow-xl">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-white/[0.06] bg-obsidian-900">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setActiveTab("write")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  activeTab === "write" ? "bg-obsidian-850 text-white" : "text-neutral-400 hover:text-white"
                }`}
              >
                Detailed Description (Markdown)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1 ${
                  activeTab === "preview" ? "bg-obsidian-850 text-white" : "text-neutral-400 hover:text-white"
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
              className="w-full p-4 bg-transparent text-neutral-100 text-xs font-mono focus:outline-none resize-y leading-relaxed"
            />
          ) : (
            <div className="p-6 min-h-[200px] bg-obsidian-950/30">
              {description.trim() ? (
                <SafeMarkdown content={description} />
              ) : (
                <div className="text-center py-8 text-neutral-500 text-xs">Nothing to preview yet</div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-obsidian-950 text-xs font-black shadow-lg shadow-cyan-500/20 transition-all active:scale-95"
          >
            <Send className="h-4 w-4" />
            <span>{isSubmitting ? "Verifying & Submitting..." : "Verify Release & Submit for Moderation"}</span>
          </button>
        </div>
      </form>
    </div>
  );
}