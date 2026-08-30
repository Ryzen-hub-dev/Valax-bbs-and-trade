"use client";

import React, { useState } from "react";
import { ThumbsUp, Bookmark, Flag, Check } from "lucide-react";

export function InteractiveActions({
  threadId,
  initialLiked,
  initialBookmarked,
  initialLikesCount,
}: {
  threadId: string;
  initialLiked: boolean;
  initialBookmarked: boolean;
  initialLikesCount: number;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [bookmarked, setBookmarked] = useState(initialBookmarked);
  const [likesCount, setLikesCount] = useState(initialLikesCount);
  const [showReport, setShowReport] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSuccess, setReportSuccess] = useState(false);

  const handleLike = async () => {
    try {
      const next = !liked;
      setLiked(next);
      setLikesCount((prev) => (next ? prev + 1 : Math.max(0, prev - 1)));

      await fetch("/api/bbs/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "like", targetType: "thread", targetId: threadId }),
      });
    } catch {}
  };

  const handleBookmark = async () => {
    try {
      const next = !bookmarked;
      setBookmarked(next);

      await fetch("/api/bbs/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "bookmark", targetType: "thread", targetId: threadId }),
      });
    } catch {}
  };

  const handleSendReport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportReason.trim()) return;

    try {
      await fetch("/api/bbs/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType: "thread",
          targetId: threadId,
          reason: reportReason,
        }),
      });
      setReportSuccess(true);
      setTimeout(() => {
        setShowReport(false);
        setReportSuccess(false);
      }, 1500);
    } catch {}
  };

  return (
    <div className="flex items-center gap-2 relative">
      <button
        onClick={handleLike}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
          liked
            ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
            : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
        }`}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
        <span>{likesCount}</span>
      </button>

      <button
        onClick={handleBookmark}
        className={`p-1.5 rounded-lg text-xs transition-all ${
          bookmarked
            ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
            : "bg-slate-800/80 text-slate-300 hover:bg-slate-700"
        }`}
        title="收藏本帖"
      >
        <Bookmark className="h-4 w-4" />
      </button>

      <button
        onClick={() => setShowReport(!showReport)}
        className="p-1.5 rounded-lg bg-slate-800/80 text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-all text-xs"
        title="举报内容"
      >
        <Flag className="h-4 w-4" />
      </button>

      {showReport && (
        <div className="absolute right-0 top-10 w-72 p-4 rounded-xl border border-slate-700 bg-slate-900 shadow-2xl z-30 space-y-3">
          <h4 className="text-xs font-bold text-slate-200">举报该主题</h4>
          {reportSuccess ? (
            <div className="flex items-center gap-2 text-xs text-emerald-400">
              <Check className="h-4 w-4" />
              <span>举报已提交，感谢您的监督！</span>
            </div>
          ) : (
            <form onSubmit={handleSendReport} className="space-y-3">
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                required
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 text-xs focus:outline-none"
              >
                <option value="">选择违规原因...</option>
                <option value="spam">垃圾广告 / 恶意灌水</option>
                <option value="malware">可疑恶意代码 / 欺诈外链</option>
                <option value="abuse">侮辱谩骂 / 违规言论</option>
                <option value="other">其他违规</option>
              </select>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowReport(false)}
                  className="px-2.5 py-1 rounded text-xs text-slate-400 hover:text-slate-200"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-xs font-semibold"
                >
                  确认举报
                </button>
              </div>
            </form>
          )}
        </div>
      )}
    </div>
  );
}