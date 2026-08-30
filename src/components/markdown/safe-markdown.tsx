"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize, { defaultSchema } from "rehype-sanitize";
import rehypeHighlight from "rehype-highlight";
import "highlight.js/styles/github-dark.css";
import { validateAndSanitizeUrl } from "@/lib/url-sanitizer";

interface SafeMarkdownProps {
  content: string;
  className?: string;
}

const customSanitizeSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    code: [...(defaultSchema.attributes?.code || []), "className"],
    span: [...(defaultSchema.attributes?.span || []), "className"],
    iframe: ["src", "width", "height", "allow", "allowFullScreen", "frameBorder"],
  },
  tagNames: [...(defaultSchema.tagNames || []), "iframe"],
};

export function SafeMarkdown({ content, className = "" }: SafeMarkdownProps) {
  return (
    <div className={`prose prose-invert max-w-none break-words text-sm md:text-base leading-relaxed ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[
          [rehypeSanitize, customSanitizeSchema],
          [rehypeHighlight, { ignoreMissing: true }],
        ]}
        components={{
          a: ({ href, children, ...props }) => {
            if (!href) return <span>{children}</span>;
            const check = validateAndSanitizeUrl(href);
            if (!check.isValid) {
              return <span className="text-red-400 underline decoration-dotted title='Blocked insecure link'">{children}</span>;
            }
            return (
              <a
                href={check.sanitizedUrl}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="text-blue-400 hover:text-blue-300 underline font-medium transition-colors"
                {...props}
              >
                {children}
              </a>
            );
          },
          img: ({ src, alt, ...props }) => {
            if (!src) return null;
            const check = validateAndSanitizeUrl(src);
            if (!check.isValid) return null;
            return (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={check.sanitizedUrl}
                alt={alt || "Media"}
                loading="lazy"
                className="rounded-lg border border-slate-700/60 max-h-96 w-auto object-cover my-3 shadow-md"
                {...props}
              />
            );
          },
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-lg border border-slate-800 bg-slate-900/50">
              <table className="w-full text-left text-sm text-slate-300">{children}</table>
            </div>
          ),
          th: ({ children }) => (
            <th className="bg-slate-800/80 px-4 py-2 font-semibold text-slate-100 border-b border-slate-700">{children}</th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 border-b border-slate-800/60 text-slate-300">{children}</td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}