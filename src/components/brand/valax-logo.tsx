import React from "react";
import Image from "next/image";
import Link from "next/link";
import { BRAND } from "@/config/brand";

interface ValaxLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl";
  showText?: boolean;
  withLink?: boolean;
}

const SIZES = {
  sm: { px: 28, text: "text-xs", badge: "text-[9px]" },
  md: { px: 36, text: "text-sm", badge: "text-[10px]" },
  lg: { px: 48, text: "text-base", badge: "text-xs" },
  xl: { px: 64, text: "text-xl", badge: "text-xs" },
};

export function ValaxLogo({
  className = "",
  size = "md",
  showText = true,
  withLink = true,
}: ValaxLogoProps) {
  const currentSize = SIZES[size];

  const content = (
    <div className={`flex items-center gap-2.5 group select-none ${className}`}>
      <div className="relative shrink-0 flex items-center justify-center p-1 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-lg shadow-amber-500/10 group-hover:border-amber-500/60 group-hover:scale-105 transition-all">
        <Image
          src={BRAND.logo.png}
          alt={BRAND.logo.alt}
          width={currentSize.px}
          height={currentSize.px}
          priority
          className="object-contain drop-shadow-[0_2px_8px_rgba(245,158,11,0.4)]"
        />
      </div>

      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5 font-black text-white tracking-tight">
            <span className={currentSize.text}>{BRAND.name}</span>
            <span className={`px-1.5 py-0.5 rounded font-semibold bg-amber-500/20 text-amber-400 border border-amber-500/40 ${currentSize.badge}`}>
              {BRAND.subproject}
            </span>
          </div>
          <span className="text-[10px] text-slate-400 font-medium">Community &amp; Trade</span>
        </div>
      )}
    </div>
  );

  if (withLink) {
    return <Link href="/">{content}</Link>;
  }

  return content;
}