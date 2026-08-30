"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface MetricCounterProps {
  end: number;
  prefix?: string;
  suffix?: string;
  duration?: number;
  className?: string;
}

export function MetricCounter({
  end,
  prefix = "",
  suffix = "",
  duration = 1.6,
  className = "",
}: MetricCounterProps) {
  const [displayValue, setDisplayValue] = useState(0);
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) {
      setDisplayValue(end);
      return;
    }

    const obj = { val: 0 };
    const ctx = gsap.context(() => {
      gsap.to(obj, {
        val: end,
        duration,
        ease: "power2.out",
        onUpdate: () => {
          setDisplayValue(Math.floor(obj.val));
        },
      });
    }, containerRef);

    return () => ctx.revert();
  }, [end, duration]);

  return (
    <span ref={containerRef} className={className}>
      {prefix}
      {displayValue.toLocaleString()}
      {suffix}
    </span>
  );
}