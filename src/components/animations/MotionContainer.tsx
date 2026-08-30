"use client";

import React, { useEffect, useRef } from "react";
import gsap from "gsap";

interface MotionContainerProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  stagger?: number;
  direction?: "up" | "down" | "left" | "right" | "fade";
}

export function MotionContainer({
  children,
  className = "",
  delay = 0,
  stagger = 0.08,
  direction = "up",
}: MotionContainerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Respect prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion || !containerRef.current) return;

    let x = 0;
    let y = 0;
    if (direction === "up") y = 24;
    if (direction === "down") y = -24;
    if (direction === "left") x = 24;
    if (direction === "right") x = -24;

    const ctx = gsap.context(() => {
      const targets = containerRef.current?.children;
      if (targets && targets.length > 0) {
        gsap.from(targets, {
          opacity: 0,
          x,
          y,
          duration: 0.7,
          stagger,
          delay,
          ease: "power3.out",
          clearProps: "all",
        });
      }
    }, containerRef);

    return () => ctx.revert();
  }, [delay, stagger, direction]);

  return (
    <div ref={containerRef} className={className}>
      {children}
    </div>
  );
}