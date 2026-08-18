"use client";

import { useRef } from "react";

/**
 * Mouse-follow warm spotlight for night sections. Wrap the section content;
 * the glow tracks the cursor via CSS vars — zero re-renders.
 */
export function Spotlight({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  function onMove(e: React.MouseEvent<HTMLDivElement>) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - rect.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - rect.top}px`);
  }

  return (
    <div ref={ref} onMouseMove={onMove} className="relative">
      <div className="spotlight" aria-hidden />
      {children}
    </div>
  );
}
