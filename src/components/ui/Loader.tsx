"use client";

import { useEffect, useState } from "react";

/**
 * "Sunrise curtain" loading screen: the horizon draws, the sun rises over it,
 * the wordmark settles — then the whole curtain lifts. Shown once per browser
 * session; disabled entirely under prefers-reduced-motion (CSS).
 */
export function Loader() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (sessionStorage.getItem("skyline-loaded")) return;
    sessionStorage.setItem("skyline-loaded", "1");
    // Defer out of the effect body (microtasks flush before paint, so no flash)
    // to avoid the synchronous setState cascade the linter flags.
    queueMicrotask(() => setShow(true));
    // Unmount just after the curtain finishes lifting (~1.2s in CSS) — keeps the
    // sunrise intro but halves how long the screen is covered, for a better
    // mobile Speed Index.
    const t = setTimeout(() => setShow(false), 1300);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div
      className="loader-overlay fixed inset-0 z-[100] flex flex-col items-center justify-center bg-night"
      aria-hidden
    >
      {/* 1.5× larger than before (w-64→w-96, sun 64→96px) */}
      <div className="relative w-96">
        {/* Clip window sits ON the horizon line: its bottom edge is the line, so
            anything below is hidden — the sun rises out from behind the line. */}
        <div className="absolute inset-x-0 bottom-0 h-56 overflow-hidden">
          <div className="loader-sun sun-disc sun-aurora absolute bottom-0 left-1/2 h-24 w-24" />
        </div>
        {/* Horizon line, drawn on top so the sun emerges from behind it */}
        <div className="loader-line horizon-gradient relative z-10 h-px w-full" />
      </div>
      <p className="loader-logo font-display mt-9 text-center text-lg font-medium text-day">
        skyline<span className="text-apricot">.</span>digital
      </p>
    </div>
  );
}
