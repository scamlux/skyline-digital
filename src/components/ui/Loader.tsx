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
    setShow(true);
    const t = setTimeout(() => setShow(false), 2400);
    return () => clearTimeout(t);
  }, []);

  if (!show) return null;

  return (
    <div
      className="loader-overlay fixed inset-0 z-[100] flex items-center justify-center bg-night"
      aria-hidden
    >
      <div className="relative w-64">
        {/* Sun rising, clipped by the horizon line */}
        <div className="absolute inset-x-0 -top-24 bottom-1/2 overflow-hidden">
          <div className="loader-sun sun-disc sun-aurora absolute left-1/2 top-full h-16 w-16" />
        </div>
        <div className="loader-line horizon-gradient h-px w-full" />
        <p className="loader-logo font-display mt-5 text-center text-sm font-medium text-day">
          skyline<span className="text-apricot">.</span>digital
        </p>
      </div>
    </div>
  );
}
