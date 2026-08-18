"use client";

/**
 * Signature progress indicator: the sun travels along the horizon from step 1
 * to the final step — sunrise as progress. Encodes real information (progress)
 * in the site's key metaphor.
 */
export function SunProgress({
  step,
  total,
  labels,
}: {
  step: number;
  total: number;
  labels: string[];
}) {
  const pct = total <= 1 ? 100 : (step / (total - 1)) * 100;

  return (
    <div aria-hidden className="select-none">
      <div className="relative h-8">
        {/* Horizon */}
        <div className="absolute inset-x-0 top-1/2 h-px bg-line-night" />
        {/* Lit part of the horizon */}
        <div
          className="horizon-gradient absolute top-1/2 h-px transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
        {/* The sun */}
        <div
          className="sun-disc absolute top-1/2 h-5 w-5 -translate-x-1/2 -translate-y-1/2 shadow-[0_0_24px_rgba(255,174,92,0.55)] transition-all duration-500 ease-out"
          style={{ left: `${pct}%` }}
        />
      </div>
      <div className="mt-2 hidden justify-between font-mono text-[11px] uppercase tracking-wide text-mist sm:flex">
        {labels.map((label, i) => (
          <span key={label} className={i <= step ? "text-day" : undefined}>
            {label}
          </span>
        ))}
      </div>
    </div>
  );
}
