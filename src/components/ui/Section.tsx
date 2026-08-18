import { cn } from "@/lib/utils";

/**
 * Section with the signature horizon rule. The eyebrow label sits ON the
 * line — text straddling the horizon, like a building on a skyline.
 */
export function Section({
  eyebrow,
  children,
  className,
  tone = "day",
  id,
}: {
  eyebrow: string;
  children: React.ReactNode;
  className?: string;
  tone?: "day" | "night";
  id?: string;
}) {
  const night = tone === "night";
  return (
    <section id={id} className={cn(night ? "bg-night text-day" : "bg-day", className)}>
      <div className="relative">
        <div
          className={cn("h-px w-full", night ? "bg-line-night" : "bg-line")}
          aria-hidden
        />
        <span
          className={cn(
            "absolute left-5 top-0 -translate-y-1/2 px-2 font-mono text-xs uppercase tracking-[0.2em] md:left-8",
            night ? "bg-night text-mist" : "bg-day text-muted",
          )}
        >
          {eyebrow}
        </span>
      </div>
      <div className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-24">{children}</div>
    </section>
  );
}
