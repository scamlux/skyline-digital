import {
  MessagesSquare,
  Calculator,
  PenTool,
  Code2,
  Rocket,
  type LucideIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/utils";

const STEPS: {
  key: "brief" | "estimate" | "design" | "build" | "launch";
  icon: LucideIcon;
  /** Icon tile + badge accents, one per step (udevs reference). */
  tile: string;
  badge: string;
}[] = [
  {
    key: "brief",
    icon: MessagesSquare,
    tile: "horizon-gradient text-night shadow-[0_8px_24px_rgba(232,81,124,0.35)]",
    badge: "border-apricot/40 bg-apricot/10 text-apricot",
  },
  {
    key: "estimate",
    icon: Calculator,
    tile: "bg-apricot text-night shadow-[0_8px_24px_rgba(255,174,92,0.45)]",
    badge: "border-apricot/50 bg-apricot/10 text-ink",
  },
  {
    key: "design",
    icon: PenTool,
    tile: "bg-afterglow text-day shadow-[0_8px_24px_rgba(232,81,124,0.4)]",
    badge: "border-afterglow/40 bg-afterglow/10 text-afterglow",
  },
  {
    key: "build",
    icon: Code2,
    tile: "bg-night text-day shadow-[0_8px_24px_rgba(19,26,44,0.35)]",
    badge: "border-line bg-day text-muted",
  },
  {
    key: "launch",
    icon: Rocket,
    tile: "horizon-gradient text-night shadow-[0_8px_24px_rgba(255,174,92,0.4)]",
    badge: "border-afterglow/40 bg-afterglow/10 text-afterglow",
  },
];

/**
 * "How we work" as a bento of numbered cards (udevs values reference):
 * ghost step number, glowing icon tile, badge pill, divider + detail line.
 * The first step is the tall accent card on the night surface.
 */
export function ProcessSteps() {
  const t = useTranslations("home");

  return (
    <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
      {STEPS.map((step, i) => {
        const Icon = step.icon;
        const first = i === 0;
        return (
          <Reveal
            key={step.key}
            delay={i * 80}
            className={cn("h-full", first && "md:row-span-2 lg:row-span-2")}
          >
            <div
              className={cn(
                "relative flex h-full flex-col overflow-hidden rounded-2xl border p-7 transition-all duration-300 hover:-translate-y-1",
                first
                  ? "border-line-night bg-night text-day hover:shadow-[0_18px_50px_rgba(19,26,44,0.45)]"
                  : "border-line bg-surface hover:shadow-[0_14px_36px_rgba(19,26,44,0.12)]",
              )}
            >
              {/* Ghost step number */}
              <span
                className={cn(
                  "font-display pointer-events-none absolute -top-3 right-4 text-[5.5rem] font-medium leading-none",
                  first ? "text-day/10" : "text-ink/5",
                )}
                aria-hidden
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="flex items-center gap-3">
                <span
                  className={cn(
                    "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl",
                    step.tile,
                  )}
                >
                  <Icon className="h-6 w-6" strokeWidth={1.8} />
                </span>
                <span
                  className={cn(
                    "rounded-full border px-3 py-1 font-mono text-[11px] uppercase tracking-wide",
                    step.badge,
                  )}
                >
                  {t(`process.${step.key}.badge`)}
                </span>
              </div>

              <h3 className="font-display mt-6 text-xl font-medium md:text-2xl">
                {t(`process.${step.key}.title`)}
              </h3>
              <p className={cn("mt-2 leading-relaxed", first ? "text-mist" : "text-muted")}>
                {t(`process.${step.key}.text`)}
              </p>

              <div
                className={cn("mt-auto pt-5", first && "pt-8")}
                aria-hidden
              >
                <div className={cn("h-px w-full", first ? "bg-line-night" : "bg-line")} />
              </div>
              <p className={cn("mt-4 text-sm leading-relaxed", first ? "text-mist" : "text-muted")}>
                {t(`process.${step.key}.detail`)}
              </p>

              {first && (
                <div
                  className="sun-disc pointer-events-none absolute -bottom-16 -right-10 h-44 w-44 opacity-50"
                  aria-hidden
                />
              )}
            </div>
          </Reveal>
        );
      })}
    </div>
  );
}
