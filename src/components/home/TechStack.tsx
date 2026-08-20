"use client";

import Image from "next/image";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { stack, stackCategories, type StackCategory } from "@/data/stack";
import { cn } from "@/lib/utils";

/**
 * Tech stack grid with category filter (udevs.io reference), rebuilt in the
 * Skyline design system: pill tabs + icon cards on the day surface.
 */
export function TechStack() {
  const t = useTranslations("home.stack");
  const [filter, setFilter] = useState<"all" | StackCategory>("all");

  const visible = filter === "all" ? stack : stack.filter((s) => s.category === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("title")}>
        {stackCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            role="tab"
            aria-selected={filter === cat}
            onClick={() => setFilter(cat)}
            className={cn(
              "rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-all",
              filter === cat
                ? "border-night bg-night text-day shadow-[0_6px_20px_rgba(19,26,44,0.25)]"
                : "border-line text-muted hover:border-ink hover:text-ink",
            )}
          >
            {t(`categories.${cat}`)}
          </button>
        ))}
      </div>

      <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
        {visible.map((item) => (
          <div
            key={`${item.category}-${item.name}`}
            className="group flex flex-col items-center gap-3 rounded-xl border border-line bg-day px-4 py-6 transition-all duration-300 hover:-translate-y-1 hover:border-ink/30 hover:shadow-[0_14px_36px_rgba(19,26,44,0.12)]"
          >
            <Image
              src={item.icon}
              alt=""
              width={36}
              height={36}
              className="h-9 w-9 transition-transform duration-300 group-hover:scale-110"
              unoptimized
            />
            <span className="text-center text-sm font-medium">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
