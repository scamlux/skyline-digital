"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { projects, projectCategories, type ProjectCategory } from "@/data/projects";
import { PreviewCard } from "./PreviewCard";
import { cn } from "@/lib/utils";

export function ProjectsGrid() {
  const t = useTranslations("projects");
  const [filter, setFilter] = useState<"all" | ProjectCategory>("all");

  const visible =
    filter === "all" ? projects : projects.filter((p) => p.category === filter);

  return (
    <div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("title")}>
        {projectCategories.map((cat) => (
          <button
            key={cat.value}
            type="button"
            role="tab"
            aria-selected={filter === cat.value}
            onClick={() => setFilter(cat.value)}
            className={cn(
              "rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-all",
              filter === cat.value
                ? "border-night bg-night text-day shadow-[0_6px_20px_rgba(19,26,44,0.25)]"
                : "border-line text-muted hover:border-ink hover:text-ink",
            )}
          >
            {t(`categories.${cat.value}`)}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-12 text-muted">{t("empty")}</p>
      ) : (
        <div className="mt-10 grid gap-10 sm:grid-cols-2">
          {visible.map((p, i) => (
            <Link key={p.slug} href={`/projects/${p.slug}`} className="group block">
              <PreviewCard
                image={p.image}
                title={p.title}
                url={p.url}
                sizes="(max-width: 640px) 100vw, 50vw"
                priority={i < 2}
              />
              <div className="mt-4 flex items-baseline justify-between gap-3">
                <span className="font-display text-lg">{p.title}</span>
                <span className="font-mono text-xs uppercase tracking-wide text-mist">
                  {p.category} · {p.year}
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-muted">{p.description}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
