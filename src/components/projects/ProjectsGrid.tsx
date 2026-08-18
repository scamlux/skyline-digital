"use client";

import { useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { projects, projectCategories, type ProjectCategory } from "@/data/projects";
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
              "rounded-full border px-4 py-2 font-mono text-xs uppercase tracking-wide transition-colors",
              filter === cat.value
                ? "border-night bg-night text-day"
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
        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          {visible.map((p) => (
            <Link key={p.slug} href={`/projects/${p.slug}`} className="group block">
              <div className="relative flex aspect-[16/10] items-end overflow-hidden rounded-xl bg-night transition-transform duration-300 group-hover:-translate-y-1">
                <Image
                  src={p.image}
                  alt={p.title}
                  fill
                  sizes="(max-width: 640px) 100vw, 50vw"
                  className="object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div
                  className="absolute inset-0 bg-gradient-to-t from-night/80 via-transparent to-transparent"
                  aria-hidden
                />
                <span className="font-display relative p-6 text-xl text-day">
                  {p.title}
                </span>
              </div>
              <div className="mt-4 flex items-start justify-between gap-4">
                <p className="text-sm leading-relaxed text-muted">{p.description}</p>
              </div>
              <p className="mt-2 font-mono text-xs uppercase tracking-wide text-mist">
                {p.category} · {p.year}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
