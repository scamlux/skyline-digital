"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { stack, stackCategories, type StackCategory } from "@/data/stack";

/** Сколько технологий видно до «Показать весь стек» — как в старом TechStack. */
const DEFAULT_VISIBLE = 12;

/**
 * Стек технологий для вариантов Studio/Референс — те же данные и логика, что у
 * старого `TechStack` (категории, «показать весь стек»). Иконки монохромные через
 * CSS-маску (`--i`), поэтому читаются на тёмном и светлом фоне; цвет — из варианта.
 * Классы `v-stack*` оформлены в studio.css / ref.css.
 */
export function StackGrid() {
  const t = useTranslations("home.stack");
  const [filter, setFilter] = useState<"all" | StackCategory>("all");
  const [expanded, setExpanded] = useState(false);

  const filtered = filter === "all" ? stack : stack.filter((s) => s.category === filter);
  const visible = expanded ? filtered : filtered.slice(0, DEFAULT_VISIBLE);

  return (
    <div className="v-stack">
      <div className="v-stack-tabs" role="group" aria-label={t("title")}>
        {stackCategories.map((cat) => (
          <button
            key={cat}
            type="button"
            aria-pressed={filter === cat}
            onClick={() => {
              setFilter(cat);
              setExpanded(false);
            }}
          >
            {t(`categories.${cat}`)}
          </button>
        ))}
      </div>
      <ul className="v-stack-grid">
        {visible.map((item) => (
          <li key={`${item.category}-${item.name}`}>
            <span className="ic" style={{ "--i": `url(${item.icon})` } as React.CSSProperties} aria-hidden="true" />
            {item.name}
          </li>
        ))}
      </ul>
      {filtered.length > DEFAULT_VISIBLE && (
        <button type="button" className="v-stack-more" aria-expanded={expanded} onClick={() => setExpanded((v) => !v)}>
          {expanded ? t("showLess") : t("showAll")}
        </button>
      )}
    </div>
  );
}
