"use client";

import { useState } from "react";

/**
 * Фильтр списка для вариантов Studio/Референс. Список рендерится на сервере
 * целиком, элементы помечены `data-cat`; фильтр ставит `data-filter` на контейнер
 * `targetId` и `hidden` на несовпадающие элементы. Без JS виден весь список.
 * Пустая категория — сообщение `emptyText` (как в старом каталоге), оно же
 * объявляется скринридерам через live-регион.
 */
export function FilterBar({
  options,
  targetId,
  className,
  label,
  emptyText,
}: {
  options: { value: string; label: string }[];
  targetId: string;
  className: string;
  label: string;
  emptyText: string;
}) {
  const [value, setValue] = useState("all");
  const [empty, setEmpty] = useState(false);

  const pick = (v: string) => {
    setValue(v);
    const list = document.getElementById(targetId);
    if (!list) return;
    if (v === "all") delete list.dataset.filter;
    else list.dataset.filter = v;
    // Универсально для любых категорий: несовпадающим элементам — hidden.
    let shown = 0;
    list.querySelectorAll<HTMLElement>(":scope > [data-cat]").forEach((el) => {
      const match = v === "all" || el.dataset.cat === v;
      el.hidden = !match;
      if (match) shown++;
    });
    setEmpty(shown === 0);
  };

  return (
    <>
      <div className={className} role="group" aria-label={label}>
        {options.map((o) => (
          <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => pick(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
      <p className="v-filter-empty" role="status">
        {empty ? emptyText : ""}
      </p>
    </>
  );
}
