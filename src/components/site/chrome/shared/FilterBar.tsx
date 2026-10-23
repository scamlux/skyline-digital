"use client";

import { useState } from "react";

/**
 * Фильтр списка для вариантов Studio/Референс. Список рендерится на сервере
 * целиком, элементы помечены `data-cat`; фильтр только ставит `data-filter`
 * на контейнер `targetId`, а прячет лишнее CSS из shared.css. Без JS виден весь список.
 */
export function FilterBar({
  options,
  targetId,
  className,
  label,
}: {
  options: { value: string; label: string }[];
  targetId: string;
  className: string;
  label: string;
}) {
  const [value, setValue] = useState("all");

  const pick = (v: string) => {
    setValue(v);
    const list = document.getElementById(targetId);
    if (!list) return;
    if (v === "all") delete list.dataset.filter;
    else list.dataset.filter = v;
  };

  return (
    <div className={className} role="group" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" aria-pressed={value === o.value} onClick={() => pick(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}
