"use client";

import { useRouter, useSearchParams } from "next/navigation";

const SELECT = "rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm";

export function FilterBar() {
  const router = useRouter();
  const sp = useSearchParams();

  const set = (key: string, value: string) => {
    const p = new URLSearchParams(sp.toString());
    if (value) p.set(key, value);
    else p.delete(key);
    p.delete("page");
    router.push(`/admin/radar?${p.toString()}`);
  };
  const val = (k: string) => sp.get(k) ?? "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <select className={SELECT} value={val("industry")} onChange={(e) => set("industry", e.target.value)}>
        <option value="">Все отрасли</option>
        <option value="dentistry">Стоматология</option>
        <option value="auto">Автосервис</option>
        <option value="beauty">Красота</option>
      </select>
      <select className={SELECT} value={val("grade")} onChange={(e) => set("grade", e.target.value)}>
        <option value="">Все оценки</option>
        <option value="A">A</option>
        <option value="B">B</option>
        <option value="C">C</option>
      </select>
      <select className={SELECT} value={val("source")} onChange={(e) => set("source", e.target.value)}>
        <option value="">Все источники</option>
        {["google", "yandex", "yellowpages", "gigal", "olx", "2gis"].map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>
      <input
        className={SELECT}
        placeholder="Город"
        defaultValue={val("city")}
        onKeyDown={(e) => e.key === "Enter" && set("city", e.currentTarget.value)}
        onBlur={(e) => e.currentTarget.value !== val("city") && set("city", e.currentTarget.value)}
      />
      <input
        className={`${SELECT} min-w-[220px] flex-1`}
        placeholder="Поиск: название или телефон (Enter)"
        defaultValue={val("q")}
        onKeyDown={(e) => e.key === "Enter" && set("q", e.currentTarget.value)}
      />
    </div>
  );
}
