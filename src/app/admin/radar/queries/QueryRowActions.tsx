"use client";

import { useTransition } from "react";
import { toggleQuery, deleteQuery } from "./actions";

export function QueryRowActions({ id, active }: { id: string; active: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex items-center justify-end gap-2">
      <button
        disabled={pending}
        onClick={() => start(() => toggleQuery(id, !active))}
        className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-50 ${
          active
            ? "bg-amber-50 text-amber-700 hover:bg-amber-100"
            : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
        }`}
      >
        {active ? "Выключить" : "Включить"}
      </button>
      <button
        disabled={pending}
        onClick={() => {
          if (confirm("Удалить эту отрасль из радара? Уже собранные компании останутся.")) {
            start(() => deleteQuery(id));
          }
        }}
        className="rounded-lg bg-red-50 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-100 disabled:opacity-50"
      >
        Удалить
      </button>
    </div>
  );
}
