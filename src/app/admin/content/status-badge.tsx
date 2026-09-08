// Server-safe (НЕ "use client"): бейдж статуса вызывается и из серверной
// страницы списка, и из клиентского Editor. Держать здесь, а не в Editor.tsx —
// иначе серверный компонент вызывает функцию из клиентского модуля → 500
// (Next 15: "Attempted to call statusBadge() from the server").

const STATUS_RU: Record<string, string> = {
  draft: "черновик", planned: "в плане", generating: "рендер…", generated: "срендерен",
  review: "на проверке", approved: "одобрен", scheduled: "в расписании",
  published: "опубликован", analyzed: "с метриками", failed: "ошибка", blocked: "заблокирован guard",
};

export function statusBadge(s: string) {
  const color =
    s === "published" ? "bg-emerald-50 text-emerald-700"
    : s === "approved" || s === "scheduled" ? "bg-blue-50 text-blue-700"
    : s === "review" ? "bg-violet-50 text-violet-700"
    : s === "blocked" || s === "failed" ? "bg-red-50 text-red-600"
    : "bg-gray-100 text-gray-600";
  return <span className={`rounded px-2 py-0.5 text-xs font-medium ${color}`}>{STATUS_RU[s] ?? s}</span>;
}
