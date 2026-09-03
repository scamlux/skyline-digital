import { getSetting } from "@/lib/portfolio";
import { baseHours, features, addons, basePriceUsd } from "@/lib/pricing/rules";
import { ROLE_KEYS, ROLE_LABELS, ROLE_RATES, roleHoursCost } from "@/lib/pricing/roles";
import type { RoleHours } from "@/lib/pricing/roles";
import { FxEditor } from "./FxEditor";

export const dynamic = "force-dynamic";

const TYPE_RU: Record<string, string> = {
  website: "Сайт", webApp: "Веб-приложение", mobileApp: "Мобильное приложение",
  ai: "AI-решение", automation: "Автоматизация", uiux: "UI/UX-дизайн", other: "Другое",
};

function HoursTable({ title, items }: { title: string; items: [string, RoleHours][] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
      <div className="border-b border-gray-200 bg-gray-50 px-4 py-2 text-sm font-semibold text-gray-700">{title}</div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-500">
            <th className="p-3">Позиция</th>
            {ROLE_KEYS.map((r) => <th key={r} className="p-3 text-right">{ROLE_LABELS[r].split(" ")[0]}</th>)}
            <th className="p-3 text-right">Итого, ч</th>
            <th className="p-3 text-right">Цена</th>
          </tr>
        </thead>
        <tbody>
          {items.map(([key, hours]) => {
            const totalH = ROLE_KEYS.reduce((s, r) => s + (hours[r] ?? 0), 0);
            return (
              <tr key={key} className="border-b border-gray-100">
                <td className="p-3 font-medium text-gray-900">{TYPE_RU[key] ?? key}</td>
                {ROLE_KEYS.map((r) => (
                  <td key={r} className="p-3 text-right text-gray-600">{hours[r] ?? "—"}</td>
                ))}
                <td className="p-3 text-right font-medium">{totalH}</td>
                <td className="p-3 text-right font-semibold text-gray-900">${Math.round(roleHoursCost(hours))}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default async function PricingAdminPage() {
  const fx = await getSetting<number>("fx_rate", 12000);
  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="mb-1 text-2xl font-bold text-gray-900">Прайс</h1>
        <p className="text-sm text-gray-500">
          Каталог движка цен: часы по ролям × ставки. Правки часов/ставок — в коде
          (<code className="rounded bg-gray-100 px-1">src/lib/pricing</code>), чтобы клиентский
          калькулятор и сервер всегда совпадали. Курс UZS редактируется здесь и сразу влияет на КП.
        </p>
      </div>

      <div className="flex flex-wrap items-end gap-6 rounded-xl border border-gray-200 bg-white p-5">
        <FxEditor initial={fx} />
        <div className="text-sm text-gray-500">
          Ставки ($/ч): {ROLE_KEYS.map((r) => `${ROLE_LABELS[r].split(" ")[0]} ${ROLE_RATES[r]}`).join(" · ")}
        </div>
      </div>

      <HoursTable
        title="Базовые услуги (стартовые цены «от»)"
        items={Object.entries(baseHours).map(([k, v]) => [`${k} — от $${basePriceUsd(k as keyof typeof baseHours)}`, v] as [string, RoleHours])}
      />
      <HoursTable title="Функции (шаг 2 калькулятора)" items={Object.entries(features)} />
      <HoursTable title="Дополнительно (шаг 3)" items={Object.entries(addons)} />
    </div>
  );
}
