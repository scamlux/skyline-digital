"use client";

import { useRef, useState } from "react";
import { pick, type Locale } from "../types";
import { fill, formatRange } from "./format";
import { planDraft } from "./plan-store";
import { calcPlan, effectiveService, type ScheduleData } from "./schedule";
import { demo, useClinicState } from "./store";
import { clinicUi as ui } from "./ui";
import { ServiceGlyph } from "./icons";
import type { ServiceIcon } from "./data";

/** Строка калькулятора: текст уже на языке посетителя — на клиент уходит только нужное. */
export interface CalcRow {
  id: string;
  icon: ServiceIcon;
  name: string;
  unit: string;
}

/**
 * Калькулятор лечения: шагеры количества по процедурам, живая вилка «от–до» и число визитов.
 * Цены берутся с учётом правок владельца — изменил цену в кабинете, калькулятор тут же
 * показывает новую вилку; скрытая услуга пропадает.
 */
export function Calculator({ rows, sched, locale }: { rows: CalcRow[]; sched: ScheduleData; locale: Locale }) {
  const state = useClinicState();
  const [qty, setQty] = useState<Record<string, number>>({});
  const tracked = useRef(false);
  const ov = { services: state.services, schedule: state.schedule };

  const visible = rows.flatMap((r) => {
    const base = sched.services.find((s) => s.id === r.id);
    if (!base) return [];
    const eff = effectiveService(base, ov);
    return eff.hidden || !eff.calc ? [] : [{ row: r, svc: eff }];
  });
  const plan = calcPlan(sched, ov, Object.entries(qty).map(([id, q]) => ({ id, qty: q })));
  const chosen = plan.items.length > 0;

  function change(id: string, delta: number, max: number) {
    if (!tracked.current) {
      tracked.current = true;
      demo.track("calc");
    }
    setQty((cur) => {
      const next = Math.max(0, Math.min(max, (cur[id] ?? 0) + delta));
      return { ...cur, [id]: next };
    });
  }

  return (
    <div className="tpl-calc" data-reveal>
      <ul className="tpl-calc-list">
        {visible.map(({ row, svc }) => {
          const n = Math.min(qty[row.id] ?? 0, svc.maxQty);
          return (
            <li key={row.id} className="tpl-calc-row" data-on={n > 0 || undefined}>
              <span className="tpl-calc-ico" aria-hidden="true">
                <ServiceGlyph icon={row.icon} />
              </span>
              <div className="tpl-calc-name">
                <span id={`calc-${row.id}`}>{row.name}</span>
                <small>
                  {formatRange(svc.min, svc.max, locale)} · {row.unit}
                </small>
              </div>
              <div className="tpl-stepper" role="group" aria-labelledby={`calc-${row.id}`}>
                <button type="button" onClick={() => change(row.id, -1, svc.maxQty)} disabled={n === 0} aria-label={fill(pick(ui.calc.less, locale), { name: row.name })}>
                  <span aria-hidden="true">−</span>
                </button>
                <output aria-live="polite">{n}</output>
                <button type="button" onClick={() => change(row.id, 1, svc.maxQty)} disabled={n >= svc.maxQty} aria-label={fill(pick(ui.calc.more, locale), { name: row.name })}>
                  <span aria-hidden="true">+</span>
                </button>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="tpl-calc-total" data-has={chosen || undefined}>
        <p className="tpl-calc-label">{pick(ui.calc.totalLabel, locale)}</p>
        <p className="tpl-calc-sum" aria-live="polite">
          {chosen ? formatRange(plan.min, plan.max, locale) : <span className="tpl-calc-empty">{pick(ui.calc.empty, locale)}</span>}
        </p>
        <p className="tpl-calc-visits">{chosen ? fill(pick(ui.calc.visits, locale), { n: plan.visits }) : " "}</p>
        <a
          className="tpl-btn"
          href="#book"
          aria-disabled={!chosen}
          tabIndex={chosen ? undefined : -1}
          onClick={(e) => {
            if (!chosen) return e.preventDefault();
            planDraft.send({ items: plan.items });
          }}
        >
          {pick(ui.calc.cta, locale)}
        </a>
        <button type="button" className="tpl-calc-reset" onClick={() => setQty({})} disabled={!chosen}>
          {pick(ui.calc.reset, locale)}
        </button>
        <p className="tpl-note">{pick(ui.calc.note, locale)}</p>
      </div>
    </div>
  );
}
