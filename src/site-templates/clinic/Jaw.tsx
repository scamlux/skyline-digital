"use client";

import { useRef, useState } from "react";
import { plural } from "../kit/plural";
import { pick, type Locale } from "../types";
import { fill, priceParts } from "./format";
import { useLive } from "./live";
import { planDraft } from "./plan-store";
import { calcPlan, type ScheduleData } from "./schedule";
import {
  HIT_D,
  HIT_W,
  JAW,
  MOUTH_EXTRAS,
  PROBLEM_IDS,
  SIZE,
  VIEW_W,
  crossArchTooth,
  neighbourTooth,
  planFromPicks,
  removePick,
  setPick,
  type Arch,
  type ProblemId,
  type ToothGeom,
  type ToothPick,
} from "./teeth";
import { clinicUi as ui } from "./ui";

/** Верхняя и нижняя дуги стоят друг над другом, как на клинической схеме: на десктопе видны обе, на телефоне — одна половина (вкладки «верх / низ»). */
const VIEW_H = 616;
const RX: Record<string, number> = { central: 9, lateral: 9, canine: 13, premolar: 11, molar: 8, wisdom: 8 };

/** Метка проблемы внутри зуба: маленький знак своей формы. */
function Mark({ problem }: { problem: ProblemId }) {
  switch (problem) {
    case "caries":
      return <circle r="3.4" className="cl-mark" />;
    case "refill":
      return <rect x="-3.6" y="-3.6" width="7.2" height="7.2" className="cl-mark" />;
    case "extract":
      return <path d="M-4-4L4 4M4-4L-4 4" className="cl-mark-line" />;
    case "implant":
      return <path d="M0-5V5M-4 1L0 5L4 1" className="cl-mark-line" />;
    case "crown":
      return <path d="M-5 3L-4-3L-1.5 0L0-4L1.5 0L4-3L5 3Z" className="cl-mark" />;
  }
}

function Tooth({ g, pickedAs, active, focusable, label, onSelect, onKey }: { g: ToothGeom; pickedAs?: ProblemId; active: boolean; focusable: boolean; label: string; onSelect: () => void; onKey: (e: React.KeyboardEvent) => void }) {
  const [w, d] = SIZE[g.kind];
  return (
    <g
      transform={`translate(${g.x} ${g.y})`}
      className="cl-tooth"
      data-picked={pickedAs ? "" : undefined}
      data-active={active ? "" : undefined}
      data-problem={pickedAs}
      role="button"
      tabIndex={focusable ? 0 : -1}
      aria-pressed={active}
      aria-label={label}
      data-tooth={g.tooth}
      onClick={onSelect}
      onKeyDown={onKey}
    >
      <rect className="cl-hit" x={-HIT_W / 2} y={-HIT_D / 2} width={HIT_W} height={HIT_D} transform={`rotate(${g.rot})`} />
      <g transform={`rotate(${g.rot})`}>
        <rect className="cl-crown" x={-w / 2 + 1} y={-d / 2 + 1} width={w - 2} height={d - 2} rx={RX[g.kind]} />
        {g.kind === "molar" || g.kind === "wisdom" ? <path className="cl-fissure" d={`M${-w / 4} 0H${w / 4}M0 ${-d / 4}V${d / 4}`} /> : null}
      </g>
      {pickedAs ? <Mark problem={pickedAs} /> : null}
    </g>
  );
}

/** Подпись номера зуба вне дуги и риски по краю: клиническая «координатная сетка». */
function Ruler() {
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= 20; i++) {
    const x = 8 + (i * (VIEW_W - 16)) / 20;
    ticks.push(<path key={i} d={`M${x} 0v${i % 5 === 0 ? 9 : 5}`} />);
  }
  return (
    <g className="cl-ruler" aria-hidden="true">
      {ticks}
    </g>
  );
}

/**
 * Карта зубов: стилизованная челюсть (32 зуба, FDI) и план лечения. Касание зуба — выбор,
 * затем проблема; справа (на телефоне под картой) — живая вилка «от–до» и число визитов.
 * Один SVG: на телефоне переключаются половины сдвигом, на десктопе видны обе дуги.
 */
export function JawMap({ sched, locale }: { sched: ScheduleData; locale: Locale }) {
  const { ov } = useLive();
  const [picks, setPicks] = useState<ToothPick[]>([]);
  const [extras, setExtras] = useState<string[]>([]);
  const [activeTooth, setActiveTooth] = useState<number | null>(null);
  const [arch, setArch] = useState<Arch>("up");
  const [focusTooth, setFocusTooth] = useState<number>(JAW[0].tooth);
  const svgRef = useRef<SVGSVGElement>(null);

  const items = planFromPicks(picks, extras);
  const plan = calcPlan(sched, ov, items);
  const has = plan.items.length > 0;
  const price = priceParts(plan.min, plan.max, locale, { free: pick(ui.hero.free, locale), upTo: pick(ui.hero.upTo, locale) });
  const problemOf = (tooth: number) => picks.find((p) => p.tooth === tooth)?.problem;
  const activePick = activeTooth ? problemOf(activeTooth) : undefined;
  const label = (k: ProblemId) => pick(ui.problems[k], locale);

  const choose = (tooth: number) => {
    setActiveTooth(tooth);
    setFocusTooth(tooth);
    setArch(tooth >= 30 ? "low" : "up");
  };
  const setProblem = (problem: ProblemId) => {
    if (activeTooth) setPicks((p) => setPick(p, activeTooth, problem));
  };
  const onKey = (tooth: number) => (e: React.KeyboardEvent) => {
    let next: number | null = null;
    if (e.key === "ArrowRight") next = neighbourTooth(tooth, 1);
    else if (e.key === "ArrowLeft") next = neighbourTooth(tooth, -1);
    else if (e.key === "ArrowUp" || e.key === "ArrowDown") next = crossArchTooth(tooth);
    if (next !== null) {
      e.preventDefault();
      setFocusTooth(next);
      setArch(next >= 30 ? "low" : "up");
      requestAnimationFrame(() => svgRef.current?.querySelector<SVGGElement>(`[data-tooth="${next}"]`)?.focus());
    } else if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      choose(tooth);
    }
  };

  const visitWord = plural(locale, plan.visits, ui.visitWord[locale]);

  return (
    <div className="cl-jaw-wrap">
      <div className="cl-jaw-main">
        <div className="cl-arches" role="group" aria-label={pick(ui.jaw.arches, locale)}>
          {(["up", "low"] as const).map((a) => (
            <button key={a} type="button" aria-pressed={arch === a} onClick={() => setArch(a)}>
              {pick(ui.jaw[a], locale)}
            </button>
          ))}
        </div>
        <div className="cl-jaw-box" data-arch={arch}>
          <svg ref={svgRef} className="cl-jaw" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} role="group" aria-label={pick(ui.jaw.mapLabel, locale)} focusable="false">
            <Ruler />
            <g transform={`translate(0 ${VIEW_H}) scale(1 -1)`}>
              <Ruler />
            </g>
            <path className="cl-guide" d={`M${VIEW_W / 2} 20V${VIEW_H - 20}`} aria-hidden="true" />
            {JAW.map((g) => {
              const picked = problemOf(g.tooth);
              return (
                <g key={`n${g.tooth}`}>
                  <text className="cl-num" x={g.lx} y={g.ly} textAnchor="middle" dominantBaseline="central" aria-hidden="true">
                    {g.tooth}
                  </text>
                  <Tooth
                    g={g}
                    pickedAs={picked}
                    active={activeTooth === g.tooth}
                    focusable={focusTooth === g.tooth}
                    label={`${fill(pick(ui.jaw.tooth, locale), { n: g.tooth })}: ${picked ? label(picked) : pick(ui.jaw.toothNone, locale)}`}
                    onSelect={() => choose(g.tooth)}
                    onKey={onKey(g.tooth)}
                  />
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="cl-jaw-side">
        <div className="cl-pick" data-on={activeTooth ? "" : undefined}>
          <p className="cl-pick-title">{activeTooth ? fill(pick(ui.jaw.pickFor, locale), { n: activeTooth }) : pick(ui.jaw.tapHint, locale)}</p>
          <div className="cl-chips" role="group" aria-label={pick(ui.jaw.problemsLabel, locale)}>
            {PROBLEM_IDS.map((k) => (
              <button key={k} type="button" disabled={!activeTooth} aria-pressed={activePick === k} onClick={() => setProblem(k)}>
                {label(k)}
              </button>
            ))}
            {activeTooth && activePick ? (
              <button
                type="button"
                className="cl-chip-quiet"
                onClick={() => {
                  setPicks((p) => removePick(p, activeTooth));
                  setActiveTooth(null);
                }}
              >
                {pick(ui.jaw.remove, locale)}
              </button>
            ) : null}
          </div>
        </div>

        <div className="cl-chips cl-extras" role="group" aria-label={pick(ui.jaw.extrasLabel, locale)}>
          {MOUTH_EXTRAS.map((id) => (
            <button key={id} type="button" aria-pressed={extras.includes(id)} onClick={() => setExtras((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]))}>
              {pick(ui.extras[id], locale)}
            </button>
          ))}
        </div>

        <ul className="cl-planlist" aria-label={pick(ui.jaw.planLabel, locale)}>
          {picks.map((p) => (
            <li key={p.tooth}>
              <button type="button" onClick={() => choose(p.tooth)} aria-label={`${fill(pick(ui.jaw.tooth, locale), { n: p.tooth })}: ${label(p.problem)}`}>
                <b>{p.tooth}</b> {label(p.problem)}
              </button>
              <button type="button" className="cl-x" onClick={() => setPicks((x) => removePick(x, p.tooth))} aria-label={`${pick(ui.jaw.remove, locale)} ${p.tooth}`}>
                <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
          {picks.length === 0 && <li className="cl-empty">{pick(ui.jaw.empty, locale)}</li>}
        </ul>

        <div className="cl-total" data-has={has ? "" : undefined}>
          <p className="cl-total-label">
            {pick(ui.jaw.total, locale)} · {fill(pick(ui.jaw.teethCount, locale), { n: picks.length })}
          </p>
          <p className="cl-total-sum" aria-live="polite">
            {has ? (
              <>
                <b>{price.num}</b> <span>{price.unit}</span>
              </>
            ) : (
              <b>—</b>
            )}
          </p>
          <p className="cl-total-visits">{has ? `≈ ${plan.visits} ${visitWord}` : " "}</p>
          <div className="cl-total-act">
            <button type="button" className="cl-btn" disabled={!has} onClick={() => planDraft.send({ items: plan.items, teeth: picks, serviceId: "consult" })}>
              {pick(ui.jaw.cta, locale)}
            </button>
            <button
              type="button"
              className="cl-link"
              disabled={picks.length === 0 && extras.length === 0}
              onClick={() => {
                setPicks([]);
                setExtras([]);
                setActiveTooth(null);
              }}
            >
              {pick(ui.jaw.clear, locale)}
            </button>
          </div>
          <p className="cl-note">{pick(ui.jaw.note, locale)}</p>
        </div>
      </div>
    </div>
  );
}
