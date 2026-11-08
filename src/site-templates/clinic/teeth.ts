import type { PlanItem } from "./schedule";

/**
 * Карта зубов: нумерация FDI, геометрия стилизованной челюсти и сборка плана лечения из
 * выбранных зубов. Чистые функции без React — их же вызывают карта на сайте, кабинет и тесты.
 * Геометрия считается один раз при загрузке модуля и детерминирована (одна и та же на сервере
 * и в браузере), поэтому разметка челюсти при гидрации совпадает.
 */

/** Что не так с зубом; каждая проблема — это услуга прайса. */
export type ProblemId = "caries" | "refill" | "extract" | "implant" | "crown";

export const PROBLEM_IDS: ProblemId[] = ["caries", "refill", "extract", "implant", "crown"];

/** Проблема зуба → услуга прайса, из которой складывается цена плана. */
export const PROBLEM_SERVICE: Record<ProblemId, string> = {
  caries: "filling",
  refill: "refill",
  extract: "extract",
  implant: "implant",
  crown: "crown",
};

/** Услуги на всю полость рта: добавляются в план отдельными чипами. */
export const MOUTH_EXTRAS = ["clean", "whitening"] as const;

export interface ToothPick {
  /** Номер зуба по FDI (11–18, 21–28, 31–38, 41–48). */
  tooth: number;
  problem: ProblemId;
}

export type Arch = "up" | "low";
export type ToothKind = "central" | "lateral" | "canine" | "premolar" | "molar" | "wisdom";

/** Верхний ряд слева направо (как видит пациент в зеркале): 18…11, 21…28; нижний: 48…41, 31…38. */
export const UPPER_TEETH = [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28];
export const LOWER_TEETH = [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38];
export const ALL_TEETH = [...UPPER_TEETH, ...LOWER_TEETH];

export const isTooth = (n: number): boolean => ALL_TEETH.includes(n);

export function toothKind(tooth: number): ToothKind {
  const d = tooth % 10;
  if (d === 1) return "central";
  if (d === 2) return "lateral";
  if (d === 3) return "canine";
  if (d === 8) return "wisdom";
  return d <= 5 ? "premolar" : "molar";
}

/** Ширина и глубина зуба в единицах viewBox (рисуются внутри ячейки шага дуги, поэтому зоны касания равны). */
export const SIZE: Record<ToothKind, [number, number]> = {
  central: [30, 32],
  lateral: [26, 29],
  canine: [29, 34],
  premolar: [31, 32],
  molar: [35, 36],
  wisdom: [32, 32],
};

export const VIEW_W = 330;
export const VIEW_H = 616;
/** Центр дуги по горизонтали, полуширина и глубина дуги (по центрам зубов). */
const CX = VIEW_W / 2;
const ARC_A = 130;
const ARC_B = 235;
const UP_FRONT_Y = 44;
const LOW_FRONT_Y = VIEW_H - 44;
/** Зона касания зуба (вдоль дуги × поперёк): шаг дуги ≈ 36.5 ед., на экране 360 px это ≥ 36 px. */
export const HIT_W = 37;
export const HIT_D = 60;
/** Что показывать: обе дуги целиком или одну (на телефоне — вкладки «верх / низ»). */
export const VIEWBOX = { all: `0 0 ${VIEW_W} ${VIEW_H}`, up: `0 0 ${VIEW_W} 308`, low: `0 308 ${VIEW_W} 308` } as const;
export type JawView = keyof typeof VIEWBOX;
const LABEL_GAP = 12;
const STEPS = 2400;

export interface ToothGeom {
  tooth: number;
  arch: Arch;
  kind: ToothKind;
  x: number;
  y: number;
  /** Поворот в градусах: ось зуба идёт по нормали к дуге. */
  rot: number;
  w: number;
  d: number;
  /** Позиция подписи с номером — снаружи дуги. */
  lx: number;
  ly: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** 16 точек с равным шагом вдоль полуэллипса. «Лицевой» зуб дуги — у вершины, моляры — по бокам. */
function buildArch(arch: Arch): ToothGeom[] {
  const teeth = arch === "up" ? UPPER_TEETH : LOWER_TEETH;
  const sign = arch === "up" ? 1 : -1;
  const front = arch === "up" ? UP_FRONT_Y : LOW_FRONT_Y;
  const cy = front + sign * ARC_B;
  const point = (phi: number) => ({ x: CX + ARC_A * Math.sin(phi), y: front + sign * ARC_B * (1 - Math.cos(phi)) });

  // Накопленная длина дуги по фазе.
  const phis: number[] = [];
  const lens: number[] = [];
  let acc = 0;
  let prev = point(-Math.PI / 2);
  for (let i = 0; i <= STEPS; i++) {
    const phi = -Math.PI / 2 + (Math.PI * i) / STEPS;
    const p = point(phi);
    acc += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
    phis.push(phi);
    lens.push(acc);
  }
  const phiAt = (s: number) => {
    let lo = 0;
    let hi = lens.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (lens[mid] < s) lo = mid + 1;
      else hi = mid;
    }
    return phis[lo];
  };

  return teeth.map((tooth, i) => {
    const phi = phiAt(((i + 0.5) / teeth.length) * acc);
    const { x, y } = point(phi);
    const kind = toothKind(tooth);
    const [w, d] = SIZE[kind];
    // Касательная к дуге; поворот оси зуба. Нормаль наружу — по градиенту эллипса.
    const tx = ARC_A * Math.cos(phi);
    const ty = sign * ARC_B * Math.sin(phi);
    const rot = (Math.atan2(ty, tx) * 180) / Math.PI;
    const nx = (x - CX) / (ARC_A * ARC_A);
    const ny = (y - cy) / (ARC_B * ARC_B);
    const nl = Math.hypot(nx, ny) || 1;
    const off = d / 2 + LABEL_GAP;
    return {
      tooth,
      arch,
      kind,
      x: round1(x),
      y: round1(y),
      rot: round1(rot),
      w,
      d,
      lx: round1(x + (nx / nl) * off),
      ly: round1(y + (ny / nl) * off),
    };
  });
}

/** Геометрия всех 32 зубов в порядке отображения (верх слева направо, затем низ). */
export const JAW: ToothGeom[] = [...buildArch("up"), ...buildArch("low")];

export const geomOf = (tooth: number): ToothGeom | undefined => JAW.find((g) => g.tooth === tooth);

/** Соседний зуб в дуге (для стрелок клавиатуры): шаг ±1, без перехода в другую дугу. */
export function neighbourTooth(tooth: number, step: 1 | -1): number {
  const row = tooth >= 30 && tooth < 50 ? LOWER_TEETH : UPPER_TEETH;
  const i = row.indexOf(tooth);
  const next = row[Math.min(row.length - 1, Math.max(0, i + step))];
  return next ?? tooth;
}

/** Зубы одного ряда другой дуги, ближайший по горизонтали (стрелки вверх/вниз). */
export function crossArchTooth(tooth: number): number {
  const g = geomOf(tooth);
  if (!g) return tooth;
  const other = JAW.filter((x) => x.arch !== g.arch);
  return other.reduce((best, x) => (Math.abs(x.x - g.x) < Math.abs(best.x - g.x) ? x : best), other[0]).tooth;
}

/** Выбор зуба: заменяет проблему зуба или добавляет новую; порядок — по номеру зуба. */
export function setPick(picks: ToothPick[], tooth: number, problem: ProblemId): ToothPick[] {
  if (!isTooth(tooth)) return picks;
  const rest = picks.filter((p) => p.tooth !== tooth);
  return [...rest, { tooth, problem }].sort((a, b) => a.tooth - b.tooth);
}

export const removePick = (picks: ToothPick[], tooth: number): ToothPick[] => picks.filter((p) => p.tooth !== tooth);

/**
 * План лечения из зубов и услуг «на весь рот»: количество по услугам (по числу зубов с этой
 * проблемой) в порядке прайса. Повторы зуба и неизвестные номера отбрасываются.
 */
export function planFromPicks(picks: ToothPick[], extras: readonly string[] = []): PlanItem[] {
  const seen = new Set<number>();
  const qty = new Map<string, number>();
  for (const p of picks) {
    if (!isTooth(p.tooth) || seen.has(p.tooth)) continue;
    seen.add(p.tooth);
    const id = PROBLEM_SERVICE[p.problem];
    if (id) qty.set(id, (qty.get(id) ?? 0) + 1);
  }
  const items: PlanItem[] = PROBLEM_IDS.map((pid) => PROBLEM_SERVICE[pid])
    .filter((id) => qty.has(id))
    .map((id) => ({ id, qty: qty.get(id) ?? 0 }));
  for (const id of new Set(extras)) items.push({ id, qty: 1 });
  return items;
}

/** «16 · кариес, 24 · имплант» — строка плана для заявки и сообщения в Telegram. */
export function picksText(picks: ToothPick[], labelOf: (p: ProblemId) => string): string {
  return picks.map((p) => `${p.tooth} · ${labelOf(p.problem)}`).join(", ");
}
