import { describe, expect, it } from "vitest";
import { tashkentNow } from "../kit/tashkent";
import { clinicDemo } from "./data";
import { calcPlan, dayPartOf, doctorsFor, nextFreeSlotFor, NO_OVERRIDES, optionsRange, slotsForDay } from "./schedule";
import { ALL_TEETH, JAW, LOWER_TEETH, MOUTH_EXTRAS, PROBLEM_IDS, PROBLEM_SERVICE, UPPER_TEETH, VIEWBOX, crossArchTooth, neighbourTooth, picksText, planFromPicks, removePick, setPick, toothKind } from "./teeth";

const NOW = tashkentNow(Date.UTC(2026, 10, 2, 3, 0)); // пн 2026-11-02, 08:00 Ташкент

describe("карта зубов: нумерация и геометрия", () => {
  it("32 уникальных зуба по FDI: по 16 в верхней и нижней дуге", () => {
    expect(new Set(ALL_TEETH).size).toBe(32);
    expect(UPPER_TEETH).toHaveLength(16);
    expect(LOWER_TEETH).toHaveLength(16);
    expect([...UPPER_TEETH, ...LOWER_TEETH].every((t) => t >= 11 && t <= 48 && t % 10 >= 1 && t % 10 <= 8)).toBe(true);
    expect(JAW).toHaveLength(32);
  });

  it("виды зубов: 8 — зуб мудрости, 6–7 — моляры, 4–5 — премоляры, 3 — клык", () => {
    expect([toothKind(11), toothKind(12), toothKind(13), toothKind(14), toothKind(16), toothKind(48)]).toEqual(["central", "lateral", "canine", "premolar", "molar", "wisdom"]);
  });

  it("зубы не налезают друг на друга и лежат внутри области просмотра", () => {
    for (const arch of ["up", "low"] as const) {
      const row = JAW.filter((g) => g.arch === arch);
      for (let i = 1; i < row.length; i++) {
        const gap = Math.hypot(row[i].x - row[i - 1].x, row[i].y - row[i - 1].y);
        expect(gap).toBeGreaterThan(25);
      }
    }
    for (const g of JAW) {
      expect(g.x).toBeGreaterThan(20);
      expect(g.x).toBeLessThan(380);
      expect(g.lx).toBeGreaterThan(0);
      expect(g.lx).toBeLessThan(400);
      expect(g.ly).toBeGreaterThan(0);
      expect(g.ly).toBeLessThan(620);
    }
    expect(Object.keys(VIEWBOX).sort()).toEqual(["all", "low", "up"]);
  });

  it("геометрия детерминирована", () => {
    expect(JAW.map((g) => [g.tooth, g.x, g.y, g.rot])).toEqual(JAW.map((g) => [g.tooth, g.x, g.y, g.rot]));
    expect(JAW.find((g) => g.tooth === 11)!.x).toBeLessThan(JAW.find((g) => g.tooth === 21)!.x);
  });

  it("стрелки: соседний зуб в дуге не выходит за края; вверх-вниз — зуб другой дуги", () => {
    expect(neighbourTooth(18, -1)).toBe(18);
    expect(neighbourTooth(18, 1)).toBe(17);
    expect(neighbourTooth(38, 1)).toBe(38);
    expect(neighbourTooth(31, -1)).toBe(41);
    expect(crossArchTooth(11)).toBeGreaterThan(30);
    expect(crossArchTooth(41)).toBeLessThan(30);
  });
});

describe("карта зубов: план лечения", () => {
  it("каждая проблема — существующая услуга, которую кто-то ведёт и которую можно считать", () => {
    for (const pid of PROBLEM_IDS) {
      const svc = clinicDemo.services.find((s) => s.id === PROBLEM_SERVICE[pid]);
      expect(svc, pid).toBeTruthy();
      expect(svc!.calc).toBe(true);
      expect(svc!.max).toBeGreaterThan(0);
      expect(doctorsFor(clinicDemo, svc!.id).length).toBeGreaterThan(0);
    }
    for (const id of MOUTH_EXTRAS) expect(clinicDemo.services.find((s) => s.id === id)?.calc).toBe(true);
  });

  it("setPick заменяет проблему зуба, держит порядок по номеру и игнорирует неизвестный зуб; removePick убирает", () => {
    let p = setPick([], 24, "implant");
    p = setPick(p, 16, "caries");
    p = setPick(p, 24, "crown");
    expect(p).toEqual([
      { tooth: 16, problem: "caries" },
      { tooth: 24, problem: "crown" },
    ]);
    expect(setPick(p, 99, "caries")).toEqual(p);
    expect(removePick(p, 16)).toEqual([{ tooth: 24, problem: "crown" }]);
  });

  it("planFromPicks считает количество по услугам и добавляет «на весь рот»", () => {
    const items = planFromPicks(
      [
        { tooth: 16, problem: "caries" },
        { tooth: 26, problem: "caries" },
        { tooth: 36, problem: "implant" },
      ],
      ["clean", "clean"],
    );
    expect(items).toEqual([
      { id: "filling", qty: 2 },
      { id: "implant", qty: 1 },
      { id: "clean", qty: 1 },
    ]);
    expect(planFromPicks([], [])).toEqual([]);
  });

  it("три зуба с проблемами дают живую вилку «от–до» и визиты", () => {
    const items = planFromPicks([
      { tooth: 16, problem: "caries" },
      { tooth: 24, problem: "extract" },
      { tooth: 36, problem: "implant" },
    ]);
    const r = calcPlan(clinicDemo, NO_OVERRIDES, items);
    expect(r.min).toBe(250_000 + 150_000 + 4_500_000);
    expect(r.max).toBe(600_000 + 700_000 + 9_000_000);
    expect(r.visits).toBe(Math.ceil(1 + 1 + 3));
    expect(r.items).toHaveLength(3);
  });

  it("правка цены в кабинете меняет итог плана, скрытая услуга выпадает", () => {
    const items = planFromPicks([{ tooth: 16, problem: "caries" }, { tooth: 36, problem: "implant" }]);
    const ov = { services: { filling: { min: 300_000, max: 300_000 }, implant: { hidden: true } }, schedule: {} };
    const r = calcPlan(clinicDemo, ov, items);
    expect(r.min).toBe(300_000);
    expect(r.items).toEqual([{ id: "filling", qty: 1 }]);
  });

  it("можно отметить все 32 зуба: потолок количества не занижает цену", () => {
    const picks = ALL_TEETH.map((tooth) => ({ tooth, problem: "implant" as const }));
    const r = calcPlan(clinicDemo, NO_OVERRIDES, planFromPicks(picks));
    expect(r.items).toEqual([{ id: "implant", qty: 32 }]);
    expect(r.min).toBe(32 * 4_500_000);
  });

  it("picksText собирает «16 · кариес, 24 · имплант»", () => {
    const label = (p: string) => ({ caries: "кариес", implant: "имплант" })[p as "caries"] ?? p;
    expect(picksText([{ tooth: 16, problem: "caries" }, { tooth: 24, problem: "implant" }], label)).toBe("16 · кариес, 24 · имплант");
  });
});

describe("плитки «Что беспокоит?»", () => {
  it("шесть плиток; у каждой — существующие услуги, вилка min ≤ max и врач, который ведёт услугу записи", () => {
    expect(clinicDemo.symptoms).toHaveLength(6);
    expect(new Set(clinicDemo.symptoms.map((s) => s.id)).size).toBe(6);
    for (const s of clinicDemo.symptoms) {
      const range = optionsRange(clinicDemo, NO_OVERRIDES, s.options);
      expect(range, s.id).toBeTruthy();
      expect(range!.min).toBeLessThanOrEqual(range!.max);
      expect(range!.max, s.id).toBeGreaterThan(0);
      expect(range!.visitsMin).toBeGreaterThanOrEqual(1);
      const doc = clinicDemo.doctors.find((d) => d.id === s.doctorId);
      expect(doc, s.id).toBeTruthy();
      expect(doc!.serviceIds).toContain(s.bookService);
      for (const id of s.options) expect(clinicDemo.services.some((x) => x.id === id)).toBe(true);
    }
  });

  it("вилка берёт самую дешёвую нижнюю и самую дорогую верхнюю границу; скрытая услуга выпадает", () => {
    expect(optionsRange(clinicDemo, NO_OVERRIDES, ["filling", "canals"])).toMatchObject({ min: 250_000, max: 1_200_000, visitsMin: 1, visitsMax: 2 });
    const ov = { services: { canals: { hidden: true } }, schedule: {} };
    expect(optionsRange(clinicDemo, ov, ["filling", "canals"])).toMatchObject({ min: 250_000, max: 600_000 });
    expect(optionsRange(clinicDemo, { services: { kids: { hidden: true } }, schedule: {} }, ["kids"])).toBeNull();
  });

  it("у плитки есть ближайшее окно по услуге записи и оно совпадает со свободным слотом сетки", () => {
    for (const s of clinicDemo.symptoms) {
      const next = nextFreeSlotFor(clinicDemo, NO_OVERRIDES, [], NOW, { serviceId: s.bookService });
      expect(next, s.id).toBeTruthy();
      const slot = slotsForDay({ data: clinicDemo, ov: NO_OVERRIDES, bookings: [], now: NOW, date: next!.date, serviceId: s.bookService, doctorId: "any" }).find((x) => x.time === next!.time);
      expect(slot?.status).toBe("free");
    }
  });

  it("окно конкретного врача: выходной врача сдвигает ближайшее окно", () => {
    const first = nextFreeSlotFor(clinicDemo, NO_OVERRIDES, [], NOW, { serviceId: "implant", doctorId: "karimov" })!;
    const off = { services: {}, schedule: { karimov: [5] } };
    const later = nextFreeSlotFor(clinicDemo, off, [], NOW, { serviceId: "implant", doctorId: "karimov" })!;
    expect(`${later.date}${later.time}` > `${first.date}${first.time}`).toBe(true);
    expect(nextFreeSlotFor(clinicDemo, { services: {}, schedule: { karimov: [] } }, [], NOW, { serviceId: "implant", doctorId: "karimov" })).toBeNull();
  });
});

describe("время суток в сетке записи", () => {
  it("утро до 12:00, день до 16:00, вечер дальше", () => {
    expect(["09:00", "11:30", "12:00", "15:30", "16:00", "18:30"].map(dayPartOf)).toEqual(["morning", "morning", "day", "day", "evening", "evening"]);
  });
});

describe("врачи и пакеты", () => {
  it("у врачей есть специализации, четыре чипа фильтра охвачены", () => {
    const tags = new Set(clinicDemo.doctors.flatMap((d) => d.tags));
    expect([...tags].sort()).toEqual(["kids", "ortho", "surgeon", "therapist"]);
  });

  it("пакеты: услуги существуют и считаются, рассрочка — только у брекетов", () => {
    expect(clinicDemo.packages.length).toBeGreaterThanOrEqual(3);
    for (const pkg of clinicDemo.packages) {
      const r = calcPlan(clinicDemo, NO_OVERRIDES, pkg.items);
      expect(r.items.length, pkg.id).toBe(pkg.items.length === 2 ? 1 : pkg.items.length);
      expect(r.max, pkg.id).toBeGreaterThan(0);
    }
    expect(clinicDemo.packages.filter((p) => p.instalmentMonths).map((p) => p.id)).toEqual(["braces-12"]);
  });
});
