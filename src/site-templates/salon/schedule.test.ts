import { describe, expect, it } from "vitest";
import { tashkentNow } from "../kit/tashkent";
import { salonBusinesses } from "./data";
import { recommend } from "./pick-look";
import {
  basketOf,
  canCombine,
  effectiveService,
  masterWorks,
  mastersFor,
  nextFreeSlot,
  NO_OVERRIDES,
  othersBusy,
  packageBasket,
  partOfDay,
  slotsForDay,
  slotTimes,
  toScheduleData,
  visibleServices,
  type SalonOverrides,
} from "./schedule";

const data = toScheduleData(salonBusinesses.a);
const wdata = toScheduleData(salonBusinesses.b);

// Понедельник 2026-11-02, 08:00 по Ташкенту — все слоты дня ещё впереди.
const NOW = tashkentNow(Date.UTC(2026, 10, 2, 3, 0));
const MONDAY = NOW.iso;
const TUESDAY = "2026-11-03";
const base = { data, ov: NO_OVERRIDES, bookings: [], date: MONDAY, now: NOW };

describe("сетка и набор услуг", () => {
  it("сетка с 10:00 до 21:00 шагом 30 минут", () => {
    const times = slotTimes(data);
    expect(times[0]).toBe("10:00");
    expect(times[times.length - 1]).toBe("20:30");
    expect(times).toHaveLength(22);
  });

  it("сумма и время набора складываются; скрытая и неизвестная услуги отбрасываются, дубли не удваиваются", () => {
    const b = basketOf(data, NO_OVERRIDES, ["razor", "kids", "razor", "нет-такой"]);
    expect(b.ids).toEqual(["razor", "kids"]);
    expect(b.minutes).toBe(40 + 30);
    expect(b.price).toBe(110_000 + 70_000);
    expect(b.saved).toBe(0);
    const hidden = basketOf(data, { services: { kids: { hidden: true } }, schedule: {} }, ["razor", "kids"]);
    expect(hidden.ids).toEqual(["razor"]);
  });

  it("правки владельца меняют цену и длительность, а длительность не падает ниже минимума", () => {
    const ov: SalonOverrides = { services: { fade: { price: 150_000, minutes: 75 }, cut: { minutes: 1 } }, schedule: {} };
    expect(effectiveService(data.services.find((s) => s.id === "fade")!, ov)).toMatchObject({ price: 150_000, minutes: 75 });
    expect(effectiveService(data.services.find((s) => s.id === "cut")!, ov).minutes).toBe(5);
    expect(visibleServices(data, { services: { fade: { hidden: true } }, schedule: {} }).some((s) => s.id === "fade")).toBe(false);
  });

  it("мастер, который ведёт все услуги набора, находится; чужие услуги не смешиваются", () => {
    expect(mastersFor(data, ["fade", "beard"]).map((m) => m.id).sort()).toEqual(["jasur", "rustam"]);
    expect(mastersFor(data, ["camo"]).map((m) => m.id).sort()).toEqual(["jasur", "rustam"]);
    expect(mastersFor(wdata, ["mani", "wcut"])).toEqual([]);
    expect(mastersFor(wdata, ["mani", "pedi"]).map((m) => m.id)).toEqual(["zarina"]);
    expect(mastersFor(wdata, ["mani", "wcut"])).toEqual([]);
  });

  it("canCombine: к набору можно добавить услугу, только если найдётся мастер на всё", () => {
    expect(canCombine(data, ["fade"], "beard")).toBe(true);
    expect(canCombine(data, ["camo"], "razor")).toBe(true);
    expect(canCombine(data, ["fade"], "beard", "rustam")).toBe(true);
    expect(canCombine(wdata, ["mani"], "wcut")).toBe(false);
    expect(canCombine(wdata, ["wstyle"], "mk-eve", "zarina")).toBe(true);
    expect(canCombine(wdata, ["wstyle"], "wcolor", "zarina")).toBe(false);
    expect(canCombine(wdata, ["mani"], "mk-eve", "zarina")).toBe(true);
  });
});

describe("пакеты со скидкой", () => {
  it("скидка считается в одном месте и сходится: итог = сумма − выгода", () => {
    const b = basketOf(data, NO_OVERRIDES, ["cut", "beard"]);
    expect(b.full).toBe(90_000 + 70_000);
    expect(b.saved).toBe(16_000);
    expect(b.price).toBe(b.full - b.saved);
    expect(b.packageId).toBe("cut-beard");
    expect(b.minutes).toBe(45 + 30);
  });

  it("без полного набора пакета скидки нет; лишняя услуга не получает скидку", () => {
    expect(basketOf(data, NO_OVERRIDES, ["cut"]).saved).toBe(0);
    const more = basketOf(data, NO_OVERRIDES, ["cut", "beard", "style"]);
    expect(more.saved).toBe(16_000);
    expect(more.price).toBe(90_000 + 70_000 + 60_000 - 16_000);
  });

  it("выбирается самый выгодный пакет из полностью собранных", () => {
    const b = basketOf(data, NO_OVERRIDES, ["fade", "beard", "razor"]);
    expect(b.packageId).toBe("ritual");
    expect(b.saved).toBe(Math.round((120_000 + 70_000 + 110_000) * 0.15 / 1000) * 1000);
  });

  it("владелец меняет процент и скрывает пакет; цена пакета считается из цен услуг", () => {
    const ov: SalonOverrides = { services: { cut: { price: 100_000 } }, schedule: {}, packages: { "cut-beard": { pct: 20 } } };
    const b = basketOf(data, ov, ["cut", "beard"]);
    expect(b.saved).toBe(34_000);
    const hidden = basketOf(data, { services: {}, schedule: {}, packages: { "cut-beard": { hidden: true } } }, ["cut", "beard"]);
    expect(hidden.saved).toBe(0);
    expect(packageBasket(data, { services: {}, schedule: {}, packages: { "cut-beard": { hidden: true } } }, data.packages[0])).toBeNull();
    expect(packageBasket(data, NO_OVERRIDES, data.packages[0])?.price).toBe(144_000);
  });

  it("скидка не выше 50 %", () => {
    const b = basketOf(data, { services: {}, schedule: {}, packages: { "cut-beard": { pct: 99 } } }, ["cut", "beard"]);
    expect(b.saved).toBe(80_000);
  });

  it("каждый пакет и каждая работа лукбука закрываются одним мастером (выбор не упирается в «нет мастера»)", () => {
    for (const d of [data, wdata]) {
      for (const p of d.packages) expect(mastersFor(d, p.serviceIds).length).toBeGreaterThan(0);
      for (const l of d.looks) expect(mastersFor(d, l.serviceIds).some((m) => m.id === l.masterId)).toBe(true);
      for (const r of Object.values(d.quizResults)) expect(mastersFor(d, r.serviceIds).length).toBeGreaterThan(0);
    }
  });
});

describe("слоты с учётом длительности", () => {
  it("запись не выходит за закрытие: длинный набор не стартует в последние окна", () => {
    const slots = slotsForDay({ ...base, data: wdata, serviceIds: ["wcolor"], masterId: "madina" });
    expect(slots.at(-1)!.time <= "18:30").toBe(true);
    const short = slotsForDay({ ...base, serviceIds: ["style"], masterId: "rustam" });
    expect(short.at(-1)!.time).toBe("20:30");
  });

  it("слоты детерминированы: два вызова дают одно и то же", () => {
    const q = { ...base, serviceIds: ["fade"], masterId: "any" as const };
    expect(slotsForDay(q)).toEqual(slotsForDay(q));
    expect(othersBusy(data, MONDAY, "rustam")).toEqual(othersBusy(data, MONDAY, "rustam"));
  });

  it("часть окон занята «другими гостями», остальные свободны", () => {
    const slots = slotsForDay({ ...base, date: TUESDAY, serviceIds: ["cut"], masterId: "rustam" });
    expect(slots.some((s) => s.status === "taken")).toBe(true);
    expect(slots.some((s) => s.status === "free")).toBe(true);
  });

  it("прошедшее время сегодня и ближайшие 30 минут помечены past", () => {
    const noon = tashkentNow(Date.UTC(2026, 10, 2, 7, 10)); // 12:10
    const slots = slotsForDay({ ...base, now: noon, serviceIds: ["style"], masterId: "any" });
    expect(slots.find((s) => s.time === "12:00")!.status).toBe("past");
    expect(slots.find((s) => s.time === "12:30")!.status).toBe("past");
    expect(slots.find((s) => s.time === "10:00")!.status).toBe("past");
  });

  it("живая запись занимает окно на всю длительность и освобождает его после отмены", () => {
    const q = { ...base, date: TUESDAY, serviceIds: ["fade"], masterId: "rustam" };
    const free = slotsForDay(q).find((s) => s.status === "free")!;
    const booking = { masterId: "rustam", date: TUESDAY, time: free.time, minutes: 60, status: "new" };
    const after = slotsForDay({ ...q, bookings: [booking] });
    expect(after.find((s) => s.time === free.time)!.status).toBe("taken");
    // Окна, пересекающиеся с занятым интервалом, тоже недоступны.
    const [h, m] = free.time.split(":").map(Number);
    const mid = `${String(Math.floor((h * 60 + m + 30) / 60)).padStart(2, "0")}:${String((m + 30) % 60).padStart(2, "0")}`;
    expect(after.find((s) => s.time === mid)?.status ?? "taken").not.toBe("free");
    const cancelled = slotsForDay({ ...q, bookings: [{ ...booking, status: "cancelled" }] });
    expect(cancelled.find((s) => s.time === free.time)!.status).toBe("free");
  });

  it("«любой мастер» назначает свободного, который ведёт всю услугу", () => {
    const slots = slotsForDay({ ...base, data: wdata, date: TUESDAY, serviceIds: ["mani"], masterId: "any" });
    for (const s of slots.filter((x) => x.status === "free")) expect(s.masterId).toBe("zarina");
  });

  it("набор услуг, который не ведёт один мастер, даёт пустую сетку", () => {
    expect(slotsForDay({ ...base, data: wdata, serviceIds: ["mani", "wcut"], masterId: "any" })).toEqual([]);
  });

  it("части дня: утро до 12:00, день до 17:00, дальше вечер", () => {
    expect(partOfDay("10:00")).toBe("morning");
    expect(partOfDay("11:30")).toBe("morning");
    expect(partOfDay("12:00")).toBe("day");
    expect(partOfDay("16:30")).toBe("day");
    expect(partOfDay("17:00")).toBe("evening");
    expect(partOfDay("20:30")).toBe("evening");
  });
});

describe("график мастеров", () => {
  it("выходной мастера убирает его окна; при «любой» подставляется другой", () => {
    const q = { ...base, date: TUESDAY, serviceIds: ["cut"] };
    expect(masterWorks(data.masters.find((m) => m.id === "rustam")!, NO_OVERRIDES, TUESDAY)).toBe(true);
    const off: SalonOverrides = { services: {}, schedule: { rustam: [0, 2, 3, 4, 5] } };
    expect(slotsForDay({ ...q, ov: off, masterId: "rustam" })).toEqual([]);
    const any = slotsForDay({ ...q, ov: off, masterId: "any" });
    expect(any.filter((s) => s.status === "free").every((s) => s.masterId === "jasur")).toBe(true);
  });

  it("если у всех подходящих мастеров выходной, окон нет", () => {
    const off: SalonOverrides = { services: {}, schedule: { rustam: [], jasur: [] } };
    expect(slotsForDay({ ...base, ov: off, serviceIds: ["fade"], masterId: "any" })).toEqual([]);
    expect(nextFreeSlot(data, off, [], NOW, { serviceIds: ["fade"] })).toBeNull();
  });

  it("ближайшее окно совпадает с первой свободной ячейкой сетки", () => {
    const next = nextFreeSlot(wdata, NO_OVERRIDES, [], NOW, { masterId: "madina" })!;
    expect(next).toBeTruthy();
    const slot = slotsForDay({ ...base, data: wdata, date: next.date, serviceIds: [], masterId: "madina" }).find((s) => s.status === "free")!;
    expect(slot.time).toBe(next.time);
  });
});

describe("подбор образа", () => {
  it("каждая комбинация ответов даёт существующий образ, услуги и мастера, который их ведёт", () => {
    for (const [d, businessData] of [
      [data, salonBusinesses.a],
      [wdata, salonBusinesses.b],
    ] as const) {
      const [q1, q2] = businessData.quiz.questions;
      for (const a of q1.options) {
        for (const b of q2.options) {
          const r = recommend(d, NO_OVERRIDES, [a.id, b.id]);
          expect(d.looks.some((l) => l.id === r.lookId)).toBe(true);
          expect(r.serviceIds.length).toBeGreaterThan(0);
          expect(r.masterId).not.toBeNull();
          expect(mastersFor(d, r.serviceIds).some((m) => m.id === r.masterId)).toBe(true);
        }
      }
    }
  });

  it("мужской подбор: смело + борода даёт фейд и бороду у Рустама", () => {
    const r = recommend(data, NO_OVERRIDES, ["bold", "yes"]);
    expect(r.serviceIds).toEqual(["fade", "beard"]);
    expect(r.masterId).toBe("rustam");
  });

  it("женский подбор: волосы на праздник даёт укладку", () => {
    expect(recommend(wdata, NO_OVERRIDES, ["hair", "party"]).serviceIds).toEqual(["wstyle"]);
  });

  it("скрытая владельцем услуга не предлагается; если мастер без рабочих дней — берётся другой", () => {
    const hiddenBeard: SalonOverrides = { services: { beard: { hidden: true } }, schedule: {} };
    expect(recommend(data, hiddenBeard, ["bold", "yes"]).serviceIds).toEqual(["fade"]);
    const noRustam: SalonOverrides = { services: {}, schedule: { rustam: [] } };
    expect(recommend(data, noRustam, ["bold", "no"]).masterId).toBe("jasur");
  });
});
