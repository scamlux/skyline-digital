import { describe, expect, it } from "vitest";
import { tashkentNow } from "../kit/tashkent";
import { salonDemo } from "./data";
import { recommend } from "./pick-look";
import { basketOf, effectiveService, masterWorks, mastersFor, nextFreeSlot, NO_OVERRIDES, othersBusy, slotsForDay, slotTimes, toScheduleData, visibleServices, type SalonOverrides } from "./schedule";

const data = toScheduleData(salonDemo);

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
    const b = basketOf(data, NO_OVERRIDES, ["fade", "beard", "fade", "нет-такой"]);
    expect(b.ids).toEqual(["fade", "beard"]);
    expect(b.minutes).toBe(60 + 30);
    expect(b.price).toBe(120_000 + 70_000);
    const hidden = basketOf(data, { services: { beard: { hidden: true } }, schedule: {} }, ["fade", "beard"]);
    expect(hidden.ids).toEqual(["fade"]);
  });

  it("правки владельца меняют цену и длительность, а длительность не падает ниже минимума", () => {
    const ov: SalonOverrides = { services: { fade: { price: 150_000, minutes: 75 }, mcut: { minutes: 1 } }, schedule: {} };
    expect(effectiveService(data.services.find((s) => s.id === "fade")!, ov)).toMatchObject({ price: 150_000, minutes: 75 });
    expect(effectiveService(data.services.find((s) => s.id === "mcut")!, ov).minutes).toBe(5);
    expect(visibleServices(data, { services: { fade: { hidden: true } }, schedule: {} }).some((s) => s.id === "fade")).toBe(false);
  });

  it("мужские и женские услуги не пересекаются у одного мастера", () => {
    expect(mastersFor(data, ["fade", "beard"]).map((m) => m.id).sort()).toEqual(["jasur", "rustam"]);
    expect(mastersFor(data, ["wcut"]).map((m) => m.id)).toEqual(["madina"]);
    expect(mastersFor(data, ["fade", "wcut"])).toEqual([]);
    expect(mastersFor(data, ["mask"]).map((m) => m.id).sort()).toEqual(["jasur", "madina", "rustam"]);
  });
});

describe("слоты с учётом длительности", () => {
  it("запись не выходит за закрытие: длинный набор не стартует в последние окна", () => {
    const slots = slotsForDay({ ...base, serviceIds: ["wcolor"], masterId: "madina" });
    expect(slots.at(-1)!.time <= "18:30").toBe(true);
    const short = slotsForDay({ ...base, serviceIds: ["mask"], masterId: "rustam" });
    expect(short.at(-1)!.time).toBe("20:30");
  });

  it("слоты детерминированы: два вызова дают одно и то же", () => {
    const q = { ...base, serviceIds: ["fade"], masterId: "any" as const };
    expect(slotsForDay(q)).toEqual(slotsForDay(q));
    expect(othersBusy(data, MONDAY, "rustam")).toEqual(othersBusy(data, MONDAY, "rustam"));
  });

  it("часть окон занята «другими гостями», остальные свободны", () => {
    const slots = slotsForDay({ ...base, date: TUESDAY, serviceIds: ["mcut"], masterId: "rustam" });
    expect(slots.some((s) => s.status === "taken")).toBe(true);
    expect(slots.some((s) => s.status === "free")).toBe(true);
  });

  it("прошедшее время сегодня и ближайшие 30 минут помечены past", () => {
    const noon = tashkentNow(Date.UTC(2026, 10, 2, 7, 10)); // 12:10
    const slots = slotsForDay({ ...base, now: noon, serviceIds: ["mask"], masterId: "any" });
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

  it("«любой мастер» назначает свободного и не отдаёт женскую услугу барберу", () => {
    const slots = slotsForDay({ ...base, date: TUESDAY, serviceIds: ["wcut"], masterId: "any" });
    for (const s of slots.filter((x) => x.status === "free")) expect(s.masterId).toBe("madina");
  });

  it("набор услуг, который не ведёт один мастер, даёт пустую сетку", () => {
    expect(slotsForDay({ ...base, serviceIds: ["fade", "wcut"], masterId: "any" })).toEqual([]);
  });
});

describe("график мастеров", () => {
  it("выходной мастера убирает его окна; при «любой» подставляется другой", () => {
    const q = { ...base, date: TUESDAY, serviceIds: ["mcut"] };
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
    const next = nextFreeSlot(data, NO_OVERRIDES, [], NOW, { masterId: "madina" })!;
    expect(next).toBeTruthy();
    const slot = slotsForDay({ ...base, date: next.date, serviceIds: [], masterId: "madina" }).find((s) => s.status === "free")!;
    expect(slot.time).toBe(next.time);
  });
});

describe("подбор образа", () => {
  const ov = NO_OVERRIDES;
  it("мужской смелый образ с бородой: фейд + борода, мастер из лукбука", () => {
    const r = recommend(data, ov, { who: "men", vibe: "bold", care: "yes" });
    expect(r.serviceIds).toEqual(["fade", "beard"]);
    expect(r.lookId).toBe("w4");
    expect(r.masterId).toBe("rustam");
  });

  it("мужской короткий без бороды — текстурная стрижка; классика — пробор", () => {
    expect(recommend(data, ov, { who: "men", vibe: "short", care: "no" })).toMatchObject({ lookId: "w3", serviceIds: ["mcut"] });
    expect(recommend(data, ov, { who: "men", vibe: "classic", care: "no" })).toMatchObject({ lookId: "w2", serviceIds: ["classic"], masterId: "jasur" });
  });

  it("женский образ ведёт Мадина, уход добавляет услугу", () => {
    const plain = recommend(data, ov, { who: "women", vibe: "short", care: "no" });
    expect(plain).toMatchObject({ lookId: "w5", serviceIds: ["wcut"], masterId: "madina" });
    expect(recommend(data, ov, { who: "women", vibe: "short", care: "yes" }).serviceIds).toEqual(["wcut", "wcare"]);
  });

  it("каждая комбинация ответов даёт существующий образ, услуги из набора и мастера, который их ведёт", () => {
    for (const who of ["men", "women"] as const)
      for (const vibe of ["short", "bold", "classic"] as const)
        for (const care of ["yes", "no"] as const) {
          const r = recommend(data, ov, { who, vibe, care });
          expect(data.looks.some((l) => l.id === r.lookId)).toBe(true);
          expect(r.serviceIds.length).toBeGreaterThan(0);
          expect(r.masterId).not.toBeNull();
          expect(mastersFor(data, r.serviceIds).some((m) => m.id === r.masterId)).toBe(true);
        }
  });

  it("скрытая владельцем услуга не предлагается; если мастер без рабочих дней — берётся другой", () => {
    const hiddenBeard: SalonOverrides = { services: { beard: { hidden: true } }, schedule: {} };
    expect(recommend(data, hiddenBeard, { who: "men", vibe: "bold", care: "yes" }).serviceIds).toEqual(["fade"]);
    const noRustam: SalonOverrides = { services: {}, schedule: { rustam: [] } };
    expect(recommend(data, noRustam, { who: "men", vibe: "bold", care: "no" }).masterId).toBe("jasur");
  });
});
