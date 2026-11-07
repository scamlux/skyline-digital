import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { tashkentNow } from "../kit/tashkent";
import { salonDemo } from "./data";
import { buildSeedBookings } from "./seed";
import { NO_OVERRIDES, slotsForDay, toScheduleData, type SalonOverrides } from "./schedule";

/**
 * Демо-хранилище салона. Окружение vitest — node, поэтому localStorage подменяем
 * минимальным Map-стабом ДО импорта стора, а модуль подключаем динамически.
 */
const mem = new Map<string, string>();
vi.stubGlobal("localStorage", {
  getItem: (k: string) => (mem.has(k) ? (mem.get(k) as string) : null),
  setItem: (k: string, v: string) => void mem.set(k, String(v)),
  removeItem: (k: string) => void mem.delete(k),
});

type Store = typeof import("./store");
let demo: Store["demo"];

beforeAll(async () => {
  ({ demo } = await import("./store"));
});

beforeEach(() => {
  mem.clear();
  demo.reset();
});

const data = toScheduleData(salonDemo);
// Вторник 2026-11-03, 08:00 по Ташкенту — все слоты дня ещё впереди.
const NOW_TS = Date.UTC(2026, 10, 3, 3, 0);
const NOW = tashkentNow(NOW_TS);
const DAY = NOW.iso;

const guest = { name: "Тест", phone: "+998 90 000 00 00", serviceIds: ["fade"], masterId: "rustam", anyMaster: false, date: DAY, time: "12:00", minutes: 60, total: 120_000 };

const overridesOf = (): SalonOverrides => {
  const s = demo.get();
  return { services: s.services, schedule: s.schedule };
};

describe("salon demo store: записи", () => {
  it("addBooking создаёт запись со статусом new, источником site и событие booking", () => {
    const b = demo.addBooking(guest);
    const s = demo.get();
    expect(b?.status).toBe("new");
    expect(b?.source).toBe("site");
    expect(s.bookings).toHaveLength(1);
    expect(s.bookings[0]).toMatchObject({ name: "Тест", masterId: "rustam", date: DAY, time: "12:00", total: 120_000 });
    expect(s.events.filter((e) => e.type === "booking")).toHaveLength(1);
  });

  it("id записей уникальны даже в одну миллисекунду", () => {
    const a = demo.addBooking(guest);
    const b = demo.addBooking({ ...guest, time: "14:00" });
    expect(a?.id).toBeTruthy();
    expect(a?.id).not.toBe(b?.id);
  });

  it("пересекающееся окно мастера не бронируется, соседнее и чужого мастера — можно, после отмены — снова можно", () => {
    const first = demo.addBooking(guest)!; // 12:00–13:00
    expect(demo.addBooking({ ...guest, name: "Второй", time: "12:30", minutes: 30 })).toBeNull();
    expect(demo.addBooking({ ...guest, name: "Третий", time: "11:30", minutes: 60 })).toBeNull();
    expect(demo.addBooking({ ...guest, name: "Сосед", time: "13:00", minutes: 30 })).not.toBeNull();
    expect(demo.addBooking({ ...guest, name: "Другой", masterId: "jasur" })).not.toBeNull();
    demo.setStatus(first.id, "cancelled");
    expect(demo.addBooking({ ...guest, name: "После отмены" })).not.toBeNull();
  });

  it("setStatus меняет статус только нужной записи", () => {
    const a = demo.addBooking(guest)!;
    const b = demo.addBooking({ ...guest, time: "15:00" })!;
    demo.setStatus(a.id, "confirmed");
    demo.setStatus(b.id, "noshow");
    const byId = Object.fromEntries(demo.get().bookings.map((x) => [x.id, x.status]));
    expect(byId[a.id]).toBe("confirmed");
    expect(byId[b.id]).toBe("noshow");
  });

  it("запись блокирует слот на сайте, отмена возвращает его", () => {
    const q = { data, bookings: [] as never[], date: DAY, serviceIds: ["fade"], masterId: "rustam", now: NOW, ov: NO_OVERRIDES };
    const free = slotsForDay(q).find((s) => s.status === "free")!;
    expect(free).toBeTruthy();
    const b = demo.addBooking({ ...guest, time: free.time })!;
    expect(slotsForDay({ ...q, bookings: demo.get().bookings }).find((s) => s.time === free.time)!.status).toBe("taken");
    demo.setStatus(b.id, "cancelled");
    expect(slotsForDay({ ...q, bookings: demo.get().bookings }).find((s) => s.time === free.time)!.status).toBe("free");
  });
});

describe("salon demo store: цены и длительность", () => {
  it("setService округляет и ограничивает: цена ≥ 0, длительность 5–480 минут", () => {
    demo.setService("fade", { price: 135_000.6, minutes: 70 });
    expect(demo.get().services.fade).toEqual({ price: 135_001, minutes: 70 });
    demo.setService("fade", { price: -5, minutes: 1 });
    expect(demo.get().services.fade).toEqual({ price: 0, minutes: 5 });
    demo.setService("fade", { minutes: 9999 });
    expect(demo.get().services.fade?.minutes).toBe(480);
  });

  it("скрытие услуги не трогает цену", () => {
    demo.setService("fade", { price: 130_000 });
    demo.setService("fade", { hidden: true });
    expect(demo.get().services.fade).toEqual({ price: 130_000, hidden: true });
  });
});

describe("salon demo store: график мастеров", () => {
  it("выходной мастера убирает его слоты на сайте", () => {
    const q = { data, bookings: [] as never[], date: DAY, serviceIds: ["wcut"], masterId: "any" as const, now: NOW };
    expect(slotsForDay({ ...q, ov: overridesOf() }).some((s) => s.status === "free")).toBe(true);
    demo.setMasterDays("madina", [0, 2, 3, 4, 5, 6]); // вторник (1) убран
    expect(slotsForDay({ ...q, ov: overridesOf() })).toEqual([]);
    demo.setMasterDays("madina", [0, 1, 2]);
    expect(slotsForDay({ ...q, ov: overridesOf() }).some((s) => s.status === "free")).toBe(true);
  });

  it("дни сортируются и не дублируются", () => {
    demo.setMasterDays("rustam", [5, 1, 1, 3]);
    expect(demo.get().schedule.rustam).toEqual([1, 3, 5]);
  });
});

describe("salon demo store: seed и reset", () => {
  const seedOf = () => buildSeedBookings(data, NO_OVERRIDES, NOW_TS);

  it("seed даёт детерминированные id s0.. и отсортированные события", () => {
    const seed = seedOf();
    demo.seed(seed);
    const s = demo.get();
    expect(s.bookings.map((b) => b.id)).toEqual(seed.map((_, i) => `s${i}`));
    expect(s.bookings.every((b) => b.source === "seed")).toBe(true);
    expect(s.seededAt).toBeTruthy();
    const ats = s.events.map((e) => e.at);
    expect(ats).toEqual([...ats].sort());
    expect(s.events.filter((e) => e.type === "booking")).toHaveLength(seed.length);
  });

  it("seed сохраняет запись с сайта сверху, её статус и правки; повторный seed не плодит записи", () => {
    const mine = demo.addBooking(guest)!;
    demo.setStatus(mine.id, "confirmed");
    demo.setService("fade", { price: 1 });
    demo.setMasterDays("jasur", [1]);
    const seed = seedOf();
    demo.seed(seed);
    const s = demo.get();
    expect(s.bookings[0].id).toBe(mine.id);
    expect(s.bookings[0].status).toBe("confirmed");
    expect(s.bookings).toHaveLength(seed.length + 1);
    expect(s.services.fade?.price).toBe(1);
    expect(s.schedule.jasur).toEqual([1]);
    demo.seed(seed.slice(0, 2));
    expect(demo.get().bookings.map((b) => b.id)).toEqual([mine.id, "s0", "s1"]);
  });

  it("reset очищает записи, события и правки, но помечает демо заполненным", () => {
    demo.addBooking(guest);
    demo.setMasterDays("rustam", [1]);
    demo.track("view");
    demo.reset();
    const s = demo.get();
    expect(s.bookings).toEqual([]);
    expect(s.events).toEqual([]);
    expect(s.services).toEqual({});
    expect(s.schedule).toEqual({});
    expect(s.seededAt).toBeTruthy();
  });
});

describe("демо-наполнение записей", () => {
  const seed = buildSeedBookings(data, NO_OVERRIDES, NOW_TS);

  it("записей достаточно, нет пересечений у одного мастера, всё внутри часов работы и на рабочих днях", () => {
    expect(seed.length).toBeGreaterThanOrEqual(10);
    for (const [i, a] of seed.entries()) {
      const master = salonDemo.masters.find((m) => m.id === a.masterId)!;
      expect(a.serviceIds.every((id) => master.serviceIds.includes(id))).toBe(true);
      const start = Number(a.time.slice(0, 2)) * 60 + Number(a.time.slice(3));
      expect(start).toBeGreaterThanOrEqual(10 * 60);
      expect(start + a.minutes).toBeLessThanOrEqual(21 * 60);
      for (const b of seed.slice(i + 1)) {
        if (a.masterId !== b.masterId || a.date !== b.date) continue;
        const bs = Number(b.time.slice(0, 2)) * 60 + Number(b.time.slice(3));
        expect(start < bs + b.minutes && bs < start + a.minutes).toBe(false);
      }
    }
  });

  it("прошлая запись не «новая», будущая — не «пришёл»", () => {
    for (const b of seed) {
      if (b.date < DAY) expect(["arrived", "noshow", "cancelled"]).toContain(b.status);
      else expect(["new", "confirmed"]).toContain(b.status);
    }
  });
});
