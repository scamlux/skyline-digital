import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { vi } from "vitest";
import { tashkentNow } from "../kit/tashkent";
import { clinicDemo } from "./data";
import { NO_OVERRIDES, slotsForDay, type ClinicOverrides } from "./schedule";
import { buildSeedBookings } from "./seed";

/**
 * Демо-хранилище клиники. Окружение vitest — node, поэтому localStorage подменяем
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

// Понедельник 2026-11-02, 08:00 по Ташкенту — все слоты дня ещё впереди.
const NOW_TS = Date.UTC(2026, 10, 2, 3, 0);
const NOW = tashkentNow(NOW_TS);
const MONDAY = NOW.iso;

const guest = { name: "Тест", phone: "+998 90 000 00 00", serviceId: "clean", doctorId: "rakhimova", anyDoctor: false, date: MONDAY, time: "10:00" };

const overridesOf = (): ClinicOverrides => {
  const s = demo.get();
  return { services: s.services, schedule: s.schedule };
};

describe("clinic demo store: записи", () => {
  it("addBooking создаёт запись со статусом new, источником site и событие booking", () => {
    const b = demo.addBooking(guest);
    const s = demo.get();
    expect(b?.status).toBe("new");
    expect(b?.source).toBe("site");
    expect(s.bookings).toHaveLength(1);
    expect(s.bookings[0]).toMatchObject({ name: "Тест", doctorId: "rakhimova", date: MONDAY, time: "10:00" });
    expect(s.events.filter((e) => e.type === "booking")).toHaveLength(1);
  });

  it("id записей уникальны даже в одну миллисекунду", () => {
    const a = demo.addBooking(guest);
    const b = demo.addBooking({ ...guest, time: "10:30" });
    expect(a?.id).toBeTruthy();
    expect(a?.id).not.toBe(b?.id);
  });

  it("занятый слот врача второй раз не бронируется, у другого врача — можно, после отмены — снова можно", () => {
    const first = demo.addBooking(guest);
    expect(demo.addBooking({ ...guest, name: "Второй" })).toBeNull();
    expect(demo.addBooking({ ...guest, doctorId: "yusupova", serviceId: "whitening" })).not.toBeNull();
    demo.setStatus(first!.id, "cancelled");
    expect(demo.addBooking({ ...guest, name: "Третий" })).not.toBeNull();
  });

  it("setStatus меняет статус только нужной записи", () => {
    const a = demo.addBooking(guest)!;
    const b = demo.addBooking({ ...guest, time: "11:00" })!;
    demo.setStatus(a.id, "confirmed");
    demo.setStatus(b.id, "noshow");
    const byId = Object.fromEntries(demo.get().bookings.map((x) => [x.id, x.status]));
    expect(byId[a.id]).toBe("confirmed");
    expect(byId[b.id]).toBe("noshow");
  });

  it("запись блокирует слот на сайте, отмена возвращает его", () => {
    const q = { data: clinicDemo, bookings: [] as never[], date: MONDAY, serviceId: "clean", doctorId: "rakhimova", now: NOW, ov: NO_OVERRIDES };
    const free = slotsForDay(q).find((s) => s.status === "free")!;
    expect(free).toBeTruthy();
    const b = demo.addBooking({ ...guest, time: free.time })!;
    const blocked = slotsForDay({ ...q, bookings: demo.get().bookings }).find((s) => s.time === free.time)!;
    expect(blocked.status).toBe("taken");
    demo.setStatus(b.id, "cancelled");
    const again = slotsForDay({ ...q, bookings: demo.get().bookings }).find((s) => s.time === free.time)!;
    expect(again.status).toBe("free");
  });
});

describe("clinic demo store: цены", () => {
  const base = { min: 250_000, max: 450_000 };

  it("setService правит вилку и сохраняет её; граница подтягивает вторую (min ≤ max)", () => {
    demo.setService("clean", { min: 300_000 }, base);
    expect(demo.get().services.clean).toMatchObject({ min: 300_000, max: 450_000 });
    demo.setService("clean", { min: 700_000 }, base);
    expect(demo.get().services.clean).toMatchObject({ min: 700_000, max: 700_000 });
    demo.setService("clean", { max: 100_000 }, base);
    expect(demo.get().services.clean).toMatchObject({ min: 700_000, max: 700_000 });
  });

  it("скрытие услуги не трогает цену и сливается с прежними полями", () => {
    demo.setService("clean", { min: 300_000 }, base);
    demo.setService("clean", { hidden: true }, base);
    expect(demo.get().services.clean).toEqual({ min: 300_000, max: 450_000, hidden: true });
  });
});

describe("clinic demo store: график врачей", () => {
  it("выходной врача убирает его слоты на сайте (в том числе при «любой врач»)", () => {
    // Каримов принимает по понедельникам — единственный врач, ведущий имплантацию.
    const q = { data: clinicDemo, bookings: [] as never[], date: MONDAY, serviceId: "implant", doctorId: "any" as const, now: NOW };
    expect(slotsForDay({ ...q, ov: overridesOf() }).some((s) => s.status === "free")).toBe(true);
    demo.setDoctorDays("karimov", [2, 3, 5]);
    expect(slotsForDay({ ...q, ov: overridesOf() })).toEqual([]);
    expect(slotsForDay({ ...q, doctorId: "karimov", ov: overridesOf() })).toEqual([]);
    demo.setDoctorDays("karimov", [0, 2, 3, 5]);
    expect(slotsForDay({ ...q, ov: overridesOf() }).some((s) => s.status === "free")).toBe(true);
  });

  it("воскресенье нельзя сделать рабочим днём врача", () => {
    demo.setDoctorDays("rakhimova", [0, 6]);
    const sunday = "2026-11-08";
    expect(slotsForDay({ data: clinicDemo, ov: overridesOf(), bookings: [], date: sunday, serviceId: "clean", doctorId: "any", now: NOW })).toEqual([]);
  });
});

describe("clinic demo store: seed и reset", () => {
  const seedOf = () => buildSeedBookings(clinicDemo, NO_OVERRIDES, NOW_TS);

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

  it("seed сохраняет запись с сайта сверху, её статус и правки цен/графика; повторный seed не плодит записи", () => {
    const mine = demo.addBooking(guest)!;
    demo.setStatus(mine.id, "confirmed");
    demo.setService("clean", { min: 1 }, { min: 250_000, max: 450_000 });
    demo.setDoctorDays("yusupova", [1]);
    const seed = seedOf();
    demo.seed(seed);
    const s = demo.get();
    expect(s.bookings[0].id).toBe(mine.id);
    expect(s.bookings[0].status).toBe("confirmed");
    expect(s.bookings).toHaveLength(seed.length + 1);
    expect(s.services.clean?.min).toBe(1);
    expect(s.schedule.yusupova).toEqual([1]);
    expect(s.events.some((e) => e.type === "booking" && e.at === mine.at)).toBe(true);
    demo.seed(seed.slice(0, 2));
    expect(demo.get().bookings.map((b) => b.id)).toEqual([mine.id, "s0", "s1"]);
  });

  it("reset очищает записи, события и правки, но помечает демо заполненным", () => {
    demo.addBooking(guest);
    demo.setDoctorDays("karimov", [1]);
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
  const seed = buildSeedBookings(clinicDemo, NO_OVERRIDES, NOW_TS);

  it("нет воскресных, нет пересечений у одного врача, время — из сетки приёма", () => {
    expect(seed.length).toBeGreaterThanOrEqual(8);
    const keys = seed.map((b) => `${b.doctorId}|${b.date}|${b.time}`);
    expect(new Set(keys).size).toBe(keys.length);
    for (const b of seed) {
      const doc = clinicDemo.doctors.find((d) => d.id === b.doctorId)!;
      expect(doc.serviceIds).toContain(b.serviceId);
      expect(slotsForDay({ data: clinicDemo, ov: NO_OVERRIDES, bookings: [], date: b.date, serviceId: b.serviceId, doctorId: b.doctorId, now: tashkentNow(0) }).map((s) => s.time)).toContain(b.time);
    }
  });

  it("запись из прошлого не «новая», будущая — не «пришёл»", () => {
    for (const b of seed) {
      if (b.date < MONDAY) expect(["arrived", "noshow", "cancelled"]).toContain(b.status);
      else expect(["new", "confirmed"]).toContain(b.status);
    }
  });
});
