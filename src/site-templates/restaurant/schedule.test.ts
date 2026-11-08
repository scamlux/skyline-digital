import { describe, expect, it } from "vitest";
import { addDays, tashkentNow } from "../kit/tashkent";
import { DAYS_AHEAD, ZONES, ZONE_IDS, baseBusy, datesWithRoom, dayPartOf, partyMax, slotIsFree, slotTimes, slotsForDay, zoneFits, zonesFor, type BookingLike } from "./schedule";

const OPEN = "10:00";
const CLOSE = "23:00";
/** Ташкент, 2026-11-09 (понедельник) в заданное время. */
const at = (hhmm: string, date = "2026-11-09") => tashkentNow(Date.parse(`${date}T${hhmm}:00+05:00`));

describe("сетка времени", () => {
  it("посадки от открытия до закрытия минус 90 минут, шаг 30", () => {
    const t = slotTimes(OPEN, CLOSE);
    expect(t[0]).toBe("10:00");
    expect(t.at(-1)).toBe("21:30");
    expect(t).toHaveLength(24);
  });
  it("закрытие раньше открытия — пустая сетка; правка часов сдвигает сетку", () => {
    expect(slotTimes("12:00", "11:00")).toEqual([]);
    expect(slotTimes("12:00", "20:00").at(-1)).toBe("18:30");
  });
  it("части дня: утро < 12:00, день < 17:00, дальше вечер", () => {
    expect(dayPartOf("11:30")).toBe("morning");
    expect(dayPartOf("12:00")).toBe("day");
    expect(dayPartOf("16:30")).toBe("day");
    expect(dayPartOf("17:00")).toBe("evening");
  });
});

describe("зоны и компания", () => {
  it("partyMax читает точное число, диапазон и «9+»", () => {
    expect(partyMax("4")).toBe(4);
    expect(partyMax("3–4")).toBe(4);
    expect(partyMax("5–8")).toBe(8);
    expect(partyMax("9+")).toBeGreaterThanOrEqual(12);
    expect(partyMax("")).toBe(2);
  });
  it("тапчан от трёх гостей, терраса до восьми, большая компания — только зал", () => {
    expect(zoneFits("tapchan", 2)).toBe(false);
    expect(zoneFits("tapchan", 4)).toBe(true);
    expect(zoneFits("terrace", 9)).toBe(false);
    expect(zonesFor(partyMax("9+"))).toEqual(["hall"]);
    expect(zonesFor(2)).toEqual(["hall", "terrace"]);
  });
});

describe("свободные места", () => {
  it("зал вне вечернего пика всегда свободен", () => {
    for (let i = 0; i < 60; i++) {
      const date = addDays("2026-11-09", i);
      for (const time of ["10:00", "12:30", "17:00", "18:00", "21:00", "21:30"]) expect(baseBusy(date, time, "hall")).toBe(false);
    }
  });
  it("в зале на любой день есть свободный вечерний слот", () => {
    for (let i = 0; i < 90; i++) {
      const date = addDays("2026-11-09", i);
      const evening = slotsForDay({ open: OPEN, close: CLOSE, date, zone: "hall", party: 4, bookings: [], now: at("09:00") }).filter((s) => dayPartOf(s.time) === "evening");
      expect(evening.some((s) => s.status === "free")).toBe(true);
    }
  });
  it("демо-загрузка детерминирована", () => {
    expect(baseBusy("2026-11-13", "19:30", "tapchan")).toBe(baseBusy("2026-11-13", "19:30", "tapchan"));
  });
  it("живые заявки занимают столы зоны: тапчан — 2 стола, третья заявка на то же время не проходит", () => {
    // Находим слот, не занятый демо-загрузкой.
    const date = "2026-11-10";
    const time = slotTimes(OPEN, CLOSE).find((t) => !baseBusy(date, t, "tapchan"))!;
    const mk = (status: string, zone?: BookingLike["zone"]): BookingLike => ({ when: `${date}T${time}`, zone, status });
    expect(slotIsFree([], date, time, "tapchan")).toBe(true);
    expect(slotIsFree([mk("new", "tapchan")], date, time, "tapchan")).toBe(true);
    expect(slotIsFree([mk("new", "tapchan"), mk("confirmed", "tapchan")], date, time, ZONE_IDS[2])).toBe(false);
    // Отменённые и завершённые стол не держат; другая зона не мешает.
    expect(slotIsFree([mk("cancelled", "tapchan"), mk("done", "tapchan"), mk("new", "hall")], date, time, "tapchan")).toBe(true);
    expect(ZONES.tapchan.tables).toBe(2);
  });
  it("заявка без зоны занимает зал", () => {
    const date = "2026-11-10";
    const time = "12:00";
    const many: BookingLike[] = Array.from({ length: ZONES.hall.tables }, () => ({ when: `${date}T${time}`, status: "new" }));
    expect(slotIsFree(many, date, time, "hall")).toBe(false);
    expect(slotIsFree(many.slice(1), date, time, "hall")).toBe(true);
  });
});

describe("слоты дня", () => {
  const base = { open: OPEN, close: CLOSE, zone: "hall" as const, party: 4, bookings: [] as BookingLike[] };
  it("сегодня — только слоты не ближе 45 минут от «сейчас»", () => {
    const slots = slotsForDay({ ...base, date: "2026-11-09", now: at("14:10") });
    expect(slots[0].time).toBe("15:00");
  });
  it("будущий день — вся сетка; прошлый — пусто; до гидрации (now = null) — пусто", () => {
    expect(slotsForDay({ ...base, date: "2026-11-10", now: at("14:10") })).toHaveLength(24);
    expect(slotsForDay({ ...base, date: "2026-11-08", now: at("14:10") })).toEqual([]);
    expect(slotsForDay({ ...base, date: "2026-11-10", now: null })).toEqual([]);
  });
  it("зона не подходит по размеру компании — пусто", () => {
    expect(slotsForDay({ ...base, zone: "tapchan", party: 2, date: "2026-11-10", now: at("09:00") })).toEqual([]);
  });
  it("после 21:00 сегодня мест нет: дата автоматически переходит на завтра", () => {
    const now = at("21:10");
    expect(slotsForDay({ ...base, date: "2026-11-09", now })).toEqual([]);
    const dates = datesWithRoom({ ...base, now });
    expect(dates[0]).toBe("2026-11-10");
    expect(dates.length).toBeLessThanOrEqual(DAYS_AHEAD - 1);
  });
  it("в 20:50 мест нет (20:50 + 45 мин позже последней посадки 21:30), в 20:45 — одна", () => {
    expect(slotsForDay({ ...base, date: "2026-11-09", now: at("20:50") })).toEqual([]);
    expect(slotsForDay({ ...base, date: "2026-11-09", now: at("20:45") }).map((s) => s.time)).toEqual(["21:30"]);
  });
});
