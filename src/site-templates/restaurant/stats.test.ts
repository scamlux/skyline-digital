import { describe, expect, it } from "vitest";
import { DAY_MS, leadsPerDay, peakWeekdays, weekStats } from "./stats";
import type { DemoEvent, Lead } from "./store";

/** Ташкент, понедельник 2026-11-09, 12:00 (UTC+5). */
const NOW = Date.parse("2026-11-09T12:00:00+05:00");
const ev = (offsetDays: number, type: DemoEvent["type"]): DemoEvent => ({ at: new Date(NOW - offsetDays * DAY_MS).toISOString(), type });
const lead = (offsetDays: number): Lead => ({ id: `l${offsetDays}`, at: new Date(NOW - offsetDays * DAY_MS).toISOString(), name: "x", phone: "1", when: "", guests: "2", status: "new", source: "site" });

describe("цифры кабинета", () => {
  it("неделя и прошлая неделя считаются отдельно, дельта в процентах", () => {
    const events = [ev(1, "view"), ev(2, "view"), ev(3, "view"), ev(9, "view"), ev(10, "view"), ev(1, "call")];
    const views = weekStats(events, NOW).find((s) => s.k === "views")!;
    expect(views.cur).toBe(3);
    expect(views.delta).toBe(50);
    expect(weekStats(events, NOW).find((s) => s.k === "calls")!.delta).toBeNull();
  });
  it("заявки по семи суткам Ташкента: последний день — сегодня", () => {
    const days = leadsPerDay([ev(0.1, "lead"), ev(0.2, "lead"), ev(2, "lead"), ev(8, "lead")], NOW);
    expect(days).toHaveLength(7);
    expect(days[6]).toMatchObject({ iso: "2026-11-09", weekday: 0, n: 2 });
    expect(days.reduce((s, d) => s + d.n, 0)).toBe(3);
  });
  it("пик по дням недели: меньше трёх заявок — без совета, иначе дни с максимумом", () => {
    expect(peakWeekdays([lead(1), lead(2)], NOW)).toEqual([]);
    expect(peakWeekdays([lead(1), lead(1.1), lead(2)], NOW)).toEqual([6]);
  });
});
