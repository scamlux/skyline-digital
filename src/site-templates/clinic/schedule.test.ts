import { describe, expect, it } from "vitest";
import { tashkentNow } from "../kit/tashkent";
import { clinicDemo } from "./data";
import { calcPlan, effectiveService, LEAD_MINUTES, NO_OVERRIDES, nextFreeSlot, slotTimes, slotsForDay, visibleServices } from "./schedule";

const NOW = tashkentNow(Date.UTC(2026, 10, 2, 3, 0)); // пн 2026-11-02, 08:00 Ташкент
const base = { data: clinicDemo, ov: NO_OVERRIDES, bookings: [], now: NOW };

describe("сетка записи", () => {
  it("с 09:00 до 18:30 каждые 30 минут (клиника закрывается в 19:00)", () => {
    const t = slotTimes(clinicDemo);
    expect(t[0]).toBe("09:00");
    expect(t[t.length - 1]).toBe("18:30");
    expect(t).toHaveLength(20);
  });

  it("в воскресенье слотов нет", () => {
    expect(slotsForDay({ ...base, date: "2026-11-08", serviceId: "clean", doctorId: "any" })).toEqual([]);
  });

  it("слоты детерминированы: те же занятые у всех и при перезагрузке", () => {
    const q = { ...base, date: "2026-11-03", serviceId: "filling", doctorId: "any" as const };
    expect(slotsForDay(q)).toEqual(slotsForDay(q));
    const statuses = slotsForDay(q).map((s) => s.status);
    expect(statuses).toContain("taken");
    expect(statuses).toContain("free");
  });

  it("сегодня прошедшие слоты и слоты ближе LEAD_MINUTES недоступны", () => {
    const noon = tashkentNow(Date.UTC(2026, 10, 2, 7, 0)); // 12:00
    const slots = slotsForDay({ ...base, now: noon, date: noon.iso, serviceId: "clean", doctorId: "any" });
    for (const s of slots) {
      const [h, m] = s.time.split(":").map(Number);
      if (h * 60 + m < noon.minutes + LEAD_MINUTES) expect(s.status).toBe("past");
    }
    expect(slots.find((s) => s.time === "09:00")?.status).toBe("past");
  });

  it("после последнего слота сегодня свободных окон нет", () => {
    const late = tashkentNow(Date.UTC(2026, 10, 2, 13, 50)); // 18:50
    const slots = slotsForDay({ ...base, now: late, date: late.iso, serviceId: "clean", doctorId: "any" });
    expect(slots.length).toBeGreaterThan(0);
    expect(slots.every((s) => s.status === "past")).toBe(true);
  });

  it("«любой врач» назначает конкретного врача, который ведёт услугу и работает в этот день", () => {
    const slots = slotsForDay({ ...base, date: "2026-11-03", serviceId: "braces", doctorId: "any" });
    const free = slots.filter((s) => s.status === "free");
    expect(free.length).toBeGreaterThan(0);
    expect(new Set(free.map((s) => s.doctorId))).toEqual(new Set(["yusupova"]));
  });

  it("врач, не ведущий услугу, слотов не даёт", () => {
    expect(slotsForDay({ ...base, date: "2026-11-02", serviceId: "braces", doctorId: "rakhimova" })).toEqual([]);
  });

  it("nextFreeSlot возвращает окно, которое сетка тоже считает свободным", () => {
    const next = nextFreeSlot(clinicDemo, NO_OVERRIDES, [], NOW)!;
    expect(next).toBeTruthy();
    const svc = clinicDemo.doctors.find((d) => d.id === next.doctorId)!.serviceIds[0];
    const slot = slotsForDay({ ...base, date: next.date, serviceId: svc, doctorId: next.doctorId }).find((s) => s.time === next.time);
    expect(slot?.status).toBe("free");
  });
});

describe("калькулятор лечения", () => {
  it("складывает вилки и визиты, количество умножает цену", () => {
    const r = calcPlan(clinicDemo, NO_OVERRIDES, [
      { id: "clean", qty: 1 },
      { id: "filling", qty: 2 },
    ]);
    expect(r.min).toBe(250_000 + 2 * 250_000);
    expect(r.max).toBe(450_000 + 2 * 600_000);
    expect(r.visits).toBe(Math.ceil(1 + 1 + 0.5));
  });

  it("правка цены владельца меняет итог; min не выше max", () => {
    const ov = { services: { clean: { min: 400_000, max: 300_000 } }, schedule: {} };
    expect(effectiveService(clinicDemo.services[1], ov)).toMatchObject({ min: 400_000, max: 400_000 });
    expect(calcPlan(clinicDemo, ov, [{ id: "clean", qty: 1 }]).max).toBe(400_000);
  });

  it("скрытая услуга выпадает из итога и из списка; количество ограничено maxQty", () => {
    const ov = { services: { clean: { hidden: true } }, schedule: {} };
    expect(visibleServices(clinicDemo, ov).some((s) => s.id === "clean")).toBe(false);
    const r = calcPlan(clinicDemo, ov, [
      { id: "clean", qty: 1 },
      { id: "whitening", qty: 9 },
    ]);
    expect(r.items).toEqual([{ id: "whitening", qty: 2 }]);
    expect(r.min).toBe(2 * 900_000);
  });

  it("пустой план даёт нули", () => {
    expect(calcPlan(clinicDemo, NO_OVERRIDES, [])).toEqual({ min: 0, max: 0, visits: 0, items: [] });
  });
});
