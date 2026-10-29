import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Демо-хранилище ресторана. Окружение vitest — node, поэтому localStorage подменяем
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

const guest = { name: "Тест", phone: "+998 90 000 00 00", when: "2026-11-01T19:00", guests: "4" };

describe("restaurant demo store", () => {
  it("addLead создаёт заявку со статусом new и событие lead", () => {
    const lead = demo.addLead(guest);
    const s = demo.get();
    expect(lead.status).toBe("new");
    expect(lead.source).toBe("site");
    expect(s.leads).toHaveLength(1);
    expect(s.leads[0].name).toBe("Тест");
    expect(s.events.filter((e) => e.type === "lead")).toHaveLength(1);
  });

  it("setLeadStatus меняет статус только нужной заявки", () => {
    const a = demo.addLead(guest);
    // id строится от Date.now() — разводим во времени, чтобы заявки не совпали.
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 5_000);
    const b = demo.addLead({ ...guest, name: "Второй" });
    vi.useRealTimers();
    demo.setLeadStatus(a.id, "confirmed");
    const byId = Object.fromEntries(demo.get().leads.map((l) => [l.id, l.status]));
    expect(byId[a.id]).toBe("confirmed");
    expect(byId[b.id]).toBe("new");
  });

  it("setItem сливает патчи, не затирая прежние поля", () => {
    demo.setItem("m1", { price: 50000 });
    demo.setItem("m1", { available: false });
    demo.setItem("m1", { hidden: true });
    expect(demo.get().items.m1).toEqual({ price: 50000, available: false, hidden: true });
  });

  it("seed даёт детерминированные id s0.. и отсортированные события", () => {
    const seedLeads = [guest, { ...guest, name: "Второй" }, { ...guest, name: "Третий" }];
    demo.seed(seedLeads);
    const s = demo.get();
    expect(s.leads.map((l) => l.id)).toEqual(["s0", "s1", "s2"]);
    expect(s.leads.every((l) => l.source === "seed")).toBe(true);
    expect(s.leads[0].status).toBe("new");
    expect(s.seededAt).toBeTruthy();
    const ats = s.events.map((e) => e.at);
    expect(ats).toEqual([...ats].sort());
    expect(s.events.filter((e) => e.type === "lead")).toHaveLength(3);
  });

  it("seed сохраняет заявку с сайта сверху и не меняет её статус", () => {
    const mine = demo.addLead(guest);
    demo.setLeadStatus(mine.id, "confirmed");
    demo.setItem("m1", { price: 1 });
    demo.seed([guest, { ...guest, name: "Второй" }]);
    const s = demo.get();
    expect(s.leads.map((l) => l.id)).toEqual([mine.id, "s0", "s1"]);
    expect(s.leads[0].status).toBe("confirmed");
    expect(s.items.m1).toEqual({ price: 1 });
    expect(s.events.some((e) => e.type === "lead" && e.at === mine.at)).toBe(true);
    // повторное наполнение не плодит демо-заявки
    demo.seed([guest]);
    expect(demo.get().leads.map((l) => l.id)).toEqual([mine.id, "s0"]);
  });

  it("reset очищает заявки, события и правки, но помечает демо заполненным", () => {
    demo.addLead(guest);
    demo.setItem("m1", { price: 1 });
    demo.track("view");
    demo.reset();
    const s = demo.get();
    expect(s.leads).toEqual([]);
    expect(s.events).toEqual([]);
    expect(s.items).toEqual({});
    expect(s.seededAt).toBeTruthy();
  });
});
