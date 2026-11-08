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

  it("addLead хранит зону, повод и предзаказ", () => {
    const lead = demo.addLead({ ...guest, zone: "tapchan", occasion: "birthday", wish: "Набор «Классика»: Плов ×4", wishSum: 234000 });
    expect(demo.get().leads[0]).toMatchObject({ id: lead.id, zone: "tapchan", occasion: "birthday", wishSum: 234000 });
  });

  it("setSet сливает патчи и округляет скидку", () => {
    demo.setSet("classic", { discount: 12.4 });
    demo.setSet("classic", { off: ["tea"] });
    demo.setSet("classic", { on: false });
    expect(demo.get().sets.classic).toEqual({ discount: 12, off: ["tea"], on: false });
  });

  it("seed не трогает правки наборов", () => {
    demo.setSet("grill", { discount: 5 });
    demo.seed([guest]);
    expect(demo.get().sets.grill).toEqual({ discount: 5 });
  });
});

describe("restaurant store: чтение старых записей (v1 без наборов, зон и поводов)", () => {
  it("старая запись читается: заявки без зоны, пустой when у демо-наполнения, нет sets", async () => {
    const { normalizeState } = await import("./store");
    const old = {
      items: { plov: { price: 70000 } },
      hours: { open: "09:00", close: "22:00" },
      promo: { on: false },
      leads: [
        { id: "s0", at: "2026-10-30T10:00:00.000Z", name: "Дилноза", phone: "+998 90 111 22 33", when: "", guests: "4", status: "new", source: "seed" },
        { id: "l1", at: "2026-10-31T10:00:00.000Z", name: "Акмаль", phone: "+998 97 222 33 44", when: "2026-11-01T19:00", guests: 2, status: "confirmed", source: "site" },
      ],
      events: [{ at: "2026-10-30T10:00:00.000Z", type: "view" }],
      seededAt: "2026-10-30T10:00:00.000Z",
    };
    const s = normalizeState(old);
    expect(s.sets).toEqual({});
    expect(s.items.plov).toEqual({ price: 70000 });
    expect(s.hours).toEqual({ open: "09:00", close: "22:00" });
    expect(s.leads).toHaveLength(2);
    expect(s.leads[0]).toMatchObject({ when: "", zone: undefined, occasion: undefined, wish: undefined });
    expect(s.leads[1].guests).toBe("2");
  });

  it("мусор в хранилище не роняет: нечитаемые поля заменяются пустыми", async () => {
    const { normalizeState } = await import("./store");
    const s = normalizeState({ items: [], sets: "x", leads: [null, 5, { nope: 1 }, { id: "a", status: "bogus", zone: "roof" }], events: [{ type: "view" }, { at: "x", type: "boom" }], hours: { open: "9", close: "x" } });
    expect(s.items).toEqual({});
    expect(s.sets).toEqual({});
    expect(s.leads).toHaveLength(1);
    expect(s.leads[0]).toMatchObject({ status: "new", zone: undefined });
    expect(s.events).toEqual([]);
    expect(s.hours).toBeUndefined();
    expect(normalizeState(null).leads).toEqual([]);
  });
});
