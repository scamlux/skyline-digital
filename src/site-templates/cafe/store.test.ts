import { beforeEach, describe, expect, it } from "vitest";

// Хранилище работает в браузере: подставляем минимальный localStorage и window до импорта.
const mem = new Map<string, string>();
const g = globalThis as unknown as Record<string, unknown>;
g.localStorage = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
g.window = { addEventListener() {}, removeEventListener() {} };

const { demo, stockOf, STORE_KEY } = await import("./store");
const { effective } = await import("./shop");
const { buildSeedOrders } = await import("./seed");
const { periodStats, topDrinks, WEEK_MS } = await import("./stats");
const { itemById, menu } = await import("./data");

const baseOrder = (over: Partial<Parameters<typeof demo.addOrder>[0]> = {}) => ({
  name: "Алина",
  phone: "+998901234567",
  lines: [{ itemId: "flat-white", qty: 1, unit: 32000, sel: {} }],
  total: 32000,
  pickupDate: "2026-11-09",
  pickupTime: "10:20",
  free: false,
  ...over,
});

beforeEach(() => {
  mem.clear();
  // Сбрасываем кэш хранилища: пустой localStorage читается заново.
  mem.set(STORE_KEY, JSON.stringify({ items: {}, stock: {}, orders: [], events: [], stamps: 0 }));
  g.window = { addEventListener() {}, removeEventListener() {} };
  demo.reset();
  mem.set(STORE_KEY, JSON.stringify(demo.get()));
});

describe("заказы и печати", () => {
  it("заказ с сайта попадает в список со статусом «новый» и ставит печать", () => {
    const o = demo.addOrder(baseOrder(), false);
    expect(o?.status).toBe("new");
    expect(o?.source).toBe("site");
    expect(demo.get().orders[0].id).toBe(o?.id);
    expect(demo.get().stamps).toBe(1);
    expect(demo.get().events.some((e) => e.type === "stamp")).toBe(true);
  });

  it("шестая печать открывает карту, заказ с бесплатным кофе обнуляет её", () => {
    for (let i = 0; i < 6; i++) demo.addOrder(baseOrder(), false);
    expect(demo.get().stamps).toBe(6);
    demo.addOrder(baseOrder({ free: true }), true);
    expect(demo.get().stamps).toBe(0);
    expect(demo.get().events.filter((e) => e.type === "redeem")).toHaveLength(1);
  });

  it("смена статуса меняет только нужный заказ", () => {
    const a = demo.addOrder(baseOrder(), false)!;
    const b = demo.addOrder(baseOrder(), false)!;
    demo.setStatus(a.id, "cooking");
    const list = demo.get().orders;
    expect(list.find((o) => o.id === a.id)?.status).toBe("cooking");
    expect(list.find((o) => o.id === b.id)?.status).toBe("new");
  });
});

describe("витрина и правки владельца", () => {
  it("заказ уменьшает остаток витрины; когда не хватает — отказ без побочных эффектов", () => {
    const before = stockOf(demo.get(), "cheesecake")!;
    expect(before).toBeGreaterThan(0);
    const tooMany = baseOrder({ lines: [{ itemId: "cheesecake", qty: before + 1, unit: 38000, sel: {} }] });
    expect(demo.addOrder(tooMany, false)).toBeNull();
    expect(stockOf(demo.get(), "cheesecake")).toBe(before);
    expect(demo.get().orders).toHaveLength(0);
    demo.addOrder(baseOrder({ lines: [{ itemId: "cheesecake", qty: 1, unit: 38000, sel: {} }] }), false);
    expect(stockOf(demo.get(), "cheesecake")).toBe(before - 1);
  });

  it("витрина 0 — «закончилось», позиция не заказывается", () => {
    demo.setStock("croissant", 0);
    const e = effective(itemById("croissant")!, demo.get());
    expect(e.soldOut).toBe(true);
    expect(e.orderable).toBe(false);
    expect(demo.addOrder(baseOrder({ lines: [{ itemId: "croissant", qty: 1, unit: 24000, sel: {} }] }), false)).toBeNull();
  });

  it("«нет сегодня» и скрытие снимают позицию с заказа, цена правится целым числом ≥ 0", () => {
    demo.setItem("flat-white", { off: true });
    expect(effective(itemById("flat-white")!, demo.get()).orderable).toBe(false);
    demo.setItem("flat-white", { off: false, price: 35000.7 });
    expect(effective(itemById("flat-white")!, demo.get()).price).toBe(35001);
    expect(effective(itemById("flat-white")!, demo.get()).orderable).toBe(true);
    demo.setItem("flat-white", { price: -5 });
    expect(effective(itemById("flat-white")!, demo.get()).price).toBe(0);
    demo.setItem("flat-white", { hidden: true });
    expect(effective(itemById("flat-white")!, demo.get()).hidden).toBe(true);
  });

  it("акцию можно выключить и переписать для одного языка", () => {
    demo.setPromo({ on: false });
    expect(demo.get().promo?.on).toBe(false);
    demo.setPromo({ on: true, text: { ru: "Скидка" } });
    demo.setPromo({ on: true, text: { ...demo.get().promo?.text, en: "Sale" } });
    expect(demo.get().promo?.text).toEqual({ ru: "Скидка", en: "Sale" });
  });
});

describe("демо-наполнение и подсчёты", () => {
  const hours = { open: "08:00", close: "22:00" };

  it("seed сохраняет заказы с сайта и правки, заменяет только демо-данные", () => {
    demo.setItem("raf", { price: 40000 });
    const mine = demo.addOrder(baseOrder(), false)!;
    demo.seed(buildSeedOrders(Date.now(), hours));
    demo.seed(buildSeedOrders(Date.now(), hours));
    const s = demo.get();
    expect(s.orders.filter((o) => o.source === "site").map((o) => o.id)).toEqual([mine.id]);
    expect(s.orders.filter((o) => o.source === "seed").length).toBe(buildSeedOrders(Date.now(), hours).length);
    expect(s.items.raf?.price).toBe(40000);
  });

  it("демо-заказы: позиции из меню, итог равен сумме строк, время в часах работы", () => {
    const ids = new Set(menu.map((m) => m.id));
    for (const o of buildSeedOrders(Date.now(), hours)) {
      expect(o.lines.length).toBeGreaterThan(0);
      for (const l of o.lines) expect(ids.has(l.itemId)).toBe(true);
      expect(o.total).toBe(o.lines.reduce((s, l) => s + l.unit * l.qty, 0));
      expect(o.pickupTime >= "08:00" && o.pickupTime <= "22:00").toBe(true);
    }
  });

  it("обзор: заказы, выручка, средний чек и топ напитков считаются по неотменённым заказам", () => {
    const now = Date.now();
    const orders = buildSeedOrders(now, hours);
    const week = periodStats(orders, now - WEEK_MS, now + 1);
    const live = orders.filter((o) => o.status !== "cancelled" && Date.parse(o.at) >= now - WEEK_MS);
    expect(week.count).toBe(live.length);
    expect(week.revenue).toBe(live.reduce((s, o) => s + o.total, 0));
    expect(week.avg).toBe(Math.round(week.revenue / week.count));
    const top = topDrinks(orders, now - WEEK_MS, now + 1);
    expect(top.length).toBeGreaterThan(0);
    for (const x of top) expect(["coffee", "notcoffee"]).toContain(itemById(x.itemId)?.cat);
    for (let i = 1; i < top.length; i++) expect(top[i - 1].qty).toBeGreaterThanOrEqual(top[i].qty);
  });
});
