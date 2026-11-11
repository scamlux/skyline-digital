import { describe, expect, it } from "vitest";
import {
  LAST_ORDER_BEFORE_CLOSE,
  PICKUP_LEAD,
  STAMPS_GOAL,
  addLine,
  buildOrderText,
  cartCount,
  cartSubtotal,
  freeCupDiscount,
  freeCupReady,
  isValidPickup,
  lineKey,
  normalizeSelection,
  planPickup,
  setLineQty,
  stampsAfterOrder,
  telegramLink,
  unitPrice,
  type CartLine,
  type Pricing,
} from "./pricing";

const HOURS = { open: "08:00", close: "22:00" };
const pricing: Pricing = {
  price: (id) => ({ latte: 30000, cake: 40000, tea: 20000 })[id] ?? 0,
  kinds: (id) => (id === "cake" ? [] : ["size", "milk", "syrup"]),
};

describe("цена с опциями", () => {
  it("средний размер без добавок — базовая цена", () => {
    expect(unitPrice(30000, ["size", "milk", "syrup"], {})).toBe(30000);
  });

  it("размер L, кокосовое молоко и сироп суммируются", () => {
    expect(unitPrice(30000, ["size", "milk", "syrup"], { size: "l", milk: "coconut", syrup: "vanilla" })).toBe(30000 + 5000 + 5000 + 3000);
  });

  it("размер S дешевле; овсяное молоко — без доплаты (акция)", () => {
    expect(unitPrice(30000, ["size", "milk"], { size: "s", milk: "oat" })).toBe(26000);
  });

  it("опции, которых у позиции нет, не влияют на цену", () => {
    expect(unitPrice(40000, [], { size: "l", milk: "coconut" })).toBe(40000);
  });

  it("цена не уходит ниже нуля", () => {
    expect(unitPrice(2000, ["size"], { size: "s" })).toBe(0);
  });

  it("normalizeSelection подставляет умолчания и отбрасывает неизвестные значения", () => {
    expect(normalizeSelection(["size", "milk"], { size: "xl", milk: "oat" })).toEqual({ size: "m", milk: "oat" });
  });
});

describe("корзина", () => {
  it("одинаковая позиция с теми же опциями увеличивает количество", () => {
    let lines: CartLine[] = [];
    lines = addLine(lines, "latte", { size: "l" });
    lines = addLine(lines, "latte", { size: "l" });
    expect(lines).toHaveLength(1);
    expect(lines[0].qty).toBe(2);
  });

  it("другие опции — отдельная строка", () => {
    let lines: CartLine[] = [];
    lines = addLine(lines, "latte", { size: "l" });
    lines = addLine(lines, "latte", { size: "s" });
    expect(lines).toHaveLength(2);
    expect(lineKey("latte", { size: "l" })).not.toBe(lineKey("latte", { size: "s" }));
  });

  it("сумма считается с опциями и количеством", () => {
    let lines: CartLine[] = [];
    lines = addLine(lines, "latte", { size: "l", milk: "coconut" }, 2);
    lines = addLine(lines, "cake", {});
    expect(cartSubtotal(lines, pricing)).toBe(2 * (30000 + 5000 + 5000) + 40000);
    expect(cartCount(lines)).toBe(3);
  });

  it("нулевое количество убирает строку; исходный массив не меняется", () => {
    const lines = addLine([], "tea", {});
    const next = setLineQty(lines, lines[0].key, 0);
    expect(next).toHaveLength(0);
    expect(lines).toHaveLength(1);
  });

  it("бесплатный кофе — самая дешёвая порция кофе в корзине", () => {
    let lines: CartLine[] = [];
    lines = addLine(lines, "latte", { size: "l" });
    lines = addLine(lines, "tea", {});
    lines = addLine(lines, "latte", { size: "s" });
    const coffee = (id: string) => id === "latte";
    expect(freeCupDiscount(lines, pricing, coffee)).toBe(26000);
    expect(freeCupDiscount(addLine([], "cake", {}), pricing, coffee)).toBe(0);
  });
});

describe("время получения", () => {
  it("днём — быстрые варианты 10/20/30 минут, сетка начинается не раньше запаса", () => {
    const plan = planPickup({ iso: "2026-11-09", minutes: 10 * 60 }, HOURS);
    expect(plan.openNow).toBe(true);
    expect(plan.date).toBe("2026-11-09");
    expect(plan.quick.map((q) => q.minutes)).toEqual([10, 20, 30]);
    expect(plan.quick[0].time).toBe("10:10");
    expect(plan.slots[0]).toBe("10:15");
    expect(isValidPickup(plan, "10:10")).toBe(true);
    expect(isValidPickup(plan, "10:15")).toBe(true);
    expect(isValidPickup(plan, "10:05")).toBe(false);
  });

  it("запас на приготовление: ближайший слот не раньше PICKUP_LEAD минут", () => {
    const plan = planPickup({ iso: "2026-11-09", minutes: 12 * 60 + 1 }, HOURS);
    const [h, m] = plan.slots[0].split(":").map(Number);
    expect(h * 60 + m).toBeGreaterThanOrEqual(12 * 60 + 1 + PICKUP_LEAD);
  });

  it("до открытия — быстрых нет, сетка с открытия того же дня", () => {
    const plan = planPickup({ iso: "2026-11-09", minutes: 7 * 60 }, HOURS);
    expect(plan.openNow).toBe(false);
    expect(plan.quick).toEqual([]);
    expect(plan.date).toBe("2026-11-09");
    expect(plan.slots[0]).toBe("08:00");
  });

  it("перед закрытием быстрые варианты урезаются, а поздно вечером заказ уходит на завтра", () => {
    const late = planPickup({ iso: "2026-11-09", minutes: 21 * 60 + 35 }, HOURS);
    expect(late.quick.map((q) => q.minutes)).toEqual([10]);
    const after = planPickup({ iso: "2026-11-09", minutes: 21 * 60 + 55 }, HOURS);
    expect(after.openNow).toBe(false);
    expect(after.date).toBe("2026-11-10");
    expect(after.slots[0]).toBe("08:00");
  });

  it("последний слот — за LAST_ORDER_BEFORE_CLOSE минут до закрытия", () => {
    const plan = planPickup({ iso: "2026-11-09", minutes: 9 * 60 }, HOURS);
    expect(plan.slots[plan.slots.length - 1]).toBe("21:45");
    expect(LAST_ORDER_BEFORE_CLOSE).toBe(10);
  });
});

describe("лояльность", () => {
  it("каждый заказ добавляет печать, шестая открывает бесплатный кофе", () => {
    let stamps = 0;
    for (let i = 0; i < STAMPS_GOAL; i++) stamps = stampsAfterOrder(stamps, false);
    expect(stamps).toBe(STAMPS_GOAL);
    expect(freeCupReady(stamps)).toBe(true);
    expect(freeCupReady(STAMPS_GOAL - 1)).toBe(false);
  });

  it("печати не превышают цель, заказ с бесплатным кофе обнуляет карту", () => {
    expect(stampsAfterOrder(STAMPS_GOAL, false)).toBe(STAMPS_GOAL);
    expect(stampsAfterOrder(STAMPS_GOAL, true)).toBe(0);
  });
});

describe("текст заказа для Telegram", () => {
  it("содержит позиции, итог, время и контакты; ссылка кодирует текст", () => {
    const text = buildOrderText({
      shop: "Bodom",
      lines: [{ name: "Флэт уайт", qty: 2, opts: "L, овсяное", sum: "70 000 сум" }],
      total: "70 000 сум",
      pickupLabel: "Сегодня, 10:20",
      pickupWord: "Заберу",
      totalWord: "Итого",
      name: "Алина",
      phone: "+998901234567",
    });
    expect(text).toContain("Флэт уайт (L, овсяное) ×2");
    expect(text).toContain("Заберу: Сегодня, 10:20");
    const link = telegramLink("bodom_demo", text);
    expect(link.startsWith("https://t.me/bodom_demo?text=")).toBe(true);
    expect(decodeURIComponent(link.split("text=")[1])).toBe(text);
  });
});
