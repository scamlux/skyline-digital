import { describe, expect, it } from "vitest";
import { restaurantDemo } from "./data";
import { MAX_DISCOUNT, MAX_QTY, adjustQty, addDish, buildSet, clampGuests, dishIndex, discountSum, liveLines, portionsFor, resolveSet, totalFor } from "./sets";

const classic = restaurantDemo.sets.find((s) => s.id === "classic")!;
const light = restaurantDemo.sets.find((s) => s.id === "light")!;
const dishes = (ov = {}) => dishIndex(restaurantDemo.menu, ov);

describe("порции набора", () => {
  it("одна порция на `per` гостей, округление вверх, не меньше одной", () => {
    expect(portionsFor(4, 1)).toBe(4);
    expect(portionsFor(4, 2)).toBe(2);
    expect(portionsFor(5, 2)).toBe(3);
    expect(portionsFor(1, 3)).toBe(1);
    expect(portionsFor(0, 1)).toBe(1);
  });
  it("число гостей ограничено 1…30", () => {
    expect(clampGuests(0)).toBe(1);
    expect(clampGuests(99)).toBe(30);
    expect(clampGuests(Number.NaN)).toBe(1);
  });
});

describe("набор на 4 гостей", () => {
  it("«Классика»: плов ×4, самса ×2, ачичук ×2, лепёшка ×2, чай ×2", () => {
    const lines = buildSet(classic, 4, dishes());
    expect(Object.fromEntries(lines.map((l) => [l.id, l.qty]))).toEqual({ plov: 4, samsa: 2, achichuk: 2, lepyoshka: 2, tea: 2 });
  });
  it("итог = сумма − скидка набора (округлена до тысячи)", () => {
    const d = dishes();
    const lines = buildSet(classic, 4, d);
    const sub = 65000 * 4 + 14000 * 2 + 22000 * 2 + 8000 * 2 + 12000 * 2;
    expect(totalFor(lines, d, 10)).toEqual({ subtotal: sub, discount: discountSum(sub, 10), total: sub - discountSum(sub, 10) });
    expect(discountSum(sub, 10)).toBe(37000);
  });
  it("стоп-лист и скрытые блюда в набор не попадают, правка цены меняет итог", () => {
    const d = dishes({ samsa: { available: false }, tea: { hidden: true }, plov: { price: 70000 } });
    const lines = buildSet(classic, 4, d);
    expect(lines.map((l) => l.id)).toEqual(["plov", "achichuk", "lepyoshka"]);
    expect(totalFor(lines, d, 0).subtotal).toBe(70000 * 4 + 22000 * 2 + 8000 * 2);
  });
  it("строки, ставшие недоступными после сборки, не учитываются в сумме", () => {
    const lines = buildSet(classic, 4, dishes());
    const later = dishes({ samsa: { available: false } });
    expect(liveLines(lines, later).some((l) => l.id === "samsa")).toBe(false);
    expect(totalFor(lines, later, 0).subtotal).toBe(65000 * 4 + 22000 * 2 + 8000 * 2 + 12000 * 2);
  });
  it("«Без мяса» не содержит мясных блюд", () => {
    const ids = buildSet(light, 6, dishes()).map((l) => l.id);
    expect(ids).toEqual(expect.arrayContaining(["veg-grill", "manti"]));
    expect(ids.some((id) => ["plov", "shashlik", "lula", "samsa"].includes(id))).toBe(false);
  });
});

describe("правки набора в кабинете", () => {
  it("выключенный набор помечен, скидка зажата в 0…30, убранные блюда не в составе", () => {
    expect(resolveSet(classic, { on: false }).on).toBe(false);
    expect(resolveSet(classic, { discount: 99 }).discount).toBe(MAX_DISCOUNT);
    expect(resolveSet(classic, { discount: -4 }).discount).toBe(0);
    expect(resolveSet(classic, undefined).discount).toBe(classic.discount);
    const ids = buildSet(classic, 4, dishes(), { off: ["tea", "samsa"] }).map((l) => l.id);
    expect(ids).toEqual(["plov", "achichuk", "lepyoshka"]);
  });
});

describe("правка набора гостем", () => {
  const start = [{ id: "plov", qty: 4 }, { id: "tea", qty: 1 }];
  it("+/− меняют количество, ноль убирает строку, исходный массив не меняется", () => {
    expect(adjustQty(start, "plov", 1)).toEqual([{ id: "plov", qty: 5 }, { id: "tea", qty: 1 }]);
    expect(adjustQty(start, "tea", -1)).toEqual([{ id: "plov", qty: 4 }]);
    expect(start).toEqual([{ id: "plov", qty: 4 }, { id: "tea", qty: 1 }]);
  });
  it("потолок количества", () => {
    expect(adjustQty([{ id: "plov", qty: MAX_QTY }], "plov", 1)).toEqual([{ id: "plov", qty: MAX_QTY }]);
  });
  it("addDish добавляет новое или увеличивает существующее", () => {
    expect(addDish(start, "samsa")).toHaveLength(3);
    expect(addDish(start, "tea")[1]).toEqual({ id: "tea", qty: 2 });
  });
});
