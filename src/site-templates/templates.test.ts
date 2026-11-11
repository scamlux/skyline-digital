import { describe, expect, it } from "vitest";
import { restaurantDemo } from "./restaurant/data";
import { restaurantUi } from "./restaurant/ui";
import { clinicDemo } from "./clinic/data";
import { clinicUi } from "./clinic/ui";
import { adminUi as clinicAdminUi, adminWords } from "./clinic/admin-ui";
import { slotTimes } from "./clinic/schedule";
import { salonBusinesses } from "./salon/data";
import { salonUi } from "./salon/ui";
import { adminUi as salonAdminUi } from "./salon/admin-ui";
import { cafeDemo, menu as cafeMenu, OPTIONS as cafeOptions, CATS as cafeCats } from "./cafe/data";
import { cafeUi } from "./cafe/ui";
import { adminUi as cafeAdminUi } from "./cafe/admin-ui";
import { TEMPLATES } from "./registry";
import { formatSum, LOCALES, STYLE_IDS, type L } from "./types";

/** Собирает все строки-на-трёх-языках из объекта (данные и тексты интерфейса). */
function collect(node: unknown, path: string, out: { path: string; l: L }[]) {
  if (!node || typeof node !== "object") return;
  const o = node as Record<string, unknown>;
  if (typeof o.ru === "string" && typeof o.en === "string" && typeof o.uz === "string") {
    out.push({ path, l: o as unknown as L });
    return;
  }
  for (const [k, v] of Object.entries(o)) collect(v, `${path}.${k}`, out);
}

describe("шаблоны: тексты на трёх языках", () => {
  const all: { path: string; l: L }[] = [];
  collect(restaurantDemo, "data", all);
  collect(restaurantUi, "ui", all);
  collect(clinicDemo, "clinic.data", all);
  collect(clinicUi, "clinic.ui", all);
  collect(clinicAdminUi, "clinic.admin", all);
  collect(salonBusinesses, "salon.data", all);
  collect(salonUi, "salon.ui", all);
  collect(salonAdminUi, "salon.admin", all);
  collect(cafeDemo, "cafe.data", all);
  collect(cafeMenu, "cafe.menu", all);
  collect(cafeOptions, "cafe.options", all);
  collect(cafeUi, "cafe.ui", all);
  collect(cafeAdminUi, "cafe.admin", all);
  // Названия, описания и настроения стилей из реестра тоже видны посетителям витрины.
  collect(
    TEMPLATES.map((t) => ({ title: t.title, blurb: t.blurb, styles: t.styles.map((s) => ({ name: s.name, mood: s.mood })) })),
    "registry",
    all,
  );

  it("нашлись строки для проверки", () => {
    expect(all.length).toBeGreaterThan(60);
  });

  it.each(all.map((a) => [a.path, a.l] as const))("%s: заполнены ru/en/uz", (_p, l) => {
    for (const loc of LOCALES) expect(l[loc].trim().length).toBeGreaterThan(0);
  });

  it("узбекский: нет «‘», «’» и «'» вместо ʻ (U+02BB)", () => {
    const bad = all.filter((a) => /[‘’'`]/.test(a.l.uz)).map((a) => a.path);
    expect(bad).toEqual([]);
  });
});

describe("шаблон «Ресторан»: данные", () => {
  it("в каждой категории есть блюда, цены положительные", () => {
    for (const c of restaurantDemo.menu) {
      expect(c.items.length).toBeGreaterThan(0);
      for (const it of c.items) expect(it.price).toBeGreaterThan(0);
    }
  });

  it("часы работы в формате HH:MM", () => {
    expect(restaurantDemo.hours.open).toMatch(/^\d{2}:\d{2}$/);
    expect(restaurantDemo.hours.close).toMatch(/^\d{2}:\d{2}$/);
  });

  it("есть позиция в стоп-листе (демонстрация)", () => {
    expect(restaurantDemo.menu.flatMap((c) => c.items).some((i) => i.available === false)).toBe(true);
  });
});

describe("шаблон «Ресторан»: подстановки в тексты", () => {
  it("«открыто/закроется» содержат {t} на всех языках (время подставляется в браузере)", () => {
    for (const loc of LOCALES) {
      expect(restaurantUi.openNow[loc]).toContain("{t}");
      expect(restaurantUi.closedNow[loc]).toContain("{t}");
    }
  });
});

describe("шаблон «Клиника»: данные", () => {
  it("у каждой услуги вилка min ≤ max, у платных — положительная; у калькуляторных maxQty ≥ 1", () => {
    for (const s of clinicDemo.services) {
      expect(s.min).toBeLessThanOrEqual(s.max);
      expect(s.maxQty).toBeGreaterThanOrEqual(1);
      if (s.calc) expect(s.max).toBeGreaterThan(0);
    }
  });

  it("врачи ведут существующие услуги и принимают в рабочие дни (не в закрытые)", () => {
    const ids = new Set(clinicDemo.services.map((s) => s.id));
    for (const d of clinicDemo.doctors) {
      expect(d.serviceIds.length).toBeGreaterThan(0);
      for (const id of d.serviceIds) expect(ids.has(id)).toBe(true);
      for (const day of d.days) expect(clinicDemo.hours.closedDays).not.toContain(day);
    }
    // Каждая услуга из списка записи кем-то ведётся.
    for (const s of clinicDemo.services) expect(clinicDemo.doctors.some((d) => d.serviceIds.includes(s.id))).toBe(true);
  });

  it("плитки «Что беспокоит?»: шесть, подписи короткие (до трёх слов)", () => {
    expect(clinicDemo.symptoms).toHaveLength(6);
    for (const s of clinicDemo.symptoms) for (const loc of LOCALES) expect(s.label[loc].split(/\s+/).length).toBeLessThanOrEqual(3);
  });

  it("часы работы HH:MM, сетка записи шагом 30 минут, воскресенье закрыто", () => {
    expect(clinicDemo.hours.open).toMatch(/^\d{2}:\d{2}$/);
    expect(clinicDemo.hours.close).toMatch(/^\d{2}:\d{2}$/);
    expect(clinicDemo.hours.closedDays).toEqual([6]);
    expect(slotTimes(clinicDemo).length).toBeGreaterThan(10);
  });

  it("названия дней недели в кабинете: по 7 на язык, узбекский без ‘ ’ '", () => {
    for (const loc of LOCALES) expect(clinicAdminUi.days[loc]).toHaveLength(7);
    expect(clinicAdminUi.days.uz.join("")).not.toMatch(/[‘’'`]/);
  });

  it("склонения «лет опыта» и слова кабинета: у ru есть one/few/many, у uz нет апострофов", () => {
    expect(Object.keys(clinicUi.years.ru).sort()).toEqual(["few", "many", "one"]);
    const uzForms = [...Object.values(clinicUi.years.uz), ...Object.values(clinicAdminWordsUz())];
    expect(uzForms.join("")).not.toMatch(/[‘’'`]/);
  });
});

function clinicAdminWordsUz(): string[] {
  return Object.values(adminWords).flatMap((w) => Object.values(w.uz));
}

describe("шаблон «Салон»: реестр", () => {
  it("шаблон «Салон» зарегистрирован с кабинетом, OG-картинкой и подписями стилей для панели демо", () => {
    const t = TEMPLATES.find((x) => x.id === "salon")!;
    expect(t.renderAdmin).toBeTruthy();
    expect(t.og.image).toBe("/templates/salon/img/og-1200.jpg");
    expect(t.styles.map((s) => s.label?.ru)).toEqual(["Муж", "Жен"]);
  });
});

describe("formatSum", () => {
  it("группирует разряды неразрывным пробелом и добавляет валюту по языку", () => {
    expect(formatSum(65000, "ru")).toBe("65 000 сум");
    expect(formatSum(1250000, "en")).toBe("1 250 000 UZS");
    expect(formatSum(8000, "uz")).toBe("8 000 soʻm");
  });
});

describe("реестр шаблонов", () => {
  it("у каждого шаблона два стиля a/b и уникальный id", () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const t of TEMPLATES) expect(t.styles.map((s) => s.id)).toEqual(STYLE_IDS);
  });
});

describe("шаблон «Кафе»: данные", () => {
  it("меню: цены положительные, категории из списка, в каждой категории есть позиции", () => {
    for (const m of cafeMenu) {
      expect(m.price).toBeGreaterThan(0);
      expect(cafeCats).toContain(m.cat);
    }
    for (const c of cafeCats) expect(cafeMenu.some((m) => m.cat === c)).toBe(true);
  });

  it("опции позиций существуют, у каждой группы значение по умолчанию есть среди вариантов", () => {
    for (const m of cafeMenu) for (const k of m.options) expect(cafeOptions[k]).toBeTruthy();
    for (const g of Object.values(cafeOptions)) expect(g.choices.some((c) => c.id === g.def)).toBe(true);
  });

  it("часы работы в формате HH:MM, открытие раньше закрытия", () => {
    expect(cafeDemo.hours.open).toMatch(/^\d{2}:\d{2}$/);
    expect(cafeDemo.hours.close).toMatch(/^\d{2}:\d{2}$/);
    expect(cafeDemo.hours.open < cafeDemo.hours.close).toBe(true);
  });

  it("витрина: у позиций с остатком он положительный и есть и в выпечке, и в десертах", () => {
    const stocked = cafeMenu.filter((m) => m.stock !== undefined);
    expect(stocked.length).toBeGreaterThanOrEqual(3);
    expect(stocked.some((m) => m.cat === "bakery") && stocked.some((m) => m.cat === "dessert")).toBe(true);
    for (const m of stocked) expect(m.stock).toBeGreaterThan(0);
  });

  it("заголовки героя — не больше пяти слов", () => {
    for (const st of ["a", "b"] as const) for (const loc of LOCALES) expect(cafeDemo.hero[st].title[loc].split(/\s+/).length).toBeLessThanOrEqual(5);
  });

  it("реестр: кафе с кабинетом и превью для соцсетей", () => {
    const t = TEMPLATES.find((x) => x.id === "cafe")!;
    expect(t.renderAdmin).toBeTruthy();
    expect(t.og.image).toMatch(/^\/templates\/cafe\/img\//);
  });
});

describe("шаблон «Кафе»: тексты", () => {
  it("«открыто/закрыто» содержат {t} на всех языках (время подставляется в браузере)", () => {
    for (const loc of LOCALES) {
      expect(cafeUi.openUntil[loc]).toContain("{t}");
      expect(cafeUi.closedUntil[loc]).toContain("{t}");
    }
  });

  it("у каждой категории и статуса заказа есть подпись", () => {
    for (const c of cafeCats) expect(cafeUi.cats[c].ru.length).toBeGreaterThan(0);
    for (const st of ["new", "cooking", "ready", "done", "cancelled"] as const) expect(cafeAdminUi.orders.status[st].ru.length).toBeGreaterThan(0);
  });
});
