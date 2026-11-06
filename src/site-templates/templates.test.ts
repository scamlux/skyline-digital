import { describe, expect, it } from "vitest";
import { restaurantDemo } from "./restaurant/data";
import { restaurantUi } from "./restaurant/ui";
import { clinicDemo } from "./clinic/data";
import { clinicUi } from "./clinic/ui";
import { adminUi as clinicAdminUi, adminWords } from "./clinic/admin-ui";
import { slotTimes } from "./clinic/schedule";
import { salonDemo, CATEGORIES } from "./salon/data";
import { salonUi } from "./salon/ui";
import { adminUi as salonAdminUi, adminWords as salonAdminWords } from "./salon/admin-ui";
import { slotTimes as salonSlotTimes } from "./salon/schedule";
import { splitHeadline } from "./salon/format";
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
  collect(salonDemo, "salon.data", all);
  collect(salonUi, "salon.ui", all);
  collect(salonAdminUi, "salon.admin", all);
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

  it("слова в смене заголовка: ровно четыре (CSS-цикл рассчитан на 4 слова)", () => {
    expect(clinicDemo.hero.words).toHaveLength(4);
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

describe("шаблон «Салон»: данные", () => {
  it("услуги: положительные длительность и цена, категории из списка, у каждой есть мастер", () => {
    for (const s of salonDemo.services) {
      expect(s.minutes).toBeGreaterThan(0);
      expect(s.price).toBeGreaterThan(0);
      expect(CATEGORIES).toContain(s.cat);
      expect(salonDemo.masters.some((m) => m.serviceIds.includes(s.id))).toBe(true);
    }
    for (const c of CATEGORIES) expect(salonDemo.services.some((s) => s.cat === c)).toBe(true);
  });

  it("мастера: три, ведут существующие услуги, работают хотя бы пять дней", () => {
    expect(salonDemo.masters).toHaveLength(3);
    const ids = new Set(salonDemo.services.map((s) => s.id));
    for (const m of salonDemo.masters) {
      for (const id of m.serviceIds) expect(ids.has(id)).toBe(true);
      expect(m.days.length).toBeGreaterThanOrEqual(5);
    }
  });

  it("лукбук: шесть работ, услуги и мастер существуют, мастер ведёт все услуги работы", () => {
    expect(salonDemo.looks).toHaveLength(6);
    for (const l of salonDemo.looks) {
      const master = salonDemo.masters.find((m) => m.id === l.masterId)!;
      expect(master).toBeTruthy();
      for (const id of l.serviceIds) expect(master.serviceIds).toContain(id);
    }
  });

  it("часы 10:00–21:00, сетка шагом 30 минут, работает каждый день", () => {
    expect(salonDemo.hours).toEqual({ open: "10:00", close: "21:00" });
    expect(salonSlotTimes(salonDemo)).toHaveLength(22);
  });

  it("узбекский: нет апострофов; склонения и дни недели кабинета заполнены", () => {
    expect(Object.keys(salonUi.years.ru).sort()).toEqual(["few", "many", "one"]);
    const forms = [...Object.values(salonUi.years.uz), ...Object.values(salonAdminWords).flatMap((w) => Object.values(w.uz))];
    expect(forms.join("")).not.toMatch(/[‘’'`]/);
    for (const loc of LOCALES) expect(salonAdminUi.days[loc]).toHaveLength(7);
    expect(salonAdminUi.days.uz.join("")).not.toMatch(/[‘’'`]/);
  });

  it("заголовок hero: слова и буквы собираются обратно в исходную строку (пробелы не теряются)", () => {
    for (const style of ["a", "b"] as const)
      for (const line of salonDemo.hero[style])
        for (const loc of LOCALES) {
          const words = splitHeadline(line[loc]);
          expect(words.map((w) => w.join("")).join(" ")).toBe(line[loc]);
        }
    expect(splitHeadline("без спешки")).toEqual([Array.from("без"), Array.from("спешки")]);
  });

  it("демо-пометки: оценка в плавающей карточке и в цифрах помечена «демо» на всех языках", () => {
    for (const loc of LOCALES) {
      expect(salonUi.float.rating[loc].toLowerCase()).toContain(loc === "ru" ? "демо" : "demo");
      expect(salonDemo.stats.find((s) => s.id === "rating")!.label[loc].toLowerCase()).toContain(loc === "ru" ? "демо" : "demo");
    }
  });

  it("шаблон «Салон» зарегистрирован с кабинетом и OG-картинкой", () => {
    const t = TEMPLATES.find((x) => x.id === "salon")!;
    expect(t.renderAdmin).toBeTruthy();
    expect(t.og.image).toBe("/templates/salon/img/og-1200.jpg");
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
