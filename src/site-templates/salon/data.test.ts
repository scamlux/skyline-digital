import { describe, expect, it } from "vitest";
import { LOCALES, type L } from "../types";
import { adminUi as salonAdminUi, adminWords as salonAdminWords } from "./admin-ui";
import { salonBusinesses } from "./data";
import { menData } from "./data-men";
import { READY_OPTIONAL, withAvailablePhotos } from "./photos";
import { slotTimes } from "./schedule";
import { splitHeadline } from "./format";
import { salonUi } from "./ui";

const businesses = Object.values(salonBusinesses);
const WORDS_IN_TITLE = 5;
const LINE_CHARS = 90;
const MAX_FAQ = 5;
const FAQ_ANSWER_CHARS = 110;

const words = (s: string) => s.trim().split(/\s+/).length;

describe("шаблон «Салон»: данные двух бизнесов", () => {
  it("два бизнеса: барбершоп A и салон красоты B с разными названиями", () => {
    expect(salonBusinesses.a.name).toBe("USTARA Barbershop");
    expect(salonBusinesses.b.name).toBe("Nafis Beauty");
    expect(salonBusinesses.a.style).toBe("a");
    expect(salonBusinesses.b.style).toBe("b");
  });

  it("услуги: положительные время и цена, группа из списка, у каждой есть мастер", () => {
    for (const d of businesses) {
      const groups = new Set(d.groups.map((g) => g.id));
      for (const s of d.services) {
        expect(s.minutes).toBeGreaterThan(0);
        expect(s.price).toBeGreaterThan(0);
        expect(groups.has(s.group)).toBe(true);
        expect(d.masters.some((m) => m.serviceIds.includes(s.id))).toBe(true);
      }
      for (const g of d.groups) expect(d.services.some((s) => s.group === g.id)).toBe(true);
    }
  });

  it("мастера: у барбершопа два (третий ждёт фото), у салона три; ведут существующие услуги, работают хотя бы пять дней", () => {
    expect(salonBusinesses.a.masters).toHaveLength(2 + (READY_OPTIONAL.has("m-master-4") ? 1 : 0));
    expect(salonBusinesses.b.masters).toHaveLength(3);
    for (const d of businesses) {
      const ids = new Set(d.services.map((s) => s.id));
      for (const m of d.masters) {
        for (const id of m.serviceIds) expect(ids.has(id)).toBe(true);
        expect(m.days.length).toBeGreaterThanOrEqual(5);
      }
    }
    expect(menData.masters.map((m) => m.photo)).toEqual(["master-1", "master-2", "m-master-4"]);
    expect(salonBusinesses.b.masters.map((m) => m.photo)).toEqual(["master-3", "w-master-1", "w-master-2"]);
  });

  it("лукбук: у барбершопа 4 работы сейчас (ещё две ждут фото), у салона 8; мастер ведёт все услуги работы; фильтры из списка", () => {
    expect(salonBusinesses.a.looks).toHaveLength(4 + (READY_OPTIONAL.has("m-work-7") ? 1 : 0) + (READY_OPTIONAL.has("m-work-8") ? 1 : 0));
    expect(salonBusinesses.b.looks).toHaveLength(8);
    for (const d of businesses) {
      const filters = new Set(d.filters.map((f) => f.id));
      for (const l of d.looks) {
        const master = d.masters.find((m) => m.id === l.masterId)!;
        expect(master).toBeTruthy();
        for (const id of l.serviceIds) expect(master.serviceIds).toContain(id);
        for (const t of l.tags) expect(filters.has(t)).toBe(true);
      }
      for (const f of d.filters) expect(d.looks.some((l) => l.tags.includes(f.id))).toBe(true);
    }
    expect(menData.looks.map((l) => l.photo)).toEqual(["work-1", "work-2", "work-3", "work-4", "m-work-7", "m-work-8"]);
    expect(salonBusinesses.b.looks.map((l) => l.photo)).toEqual(Array.from({ length: 8 }, (_, i) => `w-work-${i + 1}`));
  });

  it("необязательные фото: когда файлы появились, работы, мастер и широкий кадр возвращаются без правок кода", () => {
    const ready = new Set(["m-work-7", "m-work-8", "m-master-4", "m-hero-wide"]);
    const full = withAvailablePhotos(menData, ready);
    expect(full.looks).toHaveLength(6);
    expect(full.masters).toHaveLength(3);
    expect(full.place.photo.base).toBe("m-hero-wide");
    const none = withAvailablePhotos(menData, new Set());
    expect(none.looks.map((l) => l.photo)).toEqual(["work-1", "work-2", "work-3", "work-4"]);
    expect(none.masters).toHaveLength(2);
    expect(none.place.photo.base).toBe("interior");
    // каждая услуга и пакет остаются закрыты мастерами и без необязательного мастера
    for (const sv of none.services) expect(none.masters.some((m) => m.serviceIds.includes(sv.id))).toBe(true);
  });

  it("пакеты: услуги существуют, скидка 5–20 %", () => {
    for (const d of businesses) {
      expect(d.packages.length).toBeGreaterThanOrEqual(3);
      const ids = new Set(d.services.map((s) => s.id));
      for (const p of d.packages) {
        expect(p.serviceIds.length).toBeGreaterThanOrEqual(2);
        for (const id of p.serviceIds) expect(ids.has(id)).toBe(true);
        expect(p.pct).toBeGreaterThanOrEqual(5);
        expect(p.pct).toBeLessThanOrEqual(20);
      }
    }
  });

  it("подбор образа: два вопроса, результат на каждую комбинацию ответов", () => {
    for (const d of businesses) {
      const [q1, q2] = d.quiz.questions;
      for (const a of q1.options) {
        for (const b of q2.options) {
          const r = d.quiz.results[`${a.id}.${b.id}`];
          expect(r, `${d.style}: ${a.id}.${b.id}`).toBeTruthy();
          expect(d.looks.some((l) => l.id === r.lookId)).toBe(true);
          for (const id of r.serviceIds) expect(d.services.some((s) => s.id === id)).toBe(true);
        }
      }
    }
  });

  it("часы работы 10:00–21:00 шаг 30 минут; демо-наборы для кабинета состоят из существующих услуг", () => {
    for (const d of businesses) {
      expect(d.hours).toEqual({ open: "10:00", close: "21:00" });
      expect(slotTimes(d)).toHaveLength(22);
      const ids = new Set(d.services.map((s) => s.id));
      for (const basket of d.seedBaskets) for (const id of basket) expect(ids.has(id)).toBe(true);
    }
  });

  it("клубные детали барбершопа: членство, кофе и виски; у салона чай", () => {
    expect(salonBusinesses.a.services.some((s) => s.id === "club")).toBe(true);
    expect(salonBusinesses.a.perks.map((p) => p.id)).toEqual(["coffee", "whisky"]);
    expect(salonBusinesses.b.perks.map((p) => p.id)).toContain("tea");
  });

  it("заголовок hero собирается в слова без склейки", () => {
    for (const d of businesses) {
      for (const loc of LOCALES) {
        const text = `${d.hero.line1[loc]} ${d.hero.line2[loc]}`;
        expect(splitHeadline(text).map((w) => w.join("")).join(" ")).toBe(text);
      }
    }
  });

  it("узбекский: интерфейс без «неправильных» апострофов, формы лет, дни недели", () => {
    expect(Object.keys(salonUi.years.ru).sort()).toEqual(["few", "many", "one"]);
    const forms = [...Object.values(salonUi.years.uz), ...Object.values(salonAdminWords).flatMap((w) => Object.values(w.uz))];
    for (const f of forms) expect(f).not.toMatch(/[‘’'`]/);
    for (const loc of LOCALES) expect(salonAdminUi.days[loc]).toHaveLength(7);
    expect(salonAdminUi.days.uz.join("")).not.toMatch(/[‘’'`]/);
  });

  it("всё вымышленное помечено демо: адрес, акция, отзывы и цены подписаны", () => {
    for (const d of businesses) {
      expect(d.address.ru).toContain("демо");
      expect(d.promo.ru).toContain("демо");
      for (const loc of LOCALES) expect(d.copy.reviews.line[loc].toLowerCase()).toContain(loc === "ru" ? "демо" : "demo");
    }
    for (const loc of LOCALES) expect(salonUi.demoTag[loc].toLowerCase()).toContain(loc === "ru" ? "демо" : "demo");
  });
});

describe("шаблон «Салон»: меньше текстового шума", () => {
  const copies = businesses.flatMap((d) => Object.entries(d.copy).map(([k, c]) => ({ key: `${d.style}.${k}`, title: c.title, line: c.line })));

  it("заголовки секций не длиннее пяти слов на всех языках", () => {
    for (const c of copies) for (const loc of LOCALES) expect(words(c.title[loc]), `${c.key} ${loc}`).toBeLessThanOrEqual(WORDS_IN_TITLE);
  });

  it("заголовок hero не длиннее пяти слов, строка под ним не длиннее 90 знаков", () => {
    for (const d of businesses) {
      for (const loc of LOCALES) {
        expect(words(`${d.hero.line1[loc]} ${d.hero.line2[loc]}`)).toBeLessThanOrEqual(WORDS_IN_TITLE);
        expect(d.hero.line[loc].length).toBeLessThanOrEqual(LINE_CHARS);
      }
    }
  });

  it("каждая поддерживающая строка секции не длиннее 90 знаков на всех языках", () => {
    for (const c of copies) for (const loc of LOCALES) expect(c.line[loc].length, `${c.key} ${loc}`).toBeLessThanOrEqual(LINE_CHARS);
  });

  it("FAQ: не больше пяти вопросов, ответы короткие", () => {
    for (const d of businesses) {
      expect(d.faq.length).toBeLessThanOrEqual(MAX_FAQ);
      for (const f of d.faq) for (const loc of LOCALES) expect(f.a[loc].length, `${d.style} ${f.q.ru} ${loc}`).toBeLessThanOrEqual(FAQ_ANSWER_CHARS);
    }
  });

  it("все строки данных и интерфейса заполнены на трёх языках", () => {
    const all: L[] = [];
    const walk = (n: unknown) => {
      if (!n || typeof n !== "object") return;
      const o = n as Record<string, unknown>;
      if (typeof o.ru === "string" && typeof o.en === "string" && typeof o.uz === "string") return void all.push(o as unknown as L);
      Object.values(o).forEach(walk);
    };
    walk(businesses);
    walk(salonUi);
    expect(all.length).toBeGreaterThan(200);
    for (const l of all) for (const loc of LOCALES) expect(l[loc].trim().length).toBeGreaterThan(0);
  });
});
