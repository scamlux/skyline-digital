import { describe, expect, it } from "vitest";
import { DIGEST_FIELDS, type DigestPayload, type DigestTemplate } from "@/site-templates/kit/digest-payload";
import { LOCALES, type Locale } from "@/site-templates/types";
import { STUDIO_SITES_URL, formatDigest, formatHelp } from "./format";

/** formatSum ставит неразрывные пробелы; для сравнения с обычными. */
const plain = (s: string): string => s.replace(/\u00a0/g, " ");

const base = (tpl: DigestTemplate, locale: Locale, values: Record<string, number>, style: "a" | "b" = "a"): DigestPayload =>
  ({ tpl, locale, style, period: "week", values: { ...Object.fromEntries(Object.keys(DIGEST_FIELDS[tpl]).map((k) => [k, 0])), ...values } }) as DigestPayload;

const RESTAURANT = { leads: 12, calls: 8, telegram: 5, views: 320, peak: 0b0010100 };
const CLINIC = { bookings: 21, calcs: 4, calls: 11, telegram: 3, views: 400, svc: 1, peak: 0b0000011 };
const SALON = { bookings: 14, revenue: 1_250_000, quizzes: 6, calls: 9, telegram: 4, views: 280, svc: 1, master: 1, masterN: 5 };
const CAFE = { orders: 58, revenue: 2_900_000, avg: 50_000, views: 640, drink: 1 };

describe("сводка для бота: ресторан", () => {
  it("ru: название, период, числа со склонением, пик заявок", () => {
    const text = formatDigest(base("restaurant", "ru", RESTAURANT));
    expect(text).toContain("<b>");
    expect(text.toLowerCase()).toContain("за 7 дней");
    expect(text).toContain("Заявки на бронь: <b>12</b>");
    expect(text).toContain("320 визитов");
    expect(text).toContain("5 переходов");
    expect(text).toContain("3,8% от визитов");
    expect(text).toContain("Пик заявок: среда, пятница");
    expect(text).toContain("демо");
    expect(text).toContain(STUDIO_SITES_URL);
  });

  it("склонение по числу: 1 визит, 2 визита", () => {
    expect(formatDigest(base("restaurant", "ru", { ...RESTAURANT, views: 1, leads: 0 }))).toContain("1 визит ");
    expect(formatDigest(base("restaurant", "ru", { ...RESTAURANT, views: 2 }))).toContain("2 визита ");
  });

  it("без пика советы нет, а предложение с числами есть", () => {
    const text = formatDigest(base("restaurant", "ru", { ...RESTAURANT, peak: 0 }));
    expect(text).not.toContain("Пик заявок");
    expect(text).toContain("💡");
  });

  it("en и uz: тексты на своём языке, uz с ʻ", () => {
    const en = formatDigest(base("restaurant", "en", RESTAURANT));
    expect(en).toContain("Booking requests: <b>12</b>");
    expect(en).toContain("320 visits");
    expect(en).toContain("every Monday");
    const uz = formatDigest(base("restaurant", "uz", RESTAURANT));
    expect(uz).toContain("Bron soʻrovlari: <b>12</b>");
    expect(uz).toContain("dushanba");
    expect(uz).not.toContain("'");
  });
});

describe("сводка для бота: клиника, салон, кафе", () => {
  it("клиника: услуга и дни приёма; при пике в >3 дней — без дней", () => {
    const text = formatDigest(base("clinic", "ru", CLINIC));
    expect(text).toContain("Записи на приём: <b>21</b>");
    expect(text).toContain("21 запись");
    expect(text).toMatch(/Пик приёма: Пн, Вт/);
    const flat = formatDigest(base("clinic", "ru", { ...CLINIC, peak: 0b1111111 }));
    expect(flat).toContain("Чаще всего записываются");
    expect(flat).not.toContain("Пик приёма");
  });

  it("клиника: svc = 0 — без совета по услуге", () => {
    expect(formatDigest(base("clinic", "en", { ...CLINIC, svc: 0 }))).not.toContain("most requested");
  });

  it("салон: оба бизнеса, сумма записей, мастер", () => {
    const men = plain(formatDigest(base("salon", "ru", SALON, "a")));
    const women = formatDigest(base("salon", "ru", SALON, "b"));
    expect(men).toContain("USTARA");
    expect(women).toContain("Nafis");
    expect(men).toContain("Сумма записей: <b>1 250 000 сум</b>");
    expect(men).toContain("Самый загруженный мастер");
    expect(formatDigest(base("salon", "en", { ...SALON, master: 0, masterN: 0 }, "a"))).not.toContain("busiest master");
    expect(formatDigest(base("salon", "uz", SALON, "a"))).toContain("soʻm");
  });

  it("кафе: выручка и средний чек в сумах, хит недели", () => {
    const ru = plain(formatDigest(base("cafe", "ru", CAFE)));
    expect(ru).toContain("Заказы: <b>58</b>");
    expect(ru).toContain("Выручка: <b>2 900 000 сум</b>");
    expect(ru).toContain("Средний чек: <b>50 000 сум</b>");
    expect(ru).toContain("Хит недели:");
    expect(formatDigest(base("cafe", "en", CAFE))).toContain("UZS");
    expect(formatDigest(base("cafe", "en", { ...CAFE, drink: 0 }))).not.toContain("💡");
  });

  it("все шаблоны и языки дают непустой текст со ссылкой на студию и без незаполненных {шаблонов}", () => {
    const sample: Record<DigestTemplate, Record<string, number>> = { restaurant: RESTAURANT, clinic: CLINIC, salon: SALON, cafe: CAFE };
    for (const tpl of Object.keys(sample) as DigestTemplate[]) {
      for (const locale of LOCALES) {
        const text = formatDigest(base(tpl, locale, sample[tpl]));
        expect(text.length).toBeGreaterThan(100);
        expect(text.length).toBeLessThan(1000);
        expect(text).toContain(STUDIO_SITES_URL);
        expect(text).not.toMatch(/\{\w+\}/);
        expect(text).not.toContain("undefined");
      }
    }
  });
});

describe("справка", () => {
  it("на трёх языках и со ссылкой на /sites", () => {
    const help = formatHelp();
    expect(help).toContain("Это демо-бот");
    expect(help).toContain("This is a Skyline Digital demo bot");
    expect(help).toContain("Bu Skyline Digital demo-boti");
    expect(help).toContain(STUDIO_SITES_URL);
  });
});
