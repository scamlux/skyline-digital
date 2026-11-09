import { clinicDemo } from "@/site-templates/clinic/data";
import { adminUi as clinicUi, adminWords as clinicWords } from "@/site-templates/clinic/admin-ui";
import { cafeDemo, menu as cafeMenu } from "@/site-templates/cafe/data";
import { adminUi as cafeUi } from "@/site-templates/cafe/admin-ui";
import { restaurantDemo } from "@/site-templates/restaurant/data";
import { adminUi as restaurantUi, adminWords as restaurantWords } from "@/site-templates/restaurant/admin-ui";
import { salonBusinesses } from "@/site-templates/salon/data";
import { adminUi as salonUi, adminWords as salonWords } from "@/site-templates/salon/admin-ui";
import { maskToWeekdays, type DigestPayload, type DigestValues } from "@/site-templates/kit/digest-payload";
import { formatDate } from "@/site-templates/kit/tashkent";
import { plural } from "@/site-templates/kit/plural";
import { formatSum, pick, type L, type Locale } from "@/site-templates/types";

/**
 * Текст сообщения-сводки для бота (Telegram HTML parse mode).
 * Собирается из тех же строк и тех же правил, что превью в кабинете шаблона (admin-ui.ts каждого
 * шаблона), а числа приходят из разобранной нагрузки ссылки. Чистые функции без сети и env.
 */

export const STUDIO_SITES_URL = "https://skyline-digital.uz/sites";

type Forms = Partial<Record<Intl.LDMLPluralRule, string>>;
type Words = Record<string, Record<Locale, Forms>>;

const escapeHtml = (s: string): string => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const fill = (template: string, vars: Record<string, string | number>): string => template.replace(/\{(\w+)\}/g, (_m, k: string) => String(vars[k] ?? ""));
const bold = (s: string | number): string => `<b>${escapeHtml(String(s))}</b>`;
const bullet = (label: string, value: string | number): string => `• ${escapeHtml(label)}: ${bold(value)}`;

/** «3,8» для ru/uz и «3.8» для en: без Intl, чтобы результат не зависел от ICU сервера. */
const decimal = (n: number, locale: Locale): string => (locale === "en" ? String(n) : String(n).replace(".", ","));
const conversion = (part: number, views: number): number => (views > 0 ? Math.round((part / views) * 1000) / 10 : 0);

/** Подставляет числа и слова в нужной форме в строку `insight.text` кабинета: «{views} {viewsW}» → «120 визитов». */
function fillInsight(text: string, counts: Record<string, number>, words: Words, locale: Locale, conv: number): string {
  let out = text;
  for (const [key, n] of Object.entries(counts)) {
    out = out.replace(`{${key}} {${key}W}`, `${n} ${plural(locale, n, words[key][locale])}`);
  }
  return out.replace("{conv}", decimal(conv, locale));
}

interface Body {
  name: string;
  period: L;
  bullets: string[];
  insight: string | null;
}

const title = (name: string, period: L, locale: Locale): string => `📊 ${bold(name)} · ${escapeHtml(pick(period, locale).toLowerCase())}`;

function restaurantBody(v: DigestValues<"restaurant">, locale: Locale): Body {
  const ui = restaurantUi;
  const days = maskToWeekdays(v.peak).map((d) => formatDate(`2024-01-0${1 + d}`, locale, { weekday: "long" }));
  const tip = days.length > 0 && days.length <= 3 ? pick(ui.insight.tip, locale).replace("{days}", days.join(", ")) : null;
  const sentence = fillInsight(pick(ui.insight.text, locale), { views: v.views, calls: v.calls, telegram: v.telegram, leads: v.leads }, restaurantWords, locale, conversion(v.leads, v.views));
  return {
    name: restaurantDemo.name,
    period: ui.period,
    bullets: [
      bullet(pick(ui.stats.leads, locale), v.leads),
      bullet(pick(ui.stats.calls, locale), v.calls),
      bullet(pick(ui.stats.telegram, locale), v.telegram),
      bullet(pick(ui.stats.views, locale), v.views),
    ],
    insight: tip ? `${sentence} ${tip}` : sentence,
  };
}

function clinicBody(v: DigestValues<"clinic">, locale: Locale): Body {
  const ui = clinicUi;
  const service = clinicDemo.services[v.svc - 1];
  const days = maskToWeekdays(v.peak);
  let tip: string | null = null;
  if (service) {
    const name = pick(service.name, locale);
    tip = days.length > 0 && days.length <= 3 ? fill(pick(ui.insight.tip, locale), { service: name, days: days.map((d) => ui.days[locale][d]).join(", ") }) : fill(pick(ui.insight.tipNoDays, locale), { service: name });
  }
  const sentence = fillInsight(pick(ui.insight.text, locale), { views: v.views, calcs: v.calcs, calls: v.calls, telegram: v.telegram, bookings: v.bookings }, clinicWords, locale, conversion(v.bookings, v.views));
  return {
    name: clinicDemo.name,
    period: ui.period,
    bullets: [
      bullet(pick(ui.stats.bookings, locale), v.bookings),
      bullet(pick(ui.stats.calls, locale), v.calls),
      bullet(pick(ui.stats.telegram, locale), v.telegram),
      bullet(pick(ui.stats.views, locale), v.views),
    ],
    insight: tip ? `${sentence} ${tip}` : sentence,
  };
}

function salonBody(v: DigestValues<"salon">, style: "a" | "b", locale: Locale): Body {
  const ui = salonUi;
  const data = salonBusinesses[style];
  const service = data.services[v.svc - 1];
  const master = data.masters[v.master - 1];
  let tip: string | null = null;
  if (service) {
    const svc = pick(service.name, locale);
    tip = master ? fill(pick(ui.insight.tip, locale), { service: svc, master: pick(master.name, locale), n: v.masterN }) : fill(pick(ui.insight.tipOnlyService, locale), { service: svc });
  }
  const sentence = fillInsight(pick(ui.insight.text, locale), { views: v.views, quizzes: v.quizzes, calls: v.calls, telegram: v.telegram, bookings: v.bookings }, salonWords, locale, conversion(v.bookings, v.views));
  return {
    name: data.name,
    period: ui.period,
    bullets: [
      bullet(pick(ui.stats.bookings, locale), v.bookings),
      bullet(pick(ui.stats.revenue, locale), formatSum(v.revenue, locale)),
      bullet(pick(ui.stats.telegram, locale), v.telegram),
      bullet(pick(ui.stats.views, locale), v.views),
    ],
    insight: tip ? `${sentence} ${tip}` : sentence,
  };
}

function cafeBody(v: DigestValues<"cafe">, locale: Locale): Body {
  const ui = cafeUi;
  const drink = cafeMenu[v.drink - 1];
  return {
    name: cafeDemo.name,
    period: ui.period,
    bullets: [
      bullet(pick(ui.stats.orders, locale), v.orders),
      bullet(pick(ui.stats.revenue, locale), formatSum(v.revenue, locale)),
      bullet(pick(ui.stats.avg, locale), formatSum(v.avg, locale)),
      bullet(pick(ui.stats.views, locale), v.views),
    ],
    insight: drink ? fill(pick(ui.digest.line3, locale), { drink: pick(drink.name, locale) }) : null,
  };
}

function bodyOf(p: DigestPayload): Body {
  switch (p.tpl) {
    case "restaurant":
      return restaurantBody(p.values, p.locale);
    case "clinic":
      return clinicBody(p.values, p.locale);
    case "salon":
      return salonBody(p.values, p.style, p.locale);
    case "cafe":
      return cafeBody(p.values, p.locale);
  }
}

const COPY = {
  demo: {
    ru: "Это демо: на настоящем сайте такая сводка приходит сама — каждый понедельник.",
    en: "This is a demo: on a real site a digest like this arrives on its own, every Monday.",
    uz: "Bu demo: haqiqiy saytda bunday xulosa har dushanba oʻzi keladi.",
  },
  cta: {
    ru: "Сайт для вашего бизнеса — Skyline Digital",
    en: "A website for your business — Skyline Digital",
    uz: "Biznesingiz uchun sayt — Skyline Digital",
  },
} satisfies Record<string, Record<Locale, string>>;

const footer = (locale: Locale): string => `${escapeHtml(COPY.demo[locale])}\n<a href="${STUDIO_SITES_URL}">${escapeHtml(COPY.cta[locale])}</a>`;

/** Сводка по нагрузке из deep-ссылки, на языке нагрузки. HTML parse mode. */
export function formatDigest(payload: DigestPayload): string {
  const body = bodyOf(payload);
  const lines = [title(body.name, body.period, payload.locale), "", ...body.bullets];
  if (body.insight) lines.push("", `💡 ${escapeHtml(body.insight)}`);
  lines.push("", footer(payload.locale));
  return lines.join("\n");
}

/** Ответ на «голый» /start и любой другой текст: коротко на трёх языках и ссылка на демо. */
export function formatHelp(): string {
  return [
    "Это демо-бот Skyline Digital: присылает пример недельной сводки для владельца сайта. Откройте кабинет демо и нажмите «Получить в Telegram».",
    "This is a Skyline Digital demo bot: it sends a sample weekly digest for a site owner. Open the demo dashboard and tap “Get it on Telegram”.",
    "Bu Skyline Digital demo-boti: sayt egasi uchun haftalik xulosa namunasini yuboradi. Demo kabinetni oching va «Telegramda olish» tugmasini bosing.",
    "",
    `<a href="${STUDIO_SITES_URL}">${STUDIO_SITES_URL}</a>`,
  ].join("\n");
}
