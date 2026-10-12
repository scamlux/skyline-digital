import type { PrefilterResult, RawOpportunity } from "./types";

/**
 * Префильтр — бесплатный детерминированный отсев до ИИ. Задача — не тратить
 * ИИ-вызовы на поставки мебели, стройку, вакансии в штат и просроченные лоты.
 * Сомнительное пропускаем дальше: ошибку «лишняя оценка» дешевле исправить,
 * чем «потерянный заказ».
 */

/** Наш профиль: ru / uz / en. Короткие слова матчим по границам слова. */
const POSITIVE = [
  // en
  "website", "web site", "web app", "web application", "web portal", "web platform", "landing page",
  "e-commerce", "ecommerce", "online store", "online shop", "mobile app", "mobile application",
  "chatbot", "chat bot", "telegram bot", "ai", "llm", "gpt", "openai", "rag", "automation",
  "crm", "dashboard", "mvp", "saas", "next.js", "nextjs", "react", "supabase", "frontend",
  "front-end", "full-stack", "fullstack", "ui/ux", "ux/ui", "web design", "lms", "e-learning",
  "information system", "cms", "portal", "platform", "app development", "software development",
  "developer", "webflow", "wordpress", "shopify", "api integration",
  // ru
  "сайт", "лендинг", "интернет-магазин", "интернет магазин", "веб-приложение", "веб приложение",
  "портал", "платформ", "мобильное приложение", "приложение", "чат-бот", "чатбот", "телеграм-бот",
  "telegram-бот", "бот", "автоматизац", "интеграц", "crm", "вёрстк", "верстк", "фронтенд",
  "разработк", "нейросет", "ии", "дизайн сайта", "ui/ux", "информационная система",
  "информационной системы", "онлайн-курс", "личный кабинет", "админк", "парсер",
  // uz
  "sayt", "veb-sayt", "veb sayt", "internet do'kon", "internet-do'kon", "ilova", "mobil ilova",
  "dasturchi", "dastur", "platforma", "axborot tizimi", "telegram bot", "bot kerak", "sayt kerak",
];

/** Не наш профиль — сильные сигналы. Совпадение без позитивных хитов → отсев. */
const NEGATIVE = [
  "supply of", "delivery of goods", "construction", "rehabilitation of", "vehicles", "furniture",
  "catering", "printing of", "fuel", "medical equipment", "laboratory equipment",
  "поставка", "строительств", "ремонт здания", "мебел", "автомобил", "продукты питания",
  "yetkazib berish", "qurilish",
];

/** Наём в штат и самопиар исполнителей — не проекты. */
const NOT_A_PROJECT = [
  "[for hire]", "for hire", "looking for work", "ищу работу", "резюме", "в штат", "full-time",
  "full time position", "salary", "зарплата", "оклад", "ish qidiryapman", "vakansiya", "вакансия",
];

/** Грубые курсы к USD — только для порога бюджета, не для цен в КП. */
const TO_USD: Record<string, number> = {
  USD: 1, EUR: 1.08, GBP: 1.27, RUB: 0.011, UZS: 1 / 12_000, UAH: 0.024, KZT: 0.002,
};

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

function matcher(word: string): RegExp {
  // Слова до 3 букв (ai, ии, crm, bot, cms) — строго по границам, иначе «ai» в «mail».
  const w = escapeRe(word.toLowerCase());
  return word.length <= 3
    ? new RegExp(`(?<![\\p{L}\\d])${w}(?![\\p{L}\\d])`, "u")
    : new RegExp(w, "u");
}

const POSITIVE_RE = POSITIVE.map((w) => [w, matcher(w)] as const);
const NEGATIVE_RE = NEGATIVE.map((w) => [w, matcher(w)] as const);
const NOT_PROJECT_RE = NOT_A_PROJECT.map((w) => [w, matcher(w)] as const);

export interface PrefilterOptions {
  now?: Date;
  /** Нижняя граница бюджета в USD (если бюджет известен). */
  minBudgetUsd?: number;
  /** Дедлайн ближе, чем N часов, — не успеем подготовить отклик. */
  minHoursLeft?: number;
  /** Старше N дней — заказ уже разобрали. Не применяется к тендерам с живым дедлайном. */
  maxAgeDays?: number;
}

export function prefilter(o: RawOpportunity, opts: PrefilterOptions = {}): PrefilterResult {
  const now = opts.now ?? new Date();
  const minBudgetUsd = opts.minBudgetUsd ?? 200;
  const minHoursLeft = opts.minHoursLeft ?? 48;
  const maxAgeDays = opts.maxAgeDays ?? 21;

  // Апострофы узбекской латиницы (o‘, g‘, ’) приводим к одному виду.
  const text = `${o.title}\n${o.description}`.toLowerCase().replace(/[‘’`ʻʼ]/g, "'");
  const hits = POSITIVE_RE.filter(([, re]) => re.test(text)).map(([w]) => w);
  const reasons: string[] = [];

  const titleLower = o.title.toLowerCase();
  const notProject = NOT_PROJECT_RE.filter(([, re]) => re.test(titleLower)).map(([w]) => w);
  if (notProject.length) reasons.push(`не проект: ${notProject[0]}`);

  if (hits.length === 0) {
    const neg = NEGATIVE_RE.filter(([, re]) => re.test(text)).map(([w]) => w);
    reasons.push(neg.length ? `не наш профиль: ${neg[0]}` : "нет ключевых слов профиля");
  }

  if (o.deadline) {
    const hoursLeft = (new Date(o.deadline).getTime() - now.getTime()) / 3_600_000;
    if (hoursLeft < minHoursLeft) {
      reasons.push(hoursLeft < 0 ? "дедлайн прошёл" : `до дедлайна ${Math.max(0, Math.round(hoursLeft))} ч`);
    }
  } else if (o.publishedAt) {
    const ageDays = (now.getTime() - new Date(o.publishedAt).getTime()) / 86_400_000;
    if (ageDays > maxAgeDays) reasons.push(`опубликовано ${Math.round(ageDays)} дн. назад`);
  }

  if (o.budgetMax != null && o.currency) {
    const rate = TO_USD[o.currency.toUpperCase()];
    if (rate && o.budgetMax * rate < minBudgetUsd) {
      reasons.push(`бюджет ниже $${minBudgetUsd}`);
    }
  }

  return { pass: reasons.length === 0, hits, reasons };
}
