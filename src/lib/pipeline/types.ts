/**
 * Конвейер заказов (docs/adr/0004-opportunity-pipeline.md).
 *
 * Opportunity — любая внешняя возможность получить проект: тендер, пост
 * «[Hiring]», заказ из Telegram-канала, письмо-оповещение площадки. Сборщики
 * приводят всё к RawOpportunity, дальше единый путь: префильтр → ИИ-оценка →
 * расчёт цены движком → черновик отклика → карточка владельцу в Telegram.
 */

export const OPPORTUNITY_SOURCES = [
  "worldbank",
  "reddit",
  "telegram",
  "rss",
  "freelancehunt",
  "ingest",
] as const;
export type OpportunitySource = (typeof OPPORTUNITY_SOURCES)[number];

/**
 * Жизненный цикл. Автоматически система двигает только new → filtered |
 * rejected | review. Всё после review — решение владельца (кнопки в Telegram
 * или админке): система ничего не подаёт сама.
 */
export const OPPORTUNITY_STATUSES = [
  "new", // собрано, ещё не оценено
  "filtered", // отсеяно префильтром (не наш профиль / дедлайн / регион)
  "rejected", // ИИ-оценка ниже порога
  "review", // готова карточка: оценка, цена, черновик — ждёт владельца
  "applying", // владелец сказал «подаюсь»
  "submitted", // отклик/заявка отправлены
  "won",
  "lost",
  "dismissed", // владелец сказал «мимо»
  "expired",
] as const;
export type OpportunityStatus = (typeof OPPORTUNITY_STATUSES)[number];

/** Нормализованный результат любого сборщика. Все поля, кроме ключа, — best-effort. */
export interface RawOpportunity {
  source: OpportunitySource;
  /** Стабильный id в источнике — ключ дедупликации вместе с source. */
  externalId: string;
  url: string | null;
  title: string;
  description: string;
  buyer?: string | null;
  country?: string | null;
  budgetMin?: number | null;
  budgetMax?: number | null;
  currency?: string | null;
  /** ISO. */
  deadline?: string | null;
  /** ISO. */
  publishedAt?: string | null;
  tags?: string[];
  raw?: unknown;
}

export interface PrefilterResult {
  pass: boolean;
  /** Совпавшие «наши» ключевые слова. */
  hits: string[];
  /** Почему отсеяно (пусто при pass). */
  reasons: string[];
}

export interface Quote {
  totalMin: number;
  totalMax: number;
  weeks: number;
  projectType: string;
  features: string[];
}

export interface OpportunityRow {
  id: string;
  source: OpportunitySource;
  external_id: string;
  url: string | null;
  title: string;
  description: string;
  buyer: string | null;
  country: string | null;
  budget_min: number | null;
  budget_max: number | null;
  currency: string | null;
  deadline: string | null;
  published_at: string | null;
  tags: string[] | null;
  fingerprint: string;
  status: OpportunityStatus;
  score: number | null;
  prefilter: PrefilterResult | null;
  qualification: import("./qualify").Qualification | null;
  quote: Quote | null;
  draft: import("./draft").Draft | null;
  tg_message_id: number | null;
  notified_at: string | null;
  decided_at: string | null;
  lead_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}
