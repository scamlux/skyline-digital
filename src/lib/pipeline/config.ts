import { OPPORTUNITY_SOURCES, type OpportunitySource } from "./types";

/**
 * Настройки конвейера — только из env, без секретов в коде. Всё, что не
 * задано, имеет безопасный дефолт: источники без ключей просто пропускаются.
 */
export interface PipelineConfig {
  sources: OpportunitySource[];
  /** Публичные Telegram-каналы (username без @) — читаются через t.me/s/. */
  telegramChannels: string[];
  /** RSS/Atom-ленты (FL.ru, Weblancer, UNDP, AIIB и любые другие). */
  rssFeeds: string[];
  /** Сабреддиты для [Hiring]-постов. */
  subreddits: string[];
  /** Страны для World Bank API. */
  worldbankCountries: string[];
  freelancehuntToken: string | null;
  /** Порог ИИ-оценки, с которого возможность идёт владельцу (0–100). */
  minScore: number;
  /** Лимит ИИ-оценок за прогон — контроль затрат. */
  maxAiPerRun: number;
  /** Лимит карточек в Telegram за прогон — защита от спама. */
  maxNotifyPerRun: number;
  /** Не чаще, чем раз в N минут (крон контента тикает каждые 15 мин). */
  intervalMinutes: number;
  /** Напоминания о профилях и недельная сводка (PIPELINE_ROUTINES=off — выключить). */
  routines: boolean;
}

const list = (v: string | undefined): string[] =>
  (v ?? "")
    .split(/[,\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

const num = (v: string | undefined, d: number): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : d;
};

export function readPipelineConfig(env: Record<string, string | undefined> = process.env): PipelineConfig {
  const requested = list(env.PIPELINE_SOURCES);
  const sources = (requested.length ? requested : ["worldbank", "reddit", "telegram", "rss", "freelancehunt"])
    .filter((s): s is OpportunitySource => (OPPORTUNITY_SOURCES as readonly string[]).includes(s));
  return {
    sources,
    telegramChannels: list(env.PIPELINE_TG_CHANNELS).map((c) => c.replace(/^@/, "")),
    rssFeeds: list(env.PIPELINE_RSS_FEEDS),
    subreddits: list(env.PIPELINE_SUBREDDITS).length
      ? list(env.PIPELINE_SUBREDDITS)
      : ["forhire", "freelance_forhire"],
    worldbankCountries: list(env.PIPELINE_WB_COUNTRIES).length
      ? list(env.PIPELINE_WB_COUNTRIES)
      : ["Uzbekistan"],
    freelancehuntToken: env.FREELANCEHUNT_TOKEN?.trim() || null,
    minScore: Math.min(100, num(env.PIPELINE_MIN_SCORE, 60)),
    maxAiPerRun: num(env.PIPELINE_MAX_AI_PER_RUN, 10),
    maxNotifyPerRun: num(env.PIPELINE_MAX_NOTIFY_PER_RUN, 5),
    intervalMinutes: num(env.PIPELINE_INTERVAL_MIN, 60),
    routines: !/^(off|0|false|no)$/i.test(env.PIPELINE_ROUTINES ?? ""),
  };
}
