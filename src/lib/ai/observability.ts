import "server-only";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";

/**
 * Наблюдаемость AI-слоя (§8): каждый вызов — строка в ai_calls (модель,
 * токены, латентность, стоимость). Логирование best-effort и никогда не
 * ломает основной поток. Плюс общий враппер: 30с таймаут + один ретрай
 * с бэкоффом.
 */

/** Цена за 1M токенов (вход/выход), USD — для оценки стоимости в логе. */
const PRICES: Record<string, { in: number; out: number }> = {
  "gpt-4o-mini": { in: 0.15, out: 0.6 },
  "gpt-4o": { in: 2.5, out: 10 },
};

export interface AiUsage {
  prompt_tokens?: number;
  completion_tokens?: number;
  total_tokens?: number;
}

export async function logAiCall(entry: {
  touchpoint: string;
  model?: string;
  usage?: AiUsage | null;
  latencyMs: number;
  ok: boolean;
  error?: string;
}): Promise<void> {
  if (!isSupabaseConfigured()) return;
  try {
    const p = PRICES[entry.model ?? ""] ?? null;
    const cost =
      p && entry.usage
        ? ((entry.usage.prompt_tokens ?? 0) * p.in + (entry.usage.completion_tokens ?? 0) * p.out) /
          1_000_000
        : null;
    await getSupabaseAdmin()
      .from("ai_calls")
      .insert({
        touchpoint: entry.touchpoint,
        model: entry.model ?? null,
        prompt_tokens: entry.usage?.prompt_tokens ?? null,
        completion_tokens: entry.usage?.completion_tokens ?? null,
        total_tokens: entry.usage?.total_tokens ?? null,
        cost_usd: cost,
        latency_ms: Math.round(entry.latencyMs),
        ok: entry.ok,
        error: entry.error ?? null,
      });
  } catch {
    /* лог не должен ломать поток */
  }
}

/** 30с таймаут + один ретрай с бэкоффом 2с (§8). */
export async function withAiGuards<T>(fn: () => Promise<T>, timeoutMs = 30_000): Promise<T> {
  const attempt = () =>
    Promise.race<T>([
      fn(),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error("ai timeout 30s")), timeoutMs)),
    ]);
  try {
    return await attempt();
  } catch {
    await new Promise((r) => setTimeout(r, 2000));
    return attempt();
  }
}

/**
 * Валидатор чисел (§8): модель не решает деньги. Любая $-сумма в прозе,
 * не совпадающая с числами движка, заменяется на официальную вилку.
 */
export function enforceEngineNumbers<T>(obj: T, allowed: number[], range: string): T {
  const ok = new Set(allowed.map((n) => Math.round(n)));
  const fix = (s: string): string =>
    s.replace(/\$\s?([\d][\d\s,.]*)/g, (m, num: string) => {
      const n = Math.round(Number(String(num).replace(/[\s,]/g, "")));
      return ok.has(n) ? m : range;
    });
  const walk = (v: unknown): unknown => {
    if (typeof v === "string") return fix(v);
    if (Array.isArray(v)) return v.map(walk);
    if (v && typeof v === "object")
      return Object.fromEntries(Object.entries(v).map(([k, val]) => [k, walk(val)]));
    return v;
  };
  return walk(obj) as T;
}
