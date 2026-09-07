import type { SupabaseClient } from "@supabase/supabase-js";
import { postSpecSchema, type PostSpec } from "./types";
import { specHash } from "./build";
import { runGuard, guardBlocks } from "./guard";
import { tashkentDateTimeToUtc } from "./tz";

/**
 * Импорт месячного плана (ПРОМПТ-3 §1.3).
 *
 * Источник правды — docs/smm/content-plan-2026-09.json. Поля слайдов в плане
 * названы иначе, чем в postSpecSchema (t/d вместо title/text, l1..l3 вместо
 * line1..line3, rows вместо items, sub вместо subtitle) — здесь ремап по типам.
 * Валидирует zod: если тип слайда не проходит схему, импорт ЭТОГО поста падает
 * с внятной ошибкой (а не молча пропускает слайд).
 *
 * Идемпотентность: upsert по slug; посты в статусе approved/scheduled/published
 * не трогаем (аппрув ставит только человек — его нельзя затирать импортом).
 */

export interface PlanSlide {
  t: string;
  tone?: string;
  eyebrow?: string;
  swipe?: string;
  [k: string]: unknown;
}

export interface PlanPost {
  id: string;
  date: string;
  time_instagram?: string;
  rubric?: string;
  title: string;
  slides: PlanSlide[];
  caption_instagram?: string;
  caption_telegram?: string;
  platforms?: string[];
  hashtags?: string[];
  status?: string;
  notes?: string[];
  blocker?: string;
  contingency?: string;
}

export interface ContentPlan {
  posts: PlanPost[];
}

export interface ImportRow {
  slug: string;
  action: "created" | "updated" | "skipped" | "error";
  status?: string;
  error?: string;
}

export interface ImportReport {
  created: number;
  updated: number;
  skipped: number;
  errors: number;
  rows: ImportRow[];
}

/** Статус плана → статус в БД. Никогда не approved: аппрув ставит человек. */
export function mapPlanStatus(planStatus: string | undefined): string {
  switch (planStatus) {
    case "ready":
      return "review";
    case "blocked":
      return "blocked";
    case "draft":
    default:
      return "draft";
  }
}

function base(s: PlanSlide): Record<string, unknown> {
  const b: Record<string, unknown> = {};
  if (s.tone) b.tone = s.tone;
  if (s.eyebrow) b.eyebrow = s.eyebrow;
  if (s.swipe) b.swipe = s.swipe;
  return b;
}

/** Один слайд плана → слайд postSpecSchema (без валидации — её делает zod ниже). */
function mapSlide(s: PlanSlide, i: number): Record<string, unknown> {
  const g = <T,>(k: string): T => s[k] as T;
  switch (s.t) {
    case "cover":
      return { type: "cover", title: g("title"), subtitle: g("sub"), ...base(s) };
    case "stat":
      return {
        type: "stat",
        value: s.value != null ? String(s.value) : undefined,
        unit: g("unit"),
        title: g("title"),
        note: g("note"),
        ...base(s),
      };
    case "points":
      return {
        type: "points",
        title: g("title"),
        items: (g<Record<string, unknown>[]>("items") ?? []).map((it) => ({
          n: it.n as string | undefined,
          title: it.t as string,
          text: it.d as string | undefined,
        })),
        ...base(s),
      };
    case "prices":
      return {
        type: "prices",
        title: g("title"),
        note: g("note"),
        items: (g<[string, string][]>("rows") ?? []).map(([what, val]) => ({ what, val })),
        ...base(s),
      };
    case "compare":
      return {
        type: "compare",
        title: g("title"),
        note: g("note"),
        left: g("left"),
        right: g("right"),
        ...base(s),
      };
    case "case":
      return {
        type: "case",
        title: g("title"),
        image: g("image"),
        text: g("text"),
        tags: g("tags"),
        ...base(s),
      };
    case "cta":
      return { type: "cta", title: g("title"), text: g("text"), action: g("action"), ...base(s) };
    case "take":
      return { type: "take", text: g("text"), note: g("note"), ...base(s) };
    case "word":
      return {
        type: "word",
        line1: g("l1"),
        line2: g("l2"),
        line3: g("l3"),
        ...base(s),
      };
    case "ui":
      return { type: "ui", title: g("title"), glyph: g("glyph"), subtitle: g("sub"), ...base(s) };
    case "plate":
      return {
        type: "plate",
        hook: g("hook"),
        ask: g("ask"),
        note: g("note"),
        image: g("image"),
        ...base(s),
      };
    case "palette":
      return {
        type: "palette",
        title: g("title"),
        colors: g("colors"),
        text: g("text"),
        tags: g("tags"),
        ...base(s),
      };
    default:
      throw new Error(`неизвестный тип слайда «${s.t}» в слайде #${i + 1}`);
  }
}

/** План-пост → валидированный PostSpec. Бросает с внятной ошибкой при браке. */
export function planToSpec(p: PlanPost): PostSpec {
  const ci = p.caption_instagram ?? "";
  const caption: Record<string, string> = { instagram: ci, default: ci };
  if (p.caption_telegram) caption.telegram = p.caption_telegram;

  const raw = {
    slug: p.id,
    title: p.title,
    style: "studio",
    format: "post",
    platforms: p.platforms ?? [],
    slides: p.slides.map((s, i) => mapSlide(s, i)),
    caption,
    hashtags: p.hashtags ?? [],
  };
  try {
    return postSpecSchema.parse(raw);
  } catch (e) {
    // Разворачиваем zod-ошибку в человеко-читаемую строку.
    const msg = e instanceof Error ? e.message : String(e);
    throw new Error(`spec «${p.id}» не проходит схему: ${msg}`);
  }
}

const KEEP_STATUSES = new Set(["approved", "scheduled", "published"]);

function notesOf(p: PlanPost): string | null {
  const parts = [
    ...(p.notes ?? []),
    p.blocker ? `БЛОКЕР: ${p.blocker}` : "",
    p.contingency ? `РЕЗЕРВ: ${p.contingency}` : "",
  ].filter(Boolean);
  return parts.length ? parts.join("\n") : null;
}

/** Импорт всего плана. Идемпотентно, с отчётом. */
export async function importPlan(db: SupabaseClient, plan: ContentPlan): Promise<ImportReport> {
  const report: ImportReport = { created: 0, updated: 0, skipped: 0, errors: 0, rows: [] };

  for (const p of plan.posts) {
    let spec: PostSpec;
    try {
      spec = planToSpec(p);
    } catch (e) {
      report.errors++;
      report.rows.push({ slug: p.id, action: "error", error: String(e) });
      continue;
    }

    const { data: existing } = await db
      .from("content_posts")
      .select("id,status")
      .eq("slug", spec.slug)
      .maybeSingle();
    const existingRow = existing as { id: string; status: string } | null;

    if (existingRow && KEEP_STATUSES.has(existingRow.status)) {
      report.skipped++;
      report.rows.push({ slug: spec.slug, action: "skipped", status: existingRow.status });
      continue;
    }

    const issues = runGuard(spec);
    const status = guardBlocks(issues) ? "blocked" : mapPlanStatus(p.status);
    const scheduled_at = p.time_instagram
      ? tashkentDateTimeToUtc(p.date, p.time_instagram)
      : null;

    const row = {
      slug: spec.slug,
      title: spec.title,
      style: spec.style,
      format: spec.format,
      rubric: p.rubric ?? null,
      platforms: spec.platforms,
      spec,
      caption: spec.caption,
      hashtags: spec.hashtags,
      spec_hash: specHash(spec),
      guard: issues,
      notes: notesOf(p),
      status,
      scheduled_at,
    };

    if (existingRow) {
      const { error } = await db.from("content_posts").update(row).eq("id", existingRow.id);
      if (error) {
        report.errors++;
        report.rows.push({ slug: spec.slug, action: "error", error: error.message });
      } else {
        report.updated++;
        report.rows.push({ slug: spec.slug, action: "updated", status });
      }
    } else {
      const { error } = await db.from("content_posts").insert(row);
      if (error) {
        report.errors++;
        report.rows.push({ slug: spec.slug, action: "error", error: error.message });
      } else {
        report.created++;
        report.rows.push({ slug: spec.slug, action: "created", status });
      }
    }
  }

  return report;
}
