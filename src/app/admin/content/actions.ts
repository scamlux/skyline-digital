"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { savePost, renderPost, type ContentPostRow } from "@/lib/content/store";
import { runGuard, guardBlocks } from "@/lib/content/guard";
import { publishToTelegram } from "@/lib/content/publish-telegram";
import { buildPost } from "@/lib/content/build";
import { importPlan, type ContentPlan, type ImportReport } from "@/lib/content/import-plan";
import type { GuardIssue } from "@/lib/content/types";
import planData from "../../../../docs/smm/content-plan-2026-09.json";

const reval = () => {
  revalidatePath("/admin/content");
  revalidatePath("/admin/content/calendar");
};

export async function saveSpecAction(
  id: string | null,
  rawJson: string,
  patch: { status?: string; scheduled_at?: string | null; notes?: string | null },
): Promise<{ ok: boolean; id?: string; issues: GuardIssue[]; error?: string }> {
  let raw: unknown;
  try {
    raw = JSON.parse(rawJson);
  } catch (e) {
    return { ok: false, issues: [], error: `JSON: ${String(e)}` };
  }
  const res = await savePost(getSupabaseAdmin(), id, raw, patch);
  reval();
  return res;
}

export async function renderAction(id: string): Promise<{ ok: boolean; slides?: number; error?: string }> {
  const res = await renderPost(getSupabaseAdmin(), id);
  reval();
  return res;
}

/**
 * review → approved: только человек, только этой кнопкой (ТЗ §4.2).
 * Серверная перепроверка QA-гейта (§1.6): аппрув невозможен, пока есть ошибки —
 * даже если клиент их обошёл. Кнопка в UI дизейблится, это вторая линия обороны.
 */
export async function approveAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const db = getSupabaseAdmin();
  const { data } = await db.from("content_posts").select("*").eq("id", id).single();
  if (!data) return { ok: false, error: "пост не найден" };
  const post = data as ContentPostRow;
  if (post.status !== "review") {
    return { ok: false, error: `аппрув только из review (сейчас «${post.status}»)` };
  }
  const issues = runGuard(post.spec);
  if (guardBlocks(issues)) {
    const codes = issues.filter((i) => i.level === "error").map((i) => i.code).join(", ");
    return { ok: false, error: `гейт не пройден: ${codes}` };
  }
  const { error } = await db
    .from("content_posts")
    .update({ status: "approved", guard: issues })
    .eq("id", id)
    .eq("status", "review");
  reval();
  return { ok: !error, error: error?.message };
}

export async function scheduleAction(id: string, when: string | null): Promise<{ ok: boolean }> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("content_posts")
    .update(when ? { status: "scheduled", scheduled_at: when } : { scheduled_at: null })
    .eq("id", id)
    .in("status", ["approved", "scheduled"]);
  reval();
  return { ok: !error };
}

export async function publishTelegramAction(
  id: string,
): Promise<{ ok: boolean; permalink?: string; error?: string }> {
  const db = getSupabaseAdmin();
  const { data } = await db.from("content_posts").select("*").eq("id", id).single();
  if (!data) return { ok: false, error: "not found" };
  const post = data as ContentPostRow;
  if (!["approved", "scheduled"].includes(post.status)) {
    return { ok: false, error: `нельзя публиковать из статуса «${post.status}» — нужен approve` };
  }
  const res = await publishToTelegram(db, post);
  reval();
  return res;
}

export async function deletePostAction(id: string): Promise<{ ok: boolean }> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("content_posts").delete().eq("id", id);
  reval();
  return { ok: !error };
}

/** Импорт месячного плана из docs/smm (ПРОМПТ-3 §1.3). Идемпотентно. */
export async function importPlanAction(): Promise<ImportReport> {
  const res = await importPlan(getSupabaseAdmin(), planData as unknown as ContentPlan);
  reval();
  return res;
}

/** HTML-превью слайдов для редактора (без браузера — iframe srcdoc). */
export async function previewAction(
  rawJson: string,
): Promise<{ ok: boolean; slides?: string[]; error?: string }> {
  try {
    const built = buildPost(JSON.parse(rawJson));
    return { ok: true, slides: built.slides };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
