"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { applyAction } from "@/lib/pipeline/actions";
import { ACTIONS, type CardAction } from "@/lib/pipeline/card";
import { runPipeline, type RunStats } from "@/lib/pipeline/run";
import type { Draft } from "@/lib/pipeline/draft";

/** Решение владельца из админки — тот же путь, что кнопки в Telegram. */
export async function decide(id: string, action: string): Promise<{ ok: boolean; message: string }> {
  if (!(ACTIONS as readonly string[]).includes(action)) return { ok: false, message: "Неизвестное действие" };
  const res = await applyAction(getSupabaseAdmin(), id, action as CardAction);
  revalidatePath("/admin/pipeline");
  return { ok: res.ok, message: res.message };
}

/** Правка текста отклика вручную. */
export async function saveDraftText(id: string, text: string): Promise<{ ok: boolean }> {
  const db = getSupabaseAdmin();
  const { data } = await db.from("opportunities").select("draft").eq("id", id).maybeSingle();
  const draft = (data?.draft as Draft | null) ?? null;
  if (!draft) return { ok: false };
  const { error } = await db
    .from("opportunities")
    .update({ draft: { ...draft, text: text.slice(0, 8000) } })
    .eq("id", id);
  revalidatePath("/admin/pipeline");
  return { ok: !error };
}

/** Внеочередной прогон без троттлинга. */
export async function runNow(): Promise<RunStats> {
  const stats = await runPipeline(getSupabaseAdmin(), { trigger: "manual", force: true });
  revalidatePath("/admin/pipeline");
  return stats;
}
