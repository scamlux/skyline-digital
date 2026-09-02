"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const slugify = (s: string): string =>
  s
    .toLowerCase()
    .trim()
    .replace(/[^a-zа-яё0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);

/** Create a new industry definition from the admin form. */
export async function addQuery(formData: FormData): Promise<void> {
  const label = String(formData.get("label") ?? "").trim();
  const keyRaw = String(formData.get("key") ?? "").trim();
  const keywords = String(formData.get("keywords") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const citiesRaw = String(formData.get("cities") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!label || keywords.length === 0) return;
  const key = slugify(keyRaw || label);
  if (!key) return;
  const db = getSupabaseAdmin();
  await db.from("radar_queries").upsert(
    {
      key,
      label,
      keywords,
      cities: citiesRaw.length ? citiesRaw : null,
      active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "key" },
  );
  revalidatePath("/admin/radar/queries");
}

export async function toggleQuery(id: string, active: boolean): Promise<void> {
  const db = getSupabaseAdmin();
  await db
    .from("radar_queries")
    .update({ active, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/radar/queries");
}

export async function deleteQuery(id: string): Promise<void> {
  const db = getSupabaseAdmin();
  await db.from("radar_queries").delete().eq("id", id);
  revalidatePath("/admin/radar/queries");
}
