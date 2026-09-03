"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const now = () => new Date().toISOString();

function revalidateAll() {
  revalidatePath("/admin/projects");
  // Public pages are ISR — refresh them so edits show quickly.
  for (const l of ["ru", "en", "uz"]) {
    revalidatePath(`/${l}/projects`);
    revalidatePath(`/${l}`);
  }
}

export interface ProjectInput {
  slug: string;
  title: string;
  category: string;
  description: string;
  image: string;
  technologies: string[]; // parsed from comma list in UI
  year: number | null;
  url: string | null;
  published: boolean;
  sort: number;
}

export async function saveProject(id: string | null, p: ProjectInput): Promise<{ ok: boolean; error?: string }> {
  const db = getSupabaseAdmin();
  const row = { ...p, updated_at: now() };
  const { error } = id
    ? await db.from("projects").update(row).eq("id", id)
    : await db.from("projects").insert(row);
  revalidateAll();
  return { ok: !error, error: error?.message };
}

export async function deleteProject(id: string): Promise<{ ok: boolean }> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("projects").delete().eq("id", id);
  revalidateAll();
  return { ok: !error };
}

export async function setFxRate(rate: number): Promise<{ ok: boolean }> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("settings")
    .upsert({ key: "fx_rate", value: rate, updated_at: now() }, { onConflict: "key" });
  revalidatePath("/admin/pricing");
  return { ok: !error };
}

export async function saveSetting(key: string, rawValue: string): Promise<{ ok: boolean; error?: string }> {
  const db = getSupabaseAdmin();
  let value: unknown;
  try {
    value = JSON.parse(rawValue);
  } catch {
    value = rawValue; // plain string
  }
  const { error } = await db
    .from("settings")
    .upsert({ key, value, updated_at: now() }, { onConflict: "key" });
  revalidatePath("/admin/settings");
  return { ok: !error, error: error?.message };
}

export async function deleteSetting(key: string): Promise<{ ok: boolean }> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("settings").delete().eq("key", key);
  revalidatePath("/admin/settings");
  return { ok: !error };
}
