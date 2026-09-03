"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { enrichCompany } from "@/lib/radar/signals";
import { contactInfo, scoreCompany } from "@/lib/radar/score";
import type { Company } from "@/lib/radar/types";

/** Edit basic company fields from the drawer. */
export async function updateCompany(
  id: string,
  fields: { name?: string; phone?: string | null; city?: string | null; industry?: string; website?: string | null },
): Promise<{ success: boolean }> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("radar_companies")
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/radar");
  return { success: !error };
}

/** Soft-delete a company from the radar (never hard-deletes). */
export async function markDiscarded(
  id: string,
  reason: string,
): Promise<{ success: boolean }> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("radar_companies")
    .update({ discarded: true, discard_reason: reason || null, updated_at: new Date().toISOString() })
    .eq("id", id);
  revalidatePath("/admin/radar");
  return { success: !error };
}

/** Re-fetch the company's site and recompute its signals + grade. */
export async function recheckWebsite(
  id: string,
): Promise<{ success: boolean; grade?: string }> {
  const db = getSupabaseAdmin();
  const { data } = await db.from("radar_companies").select("*").eq("id", id).single();
  if (!data) return { success: false };
  const row = data as Record<string, unknown>;
  const company: Company = {
    name: String(row.name ?? ""),
    phone: (row.phone as string) ?? null,
    industry: (row.industry as Company["industry"]) ?? "dentistry",
    city: (row.city as string) ?? null,
    website: (row.website as string) ?? null,
    email: (row.email as string) ?? null,
    socialLinks: (row.social_links as string[]) ?? [],
    source: (row.source as Company["source"]) ?? "google",
    sourceUrl: null,
    geo: null,
  };
  const { signals, webStatus } = await enrichCompany(company);
  const grade = scoreCompany(signals, contactInfo(company));
  await db
    .from("radar_companies")
    .update({
      signals,
      web_status: webStatus,
      grade,
      class: grade,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);
  revalidatePath("/admin/radar");
  return { success: true, grade };
}
