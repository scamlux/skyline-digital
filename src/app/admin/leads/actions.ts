"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";

const now = () => new Date().toISOString();

export async function updateLeadStatus(id: string, status: string): Promise<{ ok: boolean }> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("leads")
    .update({ status, updated_at: now() })
    .eq("id", id);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: !error };
}

export async function updateLeadFields(
  id: string,
  fields: { client_name?: string; company?: string; description?: string },
): Promise<{ ok: boolean }> {
  const db = getSupabaseAdmin();
  const { error } = await db
    .from("leads")
    .update({ ...fields, updated_at: now() })
    .eq("id", id);
  revalidatePath("/admin/leads");
  return { ok: !error };
}

/** Hard delete — admin-only, guarded by a confirm() in the UI. */
export async function deleteLead(id: string): Promise<{ ok: boolean }> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("leads").delete().eq("id", id);
  revalidatePath("/admin/leads");
  revalidatePath("/admin");
  return { ok: !error };
}
