"use server";

import { revalidatePath } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabase/server";

export async function deleteEstimate(id: string): Promise<{ ok: boolean }> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("estimates").delete().eq("id", id);
  revalidatePath("/admin/estimates");
  revalidatePath("/admin");
  return { ok: !error };
}

export async function deleteAudit(id: string): Promise<{ ok: boolean }> {
  const db = getSupabaseAdmin();
  const { error } = await db.from("audits").delete().eq("id", id);
  revalidatePath("/admin/audits");
  revalidatePath("/admin");
  return { ok: !error };
}
