import type { SupabaseClient } from "@supabase/supabase-js";
import type { QueryDef } from "./types";

/**
 * Dynamic industry definitions. Source of truth is the radar_queries table
 * (editable in /admin/radar/queries); DEFAULT_QUERIES is the offline fallback
 * so the CLI still works without a DB (dry-run).
 */
export const DEFAULT_QUERIES: QueryDef[] = [
  { key: "dentistry", label: "Стоматология", keywords: ["dental clinic", "dentist", "стоматология"], cities: null, active: true },
  { key: "auto", label: "Автосервис", keywords: ["auto service", "car repair", "автосервис"], cities: null, active: true },
  { key: "beauty", label: "Салоны красоты", keywords: ["beauty salon", "hair salon", "салон красоты"], cities: null, active: true },
];

interface QueryRow {
  key: string;
  label: string;
  keywords: unknown;
  cities: unknown;
  active: boolean;
}

function toDef(r: QueryRow): QueryDef {
  return {
    key: r.key,
    label: r.label,
    keywords: Array.isArray(r.keywords) ? (r.keywords as string[]) : [],
    cities: Array.isArray(r.cities) ? (r.cities as string[]) : null,
    active: r.active,
  };
}

/** Load industry defs from DB; fall back to defaults when absent/unreachable. */
export async function loadQueries(db: SupabaseClient | null): Promise<QueryDef[]> {
  if (!db) return DEFAULT_QUERIES;
  try {
    const { data, error } = await db
      .from("radar_queries")
      .select("key,label,keywords,cities,active")
      .order("created_at", { ascending: true });
    if (error || !data || data.length === 0) return DEFAULT_QUERIES;
    return (data as QueryRow[]).map(toDef);
  } catch {
    return DEFAULT_QUERIES;
  }
}
