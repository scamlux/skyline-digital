import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Supabase service-role client for the radar CLI (plain Node, outside Next).
 * Reuses the same env vars as the app's server client but carries no
 * `server-only` import so it runs under `node scripts/radar/cli.ts`.
 */
export function getRadarDb(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "Supabase not configured (NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)",
    );
  }
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function isRadarDbConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
}
