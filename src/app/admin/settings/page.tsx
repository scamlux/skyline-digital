import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { SettingsAdmin, type SettingRow } from "./SettingsAdmin";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  if (!isSupabaseConfigured()) return <div className="p-8 text-gray-500">Supabase не настроен.</div>;
  const db = getSupabaseAdmin();
  const { data } = await db.from("settings").select("key,value,updated_at").order("key");
  return (
    <div className="p-8">
      <h1 className="mb-1 text-2xl font-bold text-gray-900">Настройки</h1>
      <p className="mb-6 text-sm text-gray-500">
        Key-value хранилище (jsonb). Используется движками: <code className="rounded bg-gray-100 px-1">fx_rate</code> — курс UZS в КП.
      </p>
      <SettingsAdmin rows={(data ?? []) as SettingRow[]} />
    </div>
  );
}
