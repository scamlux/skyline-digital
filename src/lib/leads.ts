import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeadRow } from "@/lib/supabase/types";
import {
  formatLeadMessage,
  sendTelegramMessage,
  type LeadForTelegram,
} from "@/lib/telegram";

/** Human-readable labels for project-type / service keys (RU). */
export const TYPE_LABELS: Record<string, string> = {
  website: "Сайт",
  webApp: "Веб-приложение",
  mobileApp: "Мобильное приложение",
  ai: "AI-решение",
  automation: "Автоматизация",
  uiux: "UI/UX-дизайн",
  other: "Другое",
};

export function typeLabel(key?: string | null): string | null {
  if (!key) return null;
  return TYPE_LABELS[key] ?? key;
}

/** Fields accepted when creating a lead (superset of both forms). */
export interface NewLead {
  client_name?: string;
  company?: string;
  phone?: string;
  email: string;
  telegram?: string;
  project_type?: string;
  service?: string;
  description?: string;
  budget?: string;
  deadline?: string;
  source?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  landing_page?: string;
  referrer?: string;
  ai_summary?: string;
  calculated_price?: number;
  currency?: string;
}

const clean = (v?: string) => (v && v.trim() ? v.trim() : null);

/**
 * Insert a lead (status NEW; lead_number assigned by DB trigger) and return the
 * saved row. This is the durable step — it must succeed before any Telegram
 * work is attempted.
 */
export async function createLead(
  supabase: SupabaseClient,
  input: NewLead,
): Promise<LeadRow> {
  const { data, error } = await supabase
    .from("leads")
    .insert({
      client_name: clean(input.client_name),
      // keep legacy `name` in sync for older reads
      name: clean(input.client_name),
      company: clean(input.company),
      phone: clean(input.phone),
      email: input.email.trim(),
      telegram: clean(input.telegram),
      project_type: clean(input.project_type),
      service: clean(input.service),
      description: clean(input.description),
      budget: clean(input.budget),
      deadline: clean(input.deadline),
      status: "NEW",
      source: clean(input.source),
      utm_source: clean(input.utm_source),
      utm_medium: clean(input.utm_medium),
      utm_campaign: clean(input.utm_campaign),
      utm_content: clean(input.utm_content),
      landing_page: clean(input.landing_page),
      referrer: clean(input.referrer),
      ai_summary: clean(input.ai_summary),
      calculated_price: input.calculated_price ?? null,
      currency: clean(input.currency),
    })
    .select("*")
    .single();
  if (error) throw error;
  console.info("[lead] created", data.lead_number);
  return data as LeadRow;
}

/**
 * Send the "NEW LEAD" Telegram notification and persist the message id (or the
 * error) back onto the lead. Best-effort: never throws, so a Telegram failure
 * can't lose the already-saved lead.
 */
export async function notifyNewLead(
  supabase: SupabaseClient,
  lead: LeadRow,
): Promise<void> {
  const payload: LeadForTelegram = {
    ...lead,
    project_type: typeLabel(lead.project_type),
    service: typeLabel(lead.service),
  };
  const res = await sendTelegramMessage(formatLeadMessage(payload));
  try {
    if (res.ok) {
      console.info("[telegram] lead notification sent", lead.lead_number, res.messageId);
      await supabase
        .from("leads")
        .update({ telegram_message_id: res.messageId, telegram_error: null })
        .eq("id", lead.id);
    } else {
      console.error("[telegram] lead notification failed", lead.lead_number, res.error);
      await supabase
        .from("leads")
        .update({ telegram_error: res.error })
        .eq("id", lead.id);
    }
  } catch (err) {
    // Persisting the telegram status must never break the request.
    console.error("[lead] failed to persist telegram status", err);
  }
}
