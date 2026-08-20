import { NextResponse } from "next/server";
import { contactRequestSchema } from "@/lib/validation/contact";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { createLead, notifyNewLead } from "@/lib/leads";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!rateLimit(`contact:${clientIp(request)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = contactRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const d = parsed.data;

  // 1. Persist the lead — the durable step.
  let lead;
  try {
    const supabase = getSupabaseAdmin();
    lead = await createLead(supabase, {
      client_name: d.name,
      company: d.company,
      email: d.email,
      phone: d.phone,
      telegram: d.messenger,
      service: d.service,
      description: d.message,
      budget: d.budget,
      source: d.source || "contact_form",
      utm_source: d.utm_source,
      utm_medium: d.utm_medium,
      utm_campaign: d.utm_campaign,
      utm_content: d.utm_content,
      landing_page: d.landing_page,
      referrer: d.referrer,
    });

    // 2. Notify Telegram (best-effort — lead is already saved).
    await notifyNewLead(supabase, lead);

    return NextResponse.json(
      { ok: true, leadNumber: lead.lead_number },
      { status: 201 },
    );
  } catch (err) {
    console.error("[contact] saving lead failed:", err);
    return NextResponse.json({ error: "Could not save message" }, { status: 500 });
  }
}
