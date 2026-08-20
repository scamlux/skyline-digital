import { NextResponse } from "next/server";
import { estimateRequestSchema } from "@/lib/validation/estimate";
import { computePricing } from "@/lib/pricing/engine";
import { generateProposal, fallbackProposal } from "@/lib/ai/client";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { generateToken } from "@/lib/utils";
import { createLead, notifyNewLead, typeLabel } from "@/lib/leads";
import { rateLimit, clientIp } from "@/lib/rate-limit";

export const runtime = "nodejs";

function midTotal(min: number, max: number): number {
  return Math.round((min + max) / 2 / 50) * 50;
}

export async function POST(request: Request) {
  if (!rateLimit(`estimate:${clientIp(request)}`)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = estimateRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { configuration, info, context } = parsed.data;

  // 1. Deterministic price — the single source of truth.
  const pricing = computePricing(configuration);
  const price = midTotal(pricing.totalMin, pricing.totalMax);

  const supabase = getSupabaseAdmin();

  // 2. Create the lead first, so it survives even if AI/Telegram fail later.
  let lead;
  try {
    lead = await createLead(supabase, {
      client_name: info.contactName,
      company: info.company,
      email: info.email,
      phone: info.phone,
      telegram: info.messenger,
      project_type: configuration.projectType,
      service: typeLabel(configuration.projectType) ?? configuration.projectType,
      description: info.description || info.projectName,
      budget: info.budget,
      deadline: info.deadline,
      calculated_price: price,
      currency: "USD",
      source: context?.source || "calculator",
      utm_source: context?.utm_source,
      utm_medium: context?.utm_medium,
      utm_campaign: context?.utm_campaign,
      utm_content: context?.utm_content,
      landing_page: context?.landing_page,
      referrer: context?.referrer,
    });
  } catch (err) {
    console.error("[estimate] saving lead failed:", err);
    return NextResponse.json({ error: "Could not save lead" }, { status: 500 });
  }

  // 3. Notify Telegram (best-effort).
  await notifyNewLead(supabase, lead);

  // 4. AI proposal (price/timeline overwritten with engine values inside).
  //    On AI failure, fall back to a deterministic template so the estimate is
  //    still issued (spec §8) — the numbers come from the pricing engine either way.
  let proposal;
  try {
    proposal = await generateProposal({ configuration, info, pricing });
  } catch {
    console.error("[estimate] AI proposal generation failed — using template fallback");
    proposal = fallbackProposal({ configuration, info, pricing });
  }

  // 5. Enrich lead with the AI summary, then store the estimate.
  try {
    await supabase
      .from("leads")
      .update({ ai_summary: proposal.summary })
      .eq("id", lead.id);

    const token = generateToken();
    const { error: estimateError } = await supabase.from("estimates").insert({
      lead_id: lead.id,
      token,
      project_type: configuration.projectType,
      configuration,
      pricing_result: pricing,
      ai_result: proposal,
    });
    if (estimateError) throw estimateError;

    return NextResponse.json(
      { token, pricing, proposal, leadNumber: lead.lead_number },
      { status: 201 },
    );
  } catch (err) {
    console.error("[estimate] persisting estimate failed:", err);
    return NextResponse.json(
      { error: "Could not save estimate", leadNumber: lead.lead_number },
      { status: 500 },
    );
  }
}
