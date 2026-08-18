import { NextResponse } from "next/server";
import { estimateRequestSchema } from "@/lib/validation/estimate";
import { computePricing } from "@/lib/pricing/engine";
import { generateProposal } from "@/lib/ai/client";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { generateToken } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = estimateRequestSchema.safeParse(body);
  if (!parsed.success) {
    // Honeypot or validation failure — do not leak details.
    return NextResponse.json(
      { error: "Validation failed", issues: parsed.error.flatten() },
      { status: 422 },
    );
  }

  const { configuration, info } = parsed.data;

  // 1. Deterministic price — the single source of truth.
  const pricing = computePricing(configuration);

  // 2. AI proposal (price/timeline are overwritten with engine values inside).
  let proposal;
  try {
    proposal = await generateProposal({ configuration, info, pricing });
  } catch (err) {
    console.error("AI proposal generation failed");
    return NextResponse.json(
      { error: "Could not generate proposal" },
      { status: 502 },
    );
  }

  // 3. Persist lead + estimate.
  try {
    const supabase = getSupabaseAdmin();

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .insert({
        name: info.contactName,
        email: info.email,
        messenger: info.messenger || null,
        service: configuration.projectType,
        budget: info.budget || null,
        message: info.description || null,
      })
      .select("id")
      .single();
    if (leadError) throw leadError;

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

    return NextResponse.json({ token, pricing, proposal }, { status: 201 });
  } catch (err) {
    console.error("Persisting estimate failed");
    return NextResponse.json(
      { error: "Could not save estimate" },
      { status: 500 },
    );
  }
}
