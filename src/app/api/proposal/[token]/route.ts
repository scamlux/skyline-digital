import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { renderProposalHtml } from "@/templates/proposal/template";
import { htmlToPdf } from "@/lib/pdf/render";
import type { Proposal } from "@/lib/ai/schema";
import type { PricingResult, ProjectConfiguration } from "@/lib/pricing/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface EstimateRow {
  ai_result: Proposal;
  pricing_result: PricingResult;
  configuration: ProjectConfiguration;
  created_at: string;
  leads: { name: string } | null;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let row: EstimateRow;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("estimates")
      .select("ai_result, pricing_result, configuration, created_at, leads(name)")
      .eq("token", token)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    row = data as unknown as EstimateRow;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  try {
    const date = new Date(row.created_at).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const html = renderProposalHtml({
      proposal: row.ai_result,
      pricing: row.pricing_result,
      configuration: row.configuration,
      meta: {
        date,
        projectName: row.ai_result.projectTitle,
        clientName: row.leads?.name,
      },
    });
    const pdf = await htmlToPdf(html);

    const filename = `proposal-${token}.pdf`;
    return new NextResponse(Buffer.from(pdf), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    console.error("PDF generation failed:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
