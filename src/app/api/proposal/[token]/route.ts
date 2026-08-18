import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import { renderProposalHtml } from "@/templates/proposal/template";
import { htmlToPdf } from "@/lib/pdf/render";
import type { Proposal } from "@/lib/ai/schema";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;

  let proposal: Proposal;
  let createdAt: string;
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("estimates")
      .select("ai_result, created_at")
      .eq("token", token)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    proposal = data.ai_result as Proposal;
    createdAt = data.created_at as string;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  try {
    const date = new Date(createdAt).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const html = renderProposalHtml(proposal, { date });
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
    console.error("PDF generation failed");
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }
}
