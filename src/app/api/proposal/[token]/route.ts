import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { renderProposalHtml } from "@/templates/proposal/template";
import { getSetting, getProjects } from "@/lib/portfolio";
import { pickCase } from "@/lib/case-category";
import { SITE_URL } from "@/lib/seo";
import { htmlToPdf } from "@/lib/pdf/render";
import {
  sendTelegramDocumentBuffer,
  formatProposalMessage,
  type ProposalForTelegram,
} from "@/lib/telegram";
import { typeLabel } from "@/lib/leads";
import type { Proposal } from "@/lib/ai/schema";
import type { PricingResult, ProjectConfiguration } from "@/lib/pricing/types";
import type { LeadRow, ProposalRow } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const BUCKET = "proposals";
/** Lifetime of a signed download link. Short: the client is redirected at once. */
const SIGNED_URL_TTL_SECONDS = 60 * 60;

/**
 * Signs a download URL for a private-bucket object. Returns null on failure so
 * the caller can fall back to streaming the PDF instead of 500-ing.
 */
async function signDownloadUrl(
  supabase: SupabaseClient,
  path: string,
  filename: string,
): Promise<string | null> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS, { download: filename });
  if (error || !data?.signedUrl) {
    console.error("[proposal] signing failed:", error?.message ?? "no url");
    return null;
  }
  return data.signedUrl;
}

interface EstimateJoined {
  id: string;
  lead_id: string | null;
  ai_result: Proposal;
  pricing_result: PricingResult;
  configuration: ProjectConfiguration;
  created_at: string;
  leads: LeadRow | null;
}

function midTotal(min: number, max: number): number {
  return Math.round((min + max) / 2 / 50) * 50;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const supabase = getSupabaseAdmin();

  // Phone gate: the КП download requires a valid UZ phone (collected by the
  // masked input on the estimate page / wizard). Stored on the lead below.
  const phone = new URL(request.url).searchParams.get("phone") ?? "";
  if (!/^\+998\d{9}$/.test(phone)) {
    return NextResponse.json({ error: "phone_required" }, { status: 400 });
  }

  // Load the estimate + its lead.
  let est: EstimateJoined;
  try {
    const { data, error } = await supabase
      .from("estimates")
      .select(
        "id, lead_id, ai_result, pricing_result, configuration, created_at, leads(*)",
      )
      .eq("token", token)
      .single();
    if (error || !data) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    est = data as unknown as EstimateJoined;
  } catch {
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }

  // Persist the gate phone on the lead (fills empty or updates stale).
  if (est.lead_id) {
    await supabase
      .from("leads")
      .update({ phone, updated_at: new Date().toISOString() })
      .eq("id", est.lead_id);
  }

  // Idempotency: if a proposal PDF already exists for this estimate, serve it
  // through a freshly signed URL (the bucket is private — see migration 0003).
  try {
    const { data: existing } = await supabase
      .from("proposals")
      .select("*")
      .eq("estimate_id", est.id)
      .or("file_path.not.is.null,file_url.not.is.null")
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (existing) {
      const row = existing as ProposalRow;
      // Legacy rows (pre-0003) have no file_path; the object still lives at
      // the deterministic `<token>.pdf` path.
      const path = row.file_path ?? `${token}.pdf`;
      const signed = await signDownloadUrl(supabase, path, `proposal-${token}.pdf`);
      if (signed) return NextResponse.redirect(signed, 302);
      console.warn("[proposal] could not sign existing PDF — regenerating");
    }
  } catch (err) {
    console.error("[proposal] lookup failed (continuing to generate):", err);
  }

  const lead = est.leads;
  const price = midTotal(est.pricing_result.totalMin, est.pricing_result.totalMax);

  // 1. Render the PDF.
  let pdf: Uint8Array;
  try {
    const date = new Date(est.created_at).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const fxRate = await getSetting<number>("fx_rate", 12000);
    const designCase = pickCase(await getProjects(), est.configuration?.projectType);
    const designImage = designCase
      ? designCase.image.startsWith("http")
        ? designCase.image
        : `${SITE_URL}${designCase.image}`
      : undefined;
    const html = renderProposalHtml({
      fxRate,
      proposal: est.ai_result,
      pricing: est.pricing_result,
      configuration: est.configuration,
      meta: {
        date,
        projectName: est.ai_result.projectTitle,
        clientName: lead?.client_name ?? undefined,
        hasEmail: Boolean(lead?.email),
        hasTelegram: Boolean(lead?.telegram),
        designPreviewImage: designImage,
        designPreviewTitle: designCase?.title,
      },
    });
    pdf = await htmlToPdf(html);
  } catch (err) {
    console.error("[proposal] PDF generation failed:", err);
    return NextResponse.json({ error: "PDF generation failed" }, { status: 500 });
  }

  const filename = `proposal-${token}.pdf`;

  // 2. Upload to Supabase Storage. If this fails, still return the PDF so the
  //    user gets their КП; a later download will retry storage + Telegram.
  let fileUrl: string | null = null;
  let filePath: string | null = null;
  try {
    const path = `${token}.pdf`;
    const { error: upErr } = await supabase.storage
      .from(BUCKET)
      .upload(path, Buffer.from(pdf), { contentType: "application/pdf", upsert: true });
    if (upErr) throw upErr;
    filePath = path;
    fileUrl = await signDownloadUrl(supabase, path, filename);
    console.info("[proposal] PDF stored", path);
  } catch (err) {
    console.error("[proposal] storage upload failed:", err);
    return pdfResponse(pdf, filename);
  }

  // 3. Create the Proposal record (versioned, linked to the lead).
  let proposalRow: ProposalRow | null = null;
  if (lead) {
    try {
      const { data: last } = await supabase
        .from("proposals")
        .select("version")
        .eq("lead_id", lead.id)
        .order("version", { ascending: false })
        .limit(1)
        .maybeSingle();
      const version = (last?.version ?? 0) + 1;

      const validUntil = new Date();
      validUntil.setDate(validUntil.getDate() + 14);

      const { data: created, error: insErr } = await supabase
        .from("proposals")
        .insert({
          lead_id: lead.id,
          estimate_id: est.id,
          version,
          title: est.ai_result.projectTitle,
          content: est.ai_result,
          total_price: price,
          currency: "USD",
          valid_until: validUntil.toISOString().slice(0, 10),
          file_path: filePath,
          file_url: fileUrl,
          status: "CREATED",
        })
        .select("*")
        .single();
      if (insErr) throw insErr;
      proposalRow = created as ProposalRow;
      console.info("[proposal] created", lead.lead_number, `v${version}`);

      await supabase
        .from("leads")
        .update({ proposal_id: proposalRow.id, status: "PROPOSAL_SENT" })
        .eq("id", lead.id);
    } catch (err) {
      console.error("[proposal] creating proposal record failed:", err);
    }
  }

  // 4. Send the PDF to Telegram (best-effort — never deletes PDF/Proposal).
  if (lead && proposalRow) {
    const payload: ProposalForTelegram = {
      lead_number: lead.lead_number,
      client_name: lead.client_name,
      project_type: typeLabel(lead.project_type),
      service: typeLabel(lead.service ?? lead.project_type),
      total_price: price,
      currency: "USD",
      deadline: lead.deadline,
      package: `${est.configuration.features.length} функц. · ${est.pricing_result.estimatedWeeks} нед.`,
      ai_summary: lead.ai_summary ?? est.ai_result.summary,
      version: proposalRow.version,
      created_at: proposalRow.created_at,
    };
    // The bucket is private, so upload the bytes rather than a signed URL.
    const res = await sendTelegramDocumentBuffer(
      pdf,
      filename,
      formatProposalMessage(payload),
    );
    try {
      if (res.ok) {
        console.info("[telegram] proposal sent", lead.lead_number, res.messageId);
        await supabase
          .from("proposals")
          .update({ status: "SENT", telegram_message_id: res.messageId, telegram_error: null })
          .eq("id", proposalRow.id);
      } else {
        console.error("[telegram] proposal send failed", lead.lead_number, res.error);
        await supabase
          .from("proposals")
          .update({ status: "SEND_FAILED", telegram_error: res.error })
          .eq("id", proposalRow.id);
      }
    } catch (err) {
      console.error("[proposal] failed to persist telegram status:", err);
    }
  }

  // 5. Send the user to the signed URL (or stream the PDF if signing failed).
  return fileUrl ? NextResponse.redirect(fileUrl, 302) : pdfResponse(pdf, filename);
}

function pdfResponse(pdf: Uint8Array, filename: string): NextResponse {
  return new NextResponse(Buffer.from(pdf), {
    status: 200,
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
