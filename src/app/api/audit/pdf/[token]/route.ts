import { NextResponse } from "next/server";
import { getTranslations } from "next-intl/server";
import { routing } from "@/i18n/routing";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadSharedReport } from "@/lib/audit/store";
import { reportData } from "@/lib/audit/report-data";
import { buildAuditReportHtml } from "@/lib/audit/report-html";
import { htmlToPdf } from "@/lib/pdf/render";
import { rateLimit, clientIp } from "@/lib/rate-limit";
import { CONTACTS } from "@/lib/contact";

// Chromium renders the PDF; the stored report itself never changes.
export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * GET /api/audit/pdf/<token>?locale=ru — the stored audit report as a PDF.
 * Same unguessable token as the share page; nothing new is measured, so the
 * only cost is the render — rate-limited per IP anyway.
 */
export async function GET(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[a-f0-9]{32}$/.test(token)) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!(await rateLimit(`audit-pdf:${clientIp(request)}`, { limit: 20, windowMs: 60 * 60_000 }))) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const report = await loadSharedReport(getSupabaseAdmin(), token);
  if (!report || !report.result.reachable || !report.result.score) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const requested = new URL(request.url).searchParams.get("locale") ?? routing.defaultLocale;
  const locale = (routing.locales as readonly string[]).includes(requested) ? requested : routing.defaultLocale;
  const t = await getTranslations({ locale, namespace: "audit" });
  const intl = locale === "uz" ? "uz-UZ" : locale === "en" ? "en-US" : "ru-RU";

  const html = buildAuditReportHtml(
    reportData(report.result, t as unknown as Parameters<typeof reportData>[1], {
      locale,
      date: new Date(report.createdAt).toLocaleDateString(intl, { day: "numeric", month: "long", year: "numeric" }),
      contactLine: `Skyline Digital · skyline-digital.uz · ${CONTACTS.phoneDisplay} · ${CONTACTS.email}`,
      forPdf: true,
    }),
  );

  try {
    const pdf = await htmlToPdf(html, { format: "a4" });
    const name = `skyline-audit-${report.result.host.replace(/[^a-z0-9.-]/gi, "_")}.pdf`;
    return new NextResponse(Buffer.from(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${name}"`,
        "Cache-Control": "private, max-age=3600",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch (err) {
    console.error("[audit/pdf] render failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "PDF render failed" }, { status: 500 });
  }
}
