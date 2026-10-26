import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/supabase/server";
import { loadSharedReport } from "@/lib/audit/store";
import { SharedAuditReport } from "@/components/audit/SharedAuditReport";

// A stored report never changes; render on request, never index.
export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "audit" });
  return { title: t("report.shareTitle"), robots: { index: false, follow: false } };
}

/** Shareable audit report by unguessable token (noindex, robots-disallowed). */
export default async function SharedAuditPage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  if (!isSupabaseConfigured()) notFound();
  const report = await loadSharedReport(getSupabaseAdmin(), token);
  if (!report) notFound();
  const t = await getTranslations({ locale, namespace: "audit" });

  return (
    <main className="bg-day">
      <section className="mx-auto max-w-4xl px-5 py-20 md:px-8 md:py-28">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-apricot">{t("report.shareTitle")}</p>
        <h1 className="font-display mt-4 break-all text-3xl font-medium text-ink md:text-5xl">{report.result.host}</h1>
        <div className="mt-10">
          <SharedAuditReport report={report} />
        </div>
      </section>
    </main>
  );
}
