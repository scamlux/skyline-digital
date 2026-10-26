import type { Metadata } from "next";
import { setRequestLocale, getTranslations } from "next-intl/server";
import { withVariants } from "@/components/site/withVariants";
import { RefEstimate } from "@/components/pages/variants/ref/RefCalc";
import { StudioEstimate } from "@/components/pages/variants/studio/StudioCalc";
import { EstimateView } from "@/components/estimate/EstimateView";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "estimate" });
  return { title: t("eyebrow"), robots: { index: false } };
}

async function EstimatePage({
  params,
}: {
  params: Promise<{ locale: string; token: string }>;
}) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  return <EstimateView token={token} />;
}

export default withVariants({ old: EstimatePage, studio: StudioEstimate, ref: RefEstimate });
