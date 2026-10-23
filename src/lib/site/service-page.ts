import "server-only";
import { getTranslations } from "next-intl/server";
import { CASE_CATEGORY } from "@/lib/case-category";
import { getProjects } from "@/lib/portfolio";
import { basePriceUsd, featuresByType, features as featureDefs } from "@/lib/pricing/rules";
import { roleHoursCost } from "@/lib/pricing/roles";
import type { ProjectType } from "@/lib/pricing/types";
import { localeUrl } from "@/lib/seo";
import { formatUsd, roundMoney } from "@/lib/utils";

/** Порядок услуг — тот же, что в старых /services и /services/[slug]. */
export const SERVICE_KEYS = ["website", "webApp", "mobileApp", "ai", "automation", "uiux"] as const;
export type ServiceKey = (typeof SERVICE_KEYS)[number];

export const isServiceKey = (slug: string): slug is ServiceKey => (SERVICE_KEYS as readonly string[]).includes(slug);

/** «·»-строки сообщений → список (как в старых страницах услуг). */
export const splitDots = (s: string) => s.split("·").map((x) => x.trim()).filter(Boolean);

/**
 * Данные деталки услуги для вариантов Studio/Референс — та же логика, что у старой:
 * цена «от» и «+$» опций из калькулятора, до трёх кейсов категории, FAQ, JSON-LD Service.
 */
export async function getServicePage(locale: string, key: ServiceKey) {
  const [t, tc, projects] = await Promise.all([
    getTranslations("services"),
    getTranslations("calc"),
    getProjects(),
  ]);
  const price = basePriceUsd(key as ProjectType);
  const features = (featuresByType[key as ProjectType] ?? []).slice(0, 8).map((f) => ({
    key: f,
    label: tc(`features.${f}`),
    price: `+${formatUsd(roundMoney(roleHoursCost(featureDefs[f] ?? {})))}`,
  }));
  const category = CASE_CATEGORY[key];
  const cases = projects.filter((p) => !category || p.category === category).slice(0, 3);
  const faq = [1, 2, 3, 4].map((i) => ({ q: t(`faq.q${i}`), a: t(`faq.a${i}`) }));
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Service",
    name: t(`items.${key}.title`),
    description: t(`items.${key}.desc`),
    provider: { "@type": "Organization", name: "Skyline Digital", url: localeUrl(locale, "") },
    areaServed: "UZ",
    offers: { "@type": "Offer", priceCurrency: "USD", price, description: `${t("from")} ${formatUsd(price)}` },
  };
  return { price, benefits: splitDots(t(`items.${key}.benefits`)), features, cases, faq, jsonLd };
}
