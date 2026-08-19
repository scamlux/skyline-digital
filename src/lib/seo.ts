import { routing } from "@/i18n/routing";

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://sky-digital-agency.vercel.app";

export const SITE_NAME = "Skyline Digital";

/** Locale-specific SEO copy (title, description, keywords). */
export const seoByLocale: Record<
  string,
  { title: string; description: string; keywords: string[]; ogLocale: string }
> = {
  ru: {
    title: "Skyline Digital (Скайлайн) — веб-разработка, приложения и AI в Ташкенте",
    description:
      "Скайлайн Диджитал (Skyline Digital) — цифровое агентство: разработка сайтов, веб- и мобильных приложений, AI-решения и автоматизация. Рассчитайте стоимость проекта онлайн за 2 минуты и получите коммерческое предложение.",
    keywords: [
      "скайлайн",
      "скайлайн диджитал",
      "skyline digital",
      "скайлайн ташкент",
      "веб-разработка Ташкент",
      "разработка сайтов Узбекистан",
      "заказать сайт Ташкент",
      "мобильное приложение разработка",
      "AI решения для бизнеса",
      "чат-бот разработка",
      "автоматизация бизнеса",
      "цифровое агентство Ташкент",
      "стоимость разработки сайта",
      "калькулятор стоимости сайта",
    ],
    ogLocale: "ru_RU",
  },
  en: {
    title: "Skyline Digital — Web, Mobile & AI Development Agency in Tashkent",
    description:
      "Skyline Digital is a full-cycle digital agency: websites, web & mobile apps, AI solutions and automation. Estimate your project cost online in 2 minutes and get a commercial proposal.",
    keywords: [
      "web development Tashkent",
      "software development Uzbekistan",
      "mobile app development",
      "AI solutions agency",
      "chatbot development",
      "business automation",
      "digital agency Central Asia",
      "hire developers Uzbekistan",
      "website cost calculator",
    ],
    ogLocale: "en_US",
  },
  uz: {
    title: "Skyline Digital — Toshkentda veb, mobil va AI ishlab chiqish agentligi",
    description:
      "Skyline Digital — to'liq tsiklli raqamli agentlik: saytlar, veb va mobil ilovalar, AI yechimlar va avtomatlashtirish. Loyiha narxini onlayn 2 daqiqada hisoblang va tijorat taklifini oling.",
    keywords: [
      "veb ishlab chiqish Toshkent",
      "sayt yaratish O'zbekiston",
      "mobil ilova ishlab chiqish",
      "AI yechimlar",
      "chatbot yaratish",
      "biznes avtomatlashtirish",
      "raqamli agentlik Toshkent",
      "sayt narxi kalkulyator",
    ],
    ogLocale: "uz_UZ",
  },
};

/** Absolute URL for a locale-prefixed path (ru is unprefixed). */
export function localeUrl(locale: string, path = ""): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${SITE_URL}${prefix}${path}`;
}

/** hreflang alternates map for a given path across all locales. */
export function languageAlternates(path = ""): Record<string, string> {
  const langs: Record<string, string> = {};
  for (const l of routing.locales) langs[l] = localeUrl(l, path);
  langs["x-default"] = localeUrl(routing.defaultLocale, path);
  return langs;
}

/** Organization + WebSite JSON-LD, injected on every page. */
export function organizationJsonLd(locale: string) {
  const seo = seoByLocale[locale] ?? seoByLocale.ru;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "ProfessionalService"],
        "@id": `${SITE_URL}/#organization`,
        name: SITE_NAME,
        alternateName: ["Скайлайн Диджитал", "Скайлайн", "Skyline", "skyline-digital.uz"],
        url: SITE_URL,
        description: seo.description,
        logo: `${SITE_URL}/icon`,
        image: `${SITE_URL}/opengraph-image`,
        areaServed: ["UZ", "Central Asia", "Worldwide"],
        address: {
          "@type": "PostalAddress",
          addressLocality: "Tashkent",
          addressCountry: "UZ",
        },
        knowsAbout: [
          "Web development",
          "Mobile app development",
          "Artificial Intelligence",
          "Business automation",
          "UI/UX design",
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE_NAME,
        description: seo.description,
        publisher: { "@id": `${SITE_URL}/#organization` },
        inLanguage: locale,
      },
    ],
  };
}
