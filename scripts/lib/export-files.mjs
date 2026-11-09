// Тексты файлов, которые экспорт шаблона создаёт в проекте клиента (каркас Next.js,
// обвязка вокруг шаблона, site.config.ts). Это строки, а не настоящие .ts/.tsx в репозитории:
// иначе tsc и eslint студии проверяли бы заглушки, которым нечем разрешить site.config.
import fs from "node:fs";
import path from "node:path";

/** Метаданные шаблонов: имена компонентов, константа с данными и ключ режима записи/заказа. */
export const TEMPLATE_META = {
  restaurant: {
    title: "Ресторан",
    styleNames: { a: "День (тёплая трапеза)", b: "Вечер (чистый вечер)" },
    siteFile: "Restaurant",
    siteExport: "RestaurantSite",
    adminExport: "RestaurantAdmin",
    modeKey: "booking",
    data: { import: "restaurantDemo", file: "data.ts", fieldsFrom: { a: ["data.ts", "restaurantDemo"], b: ["data.ts", "restaurantDemo"] } },
  },
  clinic: {
    title: "Клиника и стоматология",
    styleNames: { a: "Белый кабинет", b: "Ночная смена" },
    siteFile: "Clinic",
    siteExport: "ClinicSite",
    adminExport: "ClinicAdmin",
    modeKey: "booking",
    data: { import: "clinicDemo", file: "data.ts", fieldsFrom: { a: ["data.ts", "clinicDemo"], b: ["data.ts", "clinicDemo"] } },
  },
  salon: {
    title: "Салон и барбершоп",
    styleNames: { a: "Мужской (барбершоп)", b: "Женский (салон красоты)" },
    siteFile: "Salon",
    siteExport: "SalonSite",
    adminExport: "SalonAdmin",
    modeKey: "booking",
    // Салон — два бизнеса: стиль a = барбершоп (data-men), b = салон красоты (data-women).
    data: { import: "salonBusinesses", file: "data.ts", fieldsFrom: { a: ["data-men.ts", "menData"], b: ["data-women.ts", "womenData"] } },
    perStyleData: true,
  },
  cafe: {
    title: "Кафе и кофейня",
    styleNames: { a: "Утро", b: "Вечер" },
    siteFile: "Cafe",
    siteExport: "CafeSite",
    adminExport: "CafeAdmin",
    modeKey: "order",
    data: { import: "cafeDemo", file: "data.ts", fieldsFrom: { a: ["data.ts", "cafeDemo"], b: ["data.ts", "cafeDemo"] } },
  },
};

/** Имя-заглушка Telegram в site.config.ts: сборка предупреждает, пока его не заменили. */
export const TELEGRAM_PLACEHOLDER = "your_telegram";

const LOCALE_NAMES = { ru: "русский", en: "английский", uz: "узбекский (латиница)" };
export const localeName = (l) => LOCALE_NAMES[l];

/** Фрагмент `site.config.ts` с одним полем: JSON-значение с отступом под вложенность. */
const field = (key, value, comment) => {
  // Ключи-идентификаторы без кавычек: файл читает владелец, он должен выглядеть как обычный конфиг.
  const json = JSON.stringify(value, null, 2)
    .replace(/^(\s*)"([A-Za-z_]\w*)":/gm, "$1$2:")
    .replace(/\n/g, "\n  ");
  return `${comment ? `  /** ${comment} */\n` : ""}  ${key}: ${json},\n`;
};

/**
 * @param {object} p
 * @param {string} p.templateId
 * @param {string} p.style
 * @param {boolean} p.withAdmin
 * @param {Record<string, unknown>} p.fields значения из readDemoFields
 */
export function siteConfigTs({ templateId, style, withAdmin, fields }) {
  const meta = TEMPLATE_META[templateId];
  const brandBlock = fields.brand ? field("brand", fields.brand, "Логотип в шапке: крупная и мелкая строки.") : "";
  return `/**
 * Настройки сайта клиента: меняйте только значения в кавычках, структуру не трогайте.
 * После правки пересоберите сайт (\`npm run build\` локально или новый деплой на хостинге).
 *
 * Здесь — имя, контакты, часы работы, настоящие отзывы, оценка, цифры и акция. Меню/услуги/цены лежат в
 * src/site-templates/${templateId}/data.ts, тексты интерфейса — в src/site-templates/${templateId}/ui.ts
 * (подробности в README.md). Название, адрес, телефон и часы ниже — образец шаблона «${meta.title}»,
 * стиль «${style}»: замените их данными клиента. Заявки гостей приходят в Telegram по полю telegram.
 */
import type { ClientRating } from "./src/site-templates/types";
import type { ConfigReview, ConfigStat, Multilang } from "./src/site-templates/kit/client-config";

/** Адрес сайта после публикации (без «/» в конце): нужен для canonical, og:image и sitemap. */
const DETECTED_URL =
  process.env.SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL ? \`https://\${process.env.VERCEL_PROJECT_PRODUCTION_URL}\` : undefined) ??
  process.env.URL; // на Netlify это основной адрес сайта

export const siteConfig = {
  /** Свой домен впишите сюда строкой, например "https://dasturxon.uz" (или задайте переменную окружения SITE_URL). */
  siteUrl: DETECTED_URL ?? "https://example.com",

${withAdmin ? `
  /** Кабинет владельца на /admin (пустой блокнот, данные хранятся в браузере). false — страницы кабинета не собираются вовсе. */
  admin: true,
` : ""}
${field("name", fields.name, "Название бизнеса (шапка, заголовок страницы, схема для поисковиков).")}${brandBlock}${field("tagline", fields.tagline, "Короткая подпись: попадает в заголовок страницы и описание для поиска.")}${field("phone", fields.phone, "display — как показывать, e164 — для ссылки tel: (+998…, без пробелов).")}${field("telegram", TELEGRAM_PLACEHOLDER, "Имя в Telegram без @: на https://t.me/<имя> уходят заявки гостей. ОБЯЗАТЕЛЬНО замените на своё.")}${field("address", fields.address, "Адрес на трёх языках.")}${field("hours", fields.hours, "Часы работы, формат ЧЧ:ММ, время Ташкента (UTC+5).")}${field("mapUrl", fields.mapUrl, "Ссылка на карту: откройте место в Google Maps или Яндекс Картах → «Поделиться» → скопируйте ссылку.")}
  /**
   * НАСТОЯЩИЕ отзывы гостей. Пока список пуст, блока отзывов на сайте нет: вымышленные не показываются никогда.
   * text — строка (одна на все языки) или { ru: "…", en: "…", uz: "…" }; url — ссылка на отзыв (2ГИС, Google Maps), необязательна.
   * Пример: { author: "Дилноза", text: "Плов как у мамы", url: "https://maps.app.goo.gl/…" }
   */
  reviews: [] as ConfigReview[],
  /**
   * НАСТОЯЩАЯ общая оценка и откуда она взята; без неё на сайте нет ни звёзд, ни «4,9».
   * Пример: { value: 4.8, count: 132, source: "Google Maps", url: "https://maps.app.goo.gl/…" }
   */
  rating: undefined as ClientRating | undefined,
  /**
   * НАСТОЯЩИЕ цифры («9 лет», «12 000 гостей»); пустой список — полосы с цифрами нет.
   * Пример: { value: "9 лет", label: "с вами" }; label — строка или { ru, en, uz }.
   */
  stats: [] as ConfigStat[],
  /** Настоящая акция одной строкой (или { ru, en, uz }); без неё баннера акции нет. */
  promo: undefined as Multilang | undefined,
};

export type SiteConfig = typeof siteConfig;
`;
}

export function applyConfigTs() {
  return `import type { SiteConfig } from "../../site.config";

/** Поля данных шаблона, которые владелец правит в site.config.ts. */
interface Overridable {
  name: string;
  tagline: { ru: string; en: string; uz: string };
  phone: { display: string; e164: string };
  telegram: string;
  address: { ru: string; en: string; uz: string };
  mapUrl: string;
  hours: { open: string; close: string };
}

/**
 * Накладывает site.config.ts на образец данных шаблона. Данные не мутируются: возвращается новая копия.
 * Часы сливаются поверх образца (у клиники там ещё \`closedDays\`), в booking/order всегда "telegram".
 */
export function applyConfig<D extends Overridable>(demo: D, config: SiteConfig, modeKey: "booking" | "order"): D {
  const brand = (config as { brand?: { main: string; sub: string } }).brand;
  const modeHolder = (demo as unknown as Record<string, object>)[modeKey];
  return {
    ...demo,
    name: config.name,
    tagline: config.tagline,
    phone: config.phone,
    telegram: config.telegram,
    address: config.address,
    mapUrl: config.mapUrl,
    hours: { ...demo.hours, ...config.hours },
    ...(brand ? { brand } : {}),
    // Заявка гостя уходит в Telegram владельца (t.me/<telegram> с готовым текстом): режима «только подтверждение» у клиентского сайта нет.
    [modeKey]: { ...modeHolder, mode: "telegram" },
  } as D;
}
`;
}

export function dataTs({ templateId, style }) {
  const meta = TEMPLATE_META[templateId];
  const dir = `../site-templates/${templateId}`;
  if (meta.perStyleData) {
    return `import { ${meta.data.import} } from "${dir}/data";
import type { StyleId } from "../site-templates/types";
import { siteConfig } from "../../site.config";
import { normalizeClientContent } from "../site-templates/kit/client-config";
import { applyConfig } from "./apply-config";

export const TEMPLATE_ID = "${templateId}";
/** Стиль сайта, выбранный при экспорте (a — барбершоп, b — салон красоты). */
export const STYLE: StyleId = "${style}";
export const OG_IMAGE = "/templates/${templateId}/img/og-1200.jpg";

/** Оба бизнеса шаблона; клиентские правки из site.config.ts накладываются на выбранный стиль. */
export const businesses = { ...${meta.data.import}, [STYLE]: applyConfig(${meta.data.import}[STYLE], siteConfig, "${meta.modeKey}") };
export const data = businesses[STYLE];

/** Настоящие отзывы, оценка, цифры и акция из site.config.ts; вымышленные из data.ts не показываются. */
export const client = normalizeClientContent({ reviews: siteConfig.reviews, rating: siteConfig.rating, stats: siteConfig.stats, promo: siteConfig.promo });
`;
  }
  return `import { ${meta.data.import} } from "${dir}/data";
import type { StyleId } from "../site-templates/types";
import { siteConfig } from "../../site.config";
import { normalizeClientContent } from "../site-templates/kit/client-config";
import { applyConfig } from "./apply-config";

export const TEMPLATE_ID = "${templateId}";
/** Стиль сайта, выбранный при экспорте. */
export const STYLE: StyleId = "${style}";
export const OG_IMAGE = "/templates/${templateId}/img/og-1200.jpg";

export const data = applyConfig(${meta.data.import}, siteConfig, "${meta.modeKey}");

/** Настоящие отзывы, оценка, цифры и акция из site.config.ts; вымышленные из data.ts не показываются. */
export const client = normalizeClientContent({ reviews: siteConfig.reviews, rating: siteConfig.rating, stats: siteConfig.stats, promo: siteConfig.promo });
`;
}

export function templateTsx({ templateId, withAdmin }) {
  const meta = TEMPLATE_META[templateId];
  const dir = `../site-templates/${templateId}`;
  const adminImport = withAdmin ? `import { ${meta.adminExport} } from "${dir}/Admin";\n` : "";
  const dataImport = meta.perStyleData ? "businesses, client, data, STYLE" : "client, data, STYLE";
  const adminProp = meta.perStyleData ? "businesses={businesses}" : "data={data}";
  const adminFn = withAdmin
    ? `
/** Кабинет владельца (данные живут в браузере, см. README): режим "client", пустой, без примеров. */
export function renderAdmin({ locale, localeHrefs, siteHref }: AdminProps): ReactElement {
  return <${meta.adminExport} ${adminProp}${meta.perStyleData ? " style={STYLE}" : ""} mode="client" locale={locale} localeHrefs={localeHrefs} siteHref={siteHref} />;
}
`
    : "";
  return `import type { ReactElement } from "react";
${adminImport}import { ${meta.siteExport} } from "${dir}/${meta.siteFile}";
import type { Locale } from "../site-templates/types";
import { ${dataImport} } from "./data";

interface SiteProps {
  locale: Locale;
  localeHrefs: Record<Locale, string>;
}
${withAdmin ? "\ninterface AdminProps extends SiteProps {\n  siteHref: string;\n}\n" : ""}
export function renderSite({ locale, localeHrefs }: SiteProps): ReactElement {
  return <${meta.siteExport} data={data} mode="client" client={client} locale={locale} style={STYLE} localeHrefs={localeHrefs} />;
}
${adminFn}`;
}

export function routesTs({ locales, withAdmin }) {
  return `import type { Locale } from "../site-templates/types";
${withAdmin ? `import { siteConfig } from "../../site.config";\n` : ""}
/** Языки сайта; первый — основной, он живёт в корне (/), остальные под префиксом (/en/). */
export const LOCALE_LIST: readonly Locale[] = ${JSON.stringify(locales)};
export const DEFAULT_LOCALE: Locale = LOCALE_LIST[0];

/** Кабинет владельца включён? (README: «Кабинет владельца: включить и выключить»). */
export const ADMIN_ENABLED: boolean = ${withAdmin ? "siteConfig.admin" : "false"};

export interface Route {
  locale: Locale;
  admin: boolean;
}

/** Путь страницы с завершающим «/» (trailingSlash: true, чтобы любой статический хостинг отдавал index.html). */
export function routePath({ locale, admin }: Route): string {
  const base = locale === DEFAULT_LOCALE ? "/" : \`/\${locale}/\`;
  return admin ? \`\${base}admin/\` : base;
}

/** Адреса сайта (или кабинета) на всех языках — для переключателя языка. Выключенные языки ведут на основной. */
export function localeHrefs(admin: boolean): Record<Locale, string> {
  const href = (locale: Locale) => routePath({ locale: LOCALE_LIST.includes(locale) ? locale : DEFAULT_LOCALE, admin });
  return { ru: href("ru"), en: href("en"), uz: href("uz") };
}

/** Сегменты URL → маршрут. null — такой страницы нет (отдаст 404). */
export function parseRoute(segments: string[] | undefined): Route | null {
  const parts = [...(segments ?? [])];
  const admin = parts[parts.length - 1] === "admin";
  if (admin) parts.pop();
  if (parts.length > 1) return null;
  const locale = (parts[0] ?? DEFAULT_LOCALE) as Locale;
  if (parts.length === 1 && (locale === DEFAULT_LOCALE || !LOCALE_LIST.includes(locale))) return null;
  if (admin && !ADMIN_ENABLED) return null;
  return { locale, admin };
}

/** Все страницы для статической сборки: [] — главная, ["en"], ["admin"], ["en", "admin"]… */
export function allSegments(): string[][] {
  return LOCALE_LIST.flatMap((locale) => {
    const prefix = locale === DEFAULT_LOCALE ? [] : [locale];
    return ADMIN_ENABLED ? [prefix, [...prefix, "admin"]] : [prefix];
  });
}
`;
}

export function seoTs() {
  return `import type { Metadata } from "next";
import { siteConfig } from "../../site.config";
import { pick, type L, type Locale } from "../site-templates/types";
import { OG_IMAGE, data } from "./data";
import { LOCALE_LIST, localeHrefs, routePath, type Route } from "./routes";

/** Адрес сайта без «/» на конце. */
export const SITE_URL = siteConfig.siteUrl.replace(/\\/+$/, "");

if (/example\\.com/.test(SITE_URL)) {
  console.warn("[site] В site.config.ts не задан siteUrl (сейчас " + SITE_URL + "): canonical, og:image и sitemap будут указывать на example.com.");
}
if (siteConfig.telegram === "${TELEGRAM_PLACEHOLDER}") {
  console.warn("[site] В site.config.ts не задан telegram: заявки гостей уходят на t.me/${TELEGRAM_PLACEHOLDER}, а не владельцу.");
}

const OG_LOCALE: Record<Locale, string> = { ru: "ru_RU", en: "en_US", uz: "uz_UZ" };
const HTML_LANG: Record<Locale, string> = { ru: "ru", en: "en", uz: "uz-Latn" };
const ADMIN_TITLE: L = { ru: "кабинет владельца", en: "owner dashboard", uz: "egasining kabineti" };

export const htmlLang = (locale: Locale): string => HTML_LANG[locale];

/** Абсолютные адреса страницы на всех включённых языках (для hreflang и sitemap). */
export function languageUrls(): Record<string, string> {
  const hrefs = localeHrefs(false);
  return Object.fromEntries(LOCALE_LIST.map((l) => [htmlLang(l), SITE_URL + hrefs[l]]));
}

export function buildMetadata(route: Route): Metadata {
  const { locale, admin } = route;
  const icons = { icon: "/favicon.svg" };
  if (admin) {
    // Кабинет — рабочий экран владельца, в поиск ему не нужно.
    return { title: \`\${data.name} — \${pick(ADMIN_TITLE, locale)}\`, robots: { index: false, follow: false }, icons };
  }
  const tagline = pick(data.tagline, locale);
  const title = \`\${data.name} — \${tagline}\`;
  const description = \`\${tagline} \${pick(data.address, locale)}. \${data.phone.display}\`;
  const url = SITE_URL + routePath(route);
  const image = { url: SITE_URL + OG_IMAGE, width: 1200, height: 630, alt: data.name };
  return {
    metadataBase: new URL(SITE_URL),
    title,
    description,
    robots: { index: true, follow: true },
    alternates: { canonical: url, languages: { ...languageUrls(), "x-default": SITE_URL + routePath({ locale: LOCALE_LIST[0], admin: false }) } },
    openGraph: { type: "website", siteName: data.name, title, description, url, locale: OG_LOCALE[locale], images: [image] },
    twitter: { card: "summary_large_image", title, description, images: [image.url] },
    icons,
  };
}
`;
}

export function layoutTsx() {
  return `import "../base.css";
import { htmlLang } from "../../site/seo";
import { DEFAULT_LOCALE, parseRoute } from "../../site/routes";

/** Корневой макет: язык документа берётся из адреса (/ — основной язык, /en/, /uz/). */
export default async function RootLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang?: string[] }> }) {
  const { lang } = await params;
  const locale = parseRoute(lang)?.locale ?? DEFAULT_LOCALE;
  return (
    <html lang={htmlLang(locale)}>
      <body>{children}</body>
    </html>
  );
}
`;
}

export function pageTsx({ withAdmin }) {
  return `import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { allSegments, localeHrefs, parseRoute, routePath } from "../../site/routes";
import { buildMetadata } from "../../site/seo";
import { ${withAdmin ? "renderAdmin, " : ""}renderSite } from "../../site/template";

// Сайт полностью статический: собираются только страницы из generateStaticParams, остальное — 404.
export const dynamicParams = false;

interface PageProps {
  params: Promise<{ lang?: string[] }>;
}

export function generateStaticParams() {
  return allSegments().map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const route = parseRoute((await params).lang);
  return route ? buildMetadata(route) : {};
}

export default async function Page({ params }: PageProps) {
  const route = parseRoute((await params).lang);
  if (!route) notFound();
${withAdmin ? `  if (route.admin) {
    return renderAdmin({ locale: route.locale, localeHrefs: localeHrefs(true), siteHref: routePath({ locale: route.locale, admin: false }) });
  }
` : ""}  return renderSite({ locale: route.locale, localeHrefs: localeHrefs(false) });
}
`;
}

export function robotsTs({ withAdmin }) {
  return `import type { MetadataRoute } from "next";
import { LOCALE_LIST, routePath } from "../site/routes";
import { SITE_URL } from "../site/seo";

export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  ${withAdmin ? `// Кабинет владельца в поиск не нужен.
  const disallow = LOCALE_LIST.map((locale) => routePath({ locale, admin: true }));
  return { rules: { userAgent: "*", allow: "/", disallow }, sitemap: \`\${SITE_URL}/sitemap.xml\` };` : `return { rules: { userAgent: "*", allow: "/" }, sitemap: \`\${SITE_URL}/sitemap.xml\` };`}
}
`;
}

export function sitemapTs() {
  return `import type { MetadataRoute } from "next";
import { LOCALE_LIST, routePath } from "../site/routes";
import { SITE_URL, languageUrls } from "../site/seo";

export const dynamic = "force-static";

/** Только публичные страницы по одной на язык; кабинет в карту сайта не входит. */
export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date().toISOString().slice(0, 10);
  return LOCALE_LIST.map((locale) => ({
    url: SITE_URL + routePath({ locale, admin: false }),
    lastModified,
    alternates: { languages: languageUrls() },
  }));
}
`;
}

/** Tailwind preflight без `--theme()` в @layer base: шаблоны разрабатывались под него (ADR 0007/0009). */
export function baseCss(repoRoot) {
  const file = path.join(repoRoot, "node_modules/tailwindcss/preflight.css");
  if (!fs.existsSync(file)) throw new Error("Не найден node_modules/tailwindcss/preflight.css: запустите `npm install` в корне студии.");
  const preflight = fs
    .readFileSync(file, "utf8")
    .replace(/--theme\(\s*--[\w-]+\s*,\s*([^)]*?)\s*\)/g, (_, fallback) => fallback.replace(/\s*\n\s*/g, " "));
  if (preflight.includes("--theme(")) throw new Error("preflight.css: остались вызовы --theme(), разбор не удался");
  return `/*
 * Базовый сброс стилей. Это Tailwind preflight (значения --theme() подставлены вручную), обёрнутый в
 * @layer base: стили шаблона из public/templates/*.css без слоя всегда сильнее него, как и на сайте студии.
 */
@layer base {
${preflight}
}

body {
  background: #f5f7fa;
  color: #1c2130;
  -webkit-font-smoothing: antialiased;
}

/* Видимый фокус для клавиатуры; шаблон может переопределить своими правилами. */
:where(a, button, input, select, textarea, summary, [tabindex]:not([tabindex="-1"])):focus-visible {
  outline: 2px solid #ffae5c;
  outline-offset: 2px;
  border-radius: 4px;
}
:focus:not(:focus-visible) {
  outline: none;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
  border-width: 0;
}
`;
}

export function faviconSvg(name) {
  const letter = String(name).trim().charAt(0).toUpperCase().replace(/[<>&"']/g, "") || "S";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#1c2130"/><text x="32" y="44" text-anchor="middle" font-family="system-ui, sans-serif" font-size="36" font-weight="700" fill="#ffae5c">${letter}</text></svg>\n`;
}

export function nextConfigMjs() {
  return `import { fileURLToPath } from "node:url";

/** @type {import("next").NextConfig} */
const nextConfig = {
  // Полностью статический сайт: после \`next build\` готовые файлы лежат в папке out/.
  output: "export",
  images: { unoptimized: true },
  // /en/ → en/index.html: так работает любой статический хостинг без настроек.
  trailingSlash: true,
  turbopack: { root: fileURLToPath(new URL(".", import.meta.url)) },
};

export default nextConfig;
`;
}

export function tsconfigJson() {
  return JSON.stringify(
    {
      compilerOptions: {
        target: "ES2017",
        lib: ["dom", "dom.iterable", "esnext"],
        allowJs: false,
        skipLibCheck: true,
        strict: true,
        noEmit: true,
        esModuleInterop: true,
        module: "esnext",
        moduleResolution: "bundler",
        resolveJsonModule: true,
        isolatedModules: true,
        jsx: "react-jsx",
        incremental: true,
        plugins: [{ name: "next" }],
      },
      include: ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts", ".next/dev/types/**/*.ts"],
      exclude: ["node_modules", "out"],
    },
    null,
    2,
  ) + "\n";
}

export function netlifyToml() {
  return `# Netlify: обычная статическая публикация папки out/ (без серверного рантайма Next.js).
[build]
  command = "npm run build"
  publish = "out"
`;
}

export function gitignore() {
  return `node_modules
.next
out
next-env.d.ts
*.tsbuildinfo
.DS_Store
`;
}
