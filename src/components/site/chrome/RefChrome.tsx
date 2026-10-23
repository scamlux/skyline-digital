import { preload } from "react-dom";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CONTACTS, CONTACT_LINKS, telegramHandle } from "@/lib/contact";
import { getBrandAccent } from "@/lib/site/active";
import { BRAND_ACCENTS } from "@/lib/site/version";
import { RefLocales } from "./ref/RefLocales";

// Стили и шрифт варианта лежат в public/ и подключаются при рендере, а не импортом:
// импортированный .css Turbopack добавляет во все маршруты, включая старый дизайн.
const REF_CSS = "/variants/ref.css";
const ONEST_PRELOAD = ["/fonts/onest/onest-latin.woff2", "/fonts/onest/onest-cyrillic.woff2"];

const NAV = [
  { href: "/services", key: "services" },
  { href: "/projects", key: "projects" },
  { href: "/audit", key: "audit" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

/**
 * Каркас Референса (award-style тёмный). Обёртка `data-site="ref"` задаёт
 * шрифт, токены и акцент бренда; всё остальное — в ref.css под этим скоупом.
 * Пока без preloader/курсора/полноэкранного меню — они в следующем шаге фазы 1.
 */
export async function RefChrome({ children }: { children: React.ReactNode }) {
  const [t, tf, accentKey] = await Promise.all([
    getTranslations("nav"),
    getTranslations("footer"),
    getBrandAccent(),
  ]);
  const accent = BRAND_ACCENTS[accentKey];
  const year = new Date().getFullYear();
  for (const href of ONEST_PRELOAD) preload(href, { as: "font", type: "font/woff2", crossOrigin: "" });

  return (
    <div data-site="ref" style={{ "--acc": accent.acc, "--acc-ink": accent.ink } as React.CSSProperties}>
      {/* React 19 поднимает stylesheet с precedence в <head> и ждёт его загрузки до показа. */}
      <link rel="stylesheet" href={REF_CSS} precedence="default" />
      <div className="r-grid" aria-hidden="true" />
      <header className="r-head">
        <Link href="/" className="r-logo" aria-label="Skyline Digital">
          skyline<i>.</i>digital
        </Link>
        <nav className="r-nav" aria-label={t("menu")}>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {t(n.key)}
            </Link>
          ))}
        </nav>
        <div className="r-headr">
          <RefLocales />
          <Link href="/contact" className="r-btn">
            {t("contactUs")}
          </Link>
        </div>
      </header>

      <main>{children}</main>

      <footer className="r-foot">
        <div>
          <div className="r-logo">
            skyline<i>.</i>digital
          </div>
          <p style={{ maxWidth: "42ch", lineHeight: 1.6, marginTop: 14 }}>{tf("tagline")}</p>
        </div>
        <div>
          <h5>{tf("contact")}</h5>
          <a href={CONTACT_LINKS.email}>{CONTACTS.email}</a>
          <a href={CONTACT_LINKS.phone}>{CONTACTS.phoneDisplay}</a>
          <a href={CONTACT_LINKS.telegram} target="_blank" rel="noopener noreferrer">
            {telegramHandle}
          </a>
        </div>
        <div>
          <h5>{t("menu")}</h5>
          {NAV.map((n) => (
            <Link key={n.href} href={n.href}>
              {t(n.key)}
            </Link>
          ))}
        </div>
        <div className="r-copy">
          © {year} Skyline Digital · {tf("location")}
        </div>
      </footer>
    </div>
  );
}
