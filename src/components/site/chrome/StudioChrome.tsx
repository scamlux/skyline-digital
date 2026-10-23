import { preload } from "react-dom";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CONTACTS, CONTACT_LINKS, telegramHandle } from "@/lib/contact";
import { getBrandAccent } from "@/lib/site/active";
import { BRAND_ACCENTS } from "@/lib/site/version";
import { Locales } from "./shared/Locales";
import { Preloader } from "./shared/Preloader";
import { StudioFx } from "./studio/StudioFx";
import { StudioNav } from "./studio/StudioNav";

// Как у Референса: стили в public/ и подключаются рендером, чтобы не попасть в старый дизайн.
const SHARED_CSS = "/variants/shared.css";
const STUDIO_CSS = "/variants/studio.css";
const ONEST_PRELOAD = ["/fonts/onest/onest-latin.woff2", "/fonts/onest/onest-cyrillic.woff2"];

const NAV = [
  { href: "/services", key: "services" },
  { href: "/projects", key: "projects" },
  { href: "/audit", key: "audit" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

/**
 * Каркас Studio (светлые «панели» на тёмном фоне, один шрифт Onest, акцент из настроек).
 * Обёртка `data-site="studio"`; остров-навигация, прелоадер и эффекты — клиентские острова.
 */
export async function StudioChrome({ children }: { children: React.ReactNode }) {
  const [t, tf, tr, ts, accentKey] = await Promise.all([
    getTranslations("nav"),
    getTranslations("footer"),
    getTranslations("home.ref"),
    getTranslations("home.studio"),
    getBrandAccent(),
  ]);
  const accent = BRAND_ACCENTS[accentKey];
  const year = new Date().getFullYear();
  for (const href of ONEST_PRELOAD) preload(href, { as: "font", type: "font/woff2", crossOrigin: "" });

  const items = NAV.map((n) => ({ href: n.href, label: t(n.key) }));

  return (
    <div data-site="studio" style={{ "--acc": accent.acc, "--acc-ink": accent.ink } as React.CSSProperties}>
      <link rel="stylesheet" href={SHARED_CSS} precedence="default" />
      <link rel="stylesheet" href={STUDIO_CSS} precedence="default" />
      <Preloader words={tr.raw("preWords") as string[]} labels={{ skip: tr("skip"), loading: tr("loading") }} />
      <StudioFx />
      <StudioNav
        items={items}
        labels={{ menu: t("menu"), close: tr("close"), calc: tr("calc"), calcFull: t("calculate"), home: tr("home") }}
      />

      <main>{children}</main>

      <footer className="foot">
        <div className="wrap inr">
          <div className="foot-top">
            <div>
              <div className="big">
                <i aria-hidden="true" />
                Skyline
              </div>
              <p className="tg">{tf("tagline")}</p>
            </div>
            <div>
              <h5>{ts("sections")}</h5>
              {items.map((n) => (
                <Link key={n.href} href={n.href}>
                  {n.label}
                </Link>
              ))}
            </div>
            <div>
              <h5>{tf("contact")}</h5>
              <a href={CONTACT_LINKS.email}>{CONTACTS.email}</a>
              <a href={CONTACT_LINKS.phone}>{CONTACTS.phoneDisplay}</a>
              <a href={CONTACT_LINKS.telegram} target="_blank" rel="noopener noreferrer">
                {telegramHandle}
              </a>
            </div>
          </div>
          <div className="copybar">
            <span>
              © {year} Skyline Digital · {tf("location")}
            </span>
            <Locales />
          </div>
        </div>
      </footer>
    </div>
  );
}
