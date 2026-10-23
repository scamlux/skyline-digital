import { preload } from "react-dom";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { CONTACTS, CONTACT_LINKS, telegramHandle } from "@/lib/contact";
import { getBrandAccent } from "@/lib/site/active";
import { BRAND_ACCENTS } from "@/lib/site/version";
import { RefCursor } from "./ref/RefCursor";
import { RefLocales } from "./ref/RefLocales";
import { RefNav } from "./ref/RefNav";
import { RefPreloader } from "./ref/RefPreloader";

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

const CONTACT_ITEMS = [
  { href: CONTACT_LINKS.email, label: CONTACTS.email },
  { href: CONTACT_LINKS.phone, label: CONTACTS.phoneDisplay },
  { href: CONTACT_LINKS.telegram, label: telegramHandle, external: true },
];

/**
 * Каркас Референса (award-style тёмный). Обёртка `data-site="ref"` задаёт
 * шрифт, токены и акцент бренда; всё остальное — в ref.css под этим скоупом.
 * Прелоадер, курсор и меню — клиентские острова, контент страниц остаётся серверным.
 */
export async function RefChrome({ children }: { children: React.ReactNode }) {
  const [t, tf, th, accentKey] = await Promise.all([
    getTranslations("nav"),
    getTranslations("footer"),
    getTranslations("home.ref"),
    getBrandAccent(),
  ]);
  const accent = BRAND_ACCENTS[accentKey];
  const year = new Date().getFullYear();
  for (const href of ONEST_PRELOAD) preload(href, { as: "font", type: "font/woff2", crossOrigin: "" });

  const items = NAV.map((n) => ({ href: n.href, label: t(n.key) }));

  return (
    <div data-site="ref" style={{ "--acc": accent.acc, "--acc-ink": accent.ink } as React.CSSProperties}>
      {/* React 19 поднимает stylesheet с precedence в <head> и ждёт его загрузки до показа. */}
      <link rel="stylesheet" href={REF_CSS} precedence="default" />
      <RefPreloader
        words={th.raw("preWords") as string[]}
        labels={{ skip: th("skip"), loading: th("loading") }}
      />
      <RefCursor />
      <div className="r-grid" aria-hidden="true" />
      <div className="r-grain" aria-hidden="true" />

      <RefNav
        items={items}
        labels={{ menu: t("menu"), close: th("close"), calc: th("calc"), home: th("home") }}
        contacts={CONTACT_ITEMS}
      />

      <main>{children}</main>

      <footer className="r-foot">
        <div className="big" aria-hidden="true">
          SKYLINE
        </div>
        <div className="cols">
          <div style={{ maxWidth: "40ch" }}>
            <h5>Skyline Digital</h5>
            <p style={{ color: "var(--r-dim)", fontSize: 14, lineHeight: 1.6, margin: 0 }}>{tf("tagline")}</p>
          </div>
          <div>
            <h5>{th("footNav")}</h5>
            {items.map((n) => (
              <Link key={n.href} href={n.href}>
                {n.label}
              </Link>
            ))}
          </div>
          <div>
            <h5>{tf("contact")}</h5>
            {CONTACT_ITEMS.map((c) => (
              <a key={c.href} href={c.href} {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                {c.label}
              </a>
            ))}
          </div>
        </div>
        <div className="copy">
          <span>
            © {year} Skyline Digital · {tf("location")}
          </span>
          <RefLocales />
        </div>
      </footer>
    </div>
  );
}
