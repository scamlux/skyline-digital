import { formatSum, LOCALES, pick, type Locale, type TemplateProps } from "../types";
import { BookingForm, OpenStatus, StickyBar } from "./client";
import type { RestaurantData } from "./data";
import { restaurantUi as ui } from "./ui";

// CSS лежит в public/, а не импортируется: импортированный .css Turbopack добавляет во все
// маршруты сайта (ADR 0007), а шаблону нужно оставаться переносимым (ADR 0009).
const TEMPLATE_CSS = "/templates/restaurant.css";
const FONT_PRELOAD = ["/templates/fonts/literata-latin.woff2", "/templates/fonts/literata-cyrillic.woff2"];

/**
 * Шаблон «Ресторан». Сервер-компонент без зависимостей от остального сайта:
 * данные и тексты — из props, стили — public/templates/restaurant.css.
 * Два стиля (a/b) — одна разметка, разные токены и несколько структурных правил в CSS.
 *
 * Правила качества (docs/business/NICHE-SITES-RESEARCH-2026-10.md §4): ≤ 8 секций,
 * меню текстом (не PDF), «Забронировать» в шапке и внизу, телефон и Telegram в одно касание,
 * цели ≥ 44px, 3–4 поля в форме, без всплывающих окон.
 */
export function RestaurantSite({ data, locale, style, localeHrefs }: TemplateProps<RestaurantData>) {
  const t = (l: Parameters<typeof pick>[0]) => pick(l, locale);
  const menuId = "menu";

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name: data.name,
    servesCuisine: "Uzbek",
    telephone: data.phone.e164,
    address: t(data.address),
    openingHours: `Mo-Su ${data.hours.open}-${data.hours.close}`,
  };

  return (
    <div className="tpl" data-tpl="restaurant" data-style={style} lang={locale === "uz" ? "uz-Latn" : locale}>
      <link rel="stylesheet" href={TEMPLATE_CSS} precedence="default" />
      {FONT_PRELOAD.map((href) => (
        <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="tpl-head">
        <a href="#top" className="tpl-logo" aria-label={data.name}>
          {data.name}
        </a>
        <nav className="tpl-nav" aria-label={t(ui.nav.menu)}>
          <a href={`#${menuId}`}>{t(ui.nav.menu)}</a>
          <a href="#about">{t(ui.nav.about)}</a>
          <a href="#contacts">{t(ui.nav.contacts)}</a>
        </nav>
        <div className="tpl-head-r">
          <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
          <a className="tpl-btn sm" href="#book">
            {t(ui.bookShort)}
          </a>
        </div>
      </header>

      <main id="top">
        <section className="tpl-hero">
          <div className="tpl-hero-copy">
            <OpenStatus open={data.hours.open} close={data.hours.close} locale={locale} />
            <h1>{data.name}</h1>
            <p className="tpl-tagline">{t(data.tagline)}</p>
            <p className="tpl-intro">{t(data.intro)}</p>
            <div className="tpl-cta">
              <a className="tpl-btn" href="#book">
                {t(ui.book)}
              </a>
              <a className="tpl-btn ghost" href={`#${menuId}`}>
                {t(ui.seeMenu)}
              </a>
            </div>
          </div>
          <div className="tpl-plate" aria-hidden="true">
            <span className="r1" />
            <span className="r2" />
            <span className="r3" />
          </div>
        </section>

        <div className="tpl-orn" aria-hidden="true" />

        <section className="tpl-sec" id={menuId} aria-labelledby="menu-title">
          <div className="tpl-sec-head">
            <h2 id="menu-title">{t(ui.menuTitle)}</h2>
            <p>{t(ui.menuHint)}</p>
          </div>
          <nav className="tpl-chips" aria-label={t(ui.menuTitle)}>
            {data.menu.map((c) => (
              <a key={c.id} href={`#cat-${c.id}`}>
                {t(c.title)}
              </a>
            ))}
          </nav>
          <div className="tpl-card">
            {data.menu.map((c) => (
              <section key={c.id} id={`cat-${c.id}`} className="tpl-cat" aria-labelledby={`cat-${c.id}-t`}>
                <h3 id={`cat-${c.id}-t`}>{t(c.title)}</h3>
                <ul>
                  {c.items.map((it) => {
                    const out = it.available === false;
                    return (
                      <li key={t(it.name)} className="tpl-item" data-out={out || undefined}>
                        <div className="tpl-item-top">
                          <span className="tpl-item-name">{t(it.name)}</span>
                          <span className="tpl-leader" aria-hidden="true" />
                          <span className="tpl-item-price">{out ? t(ui.unavailable) : formatSum(it.price, locale)}</span>
                        </div>
                        {it.desc && <p className="tpl-item-desc">{t(it.desc)}</p>}
                        {(it.tags?.length ?? 0) > 0 && (
                          <p className="tpl-tags">
                            {it.tags!.map((tg) => (
                              <span key={tg} data-tag={tg}>
                                {t(ui.tags[tg])}
                              </span>
                            ))}
                          </p>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            ))}
          </div>
        </section>

        <section className="tpl-sec tpl-order" aria-labelledby="order-title">
          <div className="tpl-sec-head">
            <h2 id="order-title">{t(ui.deliveryTitle)}</h2>
            <p>{t(ui.deliveryText)}</p>
          </div>
          <div className="tpl-cta">
            <a className="tpl-btn" href={`https://t.me/${data.telegram}`} target="_blank" rel="noopener noreferrer">
              {t(ui.orderTelegram)}
            </a>
            {data.delivery.map((d) => (
              <a key={d.name} className="tpl-btn ghost" href={d.url} target="_blank" rel="noopener noreferrer">
                {d.name}
              </a>
            ))}
          </div>
        </section>

        <section className="tpl-sec tpl-about" id="about" aria-labelledby="about-title">
          <div className="tpl-about-copy">
            <h2 id="about-title">{t(data.about.title)}</h2>
            {data.about.paragraphs.map((p) => (
              <p key={t(p)}>{t(p)}</p>
            ))}
          </div>
          <dl className="tpl-facts">
            {data.about.facts.map((f) => (
              <div key={t(f.k)}>
                <dt>{t(f.k)}</dt>
                <dd>{t(f.v)}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="tpl-sec tpl-book" id="book" aria-labelledby="book-title">
          <div className="tpl-book-copy">
            <h2 id="book-title">{t(ui.form.title)}</h2>
            <p>{t(ui.form.lead)}</p>
          </div>
          <BookingForm mode={data.booking.mode} telegram={data.telegram} restaurant={data.name} locale={locale} />
        </section>

        <section className="tpl-sec tpl-contacts" id="contacts" aria-labelledby="contacts-title">
          <div className="tpl-sec-head">
            <h2 id="contacts-title">{t(ui.contactsTitle)}</h2>
          </div>
          <div className="tpl-contacts-grid">
            <div>
              <h3>{t(ui.addressLabel)}</h3>
              <p>{t(data.address)}</p>
              <a className="tpl-link" href={data.mapUrl} target="_blank" rel="noopener noreferrer">
                {t(ui.route)} →
              </a>
            </div>
            <div>
              <h3>{t(ui.hoursTitle)}</h3>
              <p>
                {t(ui.hoursLabel)}
                <br />
                <strong>
                  {data.hours.open}–{data.hours.close}
                </strong>
              </p>
            </div>
            <div>
              <h3>{t(ui.call)}</h3>
              <p>
                <a className="tpl-link big" href={`tel:${data.phone.e164}`}>
                  {data.phone.display}
                </a>
              </p>
              <a className="tpl-link" href={`https://t.me/${data.telegram}`} target="_blank" rel="noopener noreferrer">
                @{data.telegram} →
              </a>
            </div>
            <div>
              <h3>{t(ui.reviewsTitle)}</h3>
              <p>{t(ui.reviewsText)}</p>
              <p className="tpl-reviews">
                {data.reviews.map((r) => (
                  <a key={r.name} className="tpl-link" href={r.url} target="_blank" rel="noopener noreferrer">
                    {r.name} →
                  </a>
                ))}
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="tpl-foot">
        <span>© {data.name}</span>
        <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
      </footer>

      <StickyBar phone={data.phone.e164} telegram={data.telegram} locale={locale} />
    </div>
  );
}

function LangSwitch({ locale, hrefs, label }: { locale: Locale; hrefs: Record<Locale, string>; label: string }) {
  return (
    <nav className="tpl-lang" aria-label={label}>
      {LOCALES.map((l) => (
        <a key={l} href={hrefs[l]} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}>
          {l.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
