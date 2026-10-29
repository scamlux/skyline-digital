/* eslint-disable @next/next/no-img-element -- шаблон переносимый (без next/image): адаптивные <img srcset> с готовыми webp */
import { LOCALES, pick, type Locale, type TemplateProps } from "../types";
import { BookingForm, HoursText, ItemPrice, ItemRow, OpenStatus, PageView, PromoBar, StickyBar, TrackedLink } from "./client";
import type { RestaurantData } from "./data";
import { restaurantUi as ui } from "./ui";

// CSS лежит в public/, а не импортируется: импортированный .css Turbopack добавляет во все
// маршруты сайта (ADR 0007), а шаблону нужно оставаться переносимым (ADR 0009).
const TEMPLATE_CSS = "/templates/restaurant.css";
// Прелоадим только то, чем набран первый экран: у стиля A заголовки — Literata, у B всё — Onest.
const FONT_PRELOAD = {
  a: ["/templates/fonts/literata-latin.woff2", "/templates/fonts/literata-cyrillic.woff2"],
  b: ["/templates/fonts/onest-latin.woff2", "/templates/fonts/onest-cyrillic.woff2"],
} as const;

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
  // Ширины файлов в public/templates/restaurant/img (<имя>-<ширина>.webp). Нужные есть не у каждого кадра:
  // 240 — миниатюры блюд и галерея, 720/800 — только hero.
  type W = 240 | 480 | 720 | 800 | 960 | 1280;
  const img = (base: string, w: W) => `/templates/restaurant/img/${base}-${w}.webp`;
  const srcSet = (base: string, sizes: W[]) => sizes.map((w) => `${img(base, w)} ${w}w`).join(", ");
  // Hero: в A — половина экрана на десктопе; в B — фон на всю ширину под тёмной вуалью,
  // поэтому на телефоне хватает файла по ширине экрана (его кадрирует object-fit).
  const heroSizes = style === "b" ? "100vw" : "(max-width: 760px) calc(100vw - 40px), 50vw";

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
      {FONT_PRELOAD[style].map((href) => (
        <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
      ))}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="tpl-head">
        <a href="#top" className="tpl-logo" aria-label={data.name}>
          {data.name}
        </a>
        <nav className="tpl-nav" aria-label={t(ui.navLabel)}>
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
        <PageView />
        <PromoBar text={t(data.promo)} locale={locale} />
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
          <figure className="tpl-hero-photo">
            <img
              src={img(data.photos.hero, 960)}
              srcSet={srcSet(data.photos.hero, [480, 720, 800, 960, 1280])}
              sizes={heroSizes}
              width={1280}
              height={853}
              alt=""
              fetchPriority="high"
              decoding="async"
            />
          </figure>
        </section>

        <div className="tpl-orn" aria-hidden="true" />

        <section className="tpl-sec" id={menuId} aria-labelledby="menu-title">
          <div className="tpl-sec-head">
            <h2 id="menu-title">{t(ui.menuTitle)}</h2>
            <p>{t(ui.menuHint)}</p>
          </div>
          <nav className="tpl-chips" aria-label={t(ui.menuNavLabel)}>
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
                    return (
                      <ItemRow key={it.id} id={it.id} available={it.available !== false}>
                        {it.photo && (
                          <img
                            className="tpl-item-img"
                            src={img(it.photo, 480)}
                            srcSet={srcSet(it.photo, [240, 480])}
                            sizes="(max-width: 760px) 88px, 112px"
                            width={480}
                            height={360}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        <div className="tpl-item-top">
                          <span className="tpl-item-name">{t(it.name)}</span>
                          <span className="tpl-leader" aria-hidden="true" />
                          <ItemPrice id={it.id} price={it.price} available={it.available !== false} unavailableLabel={t(ui.unavailable)} locale={locale} />
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
                      </ItemRow>
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
            <TrackedLink type="telegram" className="tpl-btn" href={`https://t.me/${data.telegram}`} external>
              {t(ui.orderTelegram)}
            </TrackedLink>
            {data.delivery.map((d) => (
              <a key={d.name} className="tpl-btn ghost" href={d.url} {...ext(d.url)}>
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
          <div className="tpl-about-media">
            <img
              src={img(data.photos.about, 960)}
              srcSet={srcSet(data.photos.about, [480, 960])}
              sizes="(max-width: 760px) 100vw, 40vw"
              width={960}
              height={640}
              alt=""
              loading="lazy"
              decoding="async"
            />
            <div className="tpl-gallery" aria-hidden="true">
              {data.photos.gallery.map((g) => (
                <img key={g} src={img(g, 480)} srcSet={srcSet(g, [240, 480, 960])} sizes="(max-width: 760px) 30vw, 13vw" width={480} height={480} alt="" loading="lazy" decoding="async" />
              ))}
            </div>
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
              <TrackedLink type="route" className="tpl-link" href={data.mapUrl} external={/^https?:/.test(data.mapUrl)}>
                {t(ui.route)} →
              </TrackedLink>
            </div>
            <div>
              <h3>{t(ui.hoursTitle)}</h3>
              <p>
                {t(ui.hoursLabel)}
                <br />
                <HoursText open={data.hours.open} close={data.hours.close} />
              </p>
            </div>
            <div>
              <h3>{t(ui.call)}</h3>
              <p>
                <TrackedLink type="call" className="tpl-link big" href={`tel:${data.phone.e164}`}>
                  {data.phone.display}
                </TrackedLink>
              </p>
              <TrackedLink type="telegram" className="tpl-link" href={`https://t.me/${data.telegram}`} external>
                @{data.telegram} →
              </TrackedLink>
            </div>
            <div>
              <h3>{t(ui.reviewsTitle)}</h3>
              <p>{t(ui.reviewsText)}</p>
              <p className="tpl-reviews">
                {data.reviews.map((r) => (
                  <a key={r.name} className="tpl-link" href={r.url} {...ext(r.url)}>
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

/** Внешняя ссылка открывается в новой вкладке; заглушка «#» (демо) — нет, иначе клик плодит копии страницы. */
const ext = (url: string) => (/^https?:/.test(url) ? { target: "_blank", rel: "noopener noreferrer" } : {});

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
