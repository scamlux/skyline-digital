/* eslint-disable @next/next/no-img-element -- шаблон переносимый (без next/image): адаптивные <img srcset> с готовыми webp */
import { Carousel } from "../kit/carousel";
import { MotionLayer } from "../kit/motion";
import { LOCALES, pick, type Locale, type TemplateProps } from "../types";
import { CartSheet } from "./Cart";
import { HeaderCart, OpenStatus, PageView, PromoBar, StickyBar, TrackedLink } from "./client-bits";
import type { CafeData } from "./data";
import { Almond, IconArrow, IconClock, IconPhone, IconPin, IconPlug, IconSend, IconStar, IconWifi } from "./icons";
import { LoyaltyCard } from "./Loyalty";
import { MenuSection, OptionsSheet, Showcase } from "./Menu";
import { Photo, SteamCup, imgSet, imgSrc } from "./media";
import { fill } from "./format";
import { cafeUi as ui } from "./ui";

// CSS лежит в public/, а не импортируется: импортированный .css Turbopack добавляет во все
// маршруты сайта (ADR 0007), а шаблону нужно оставаться переносимым (ADR 0009).
const TEMPLATE_CSS = "/templates/cafe.css";
// Весь интерфейс набран одним шрифтом Nunito (вариативный). Прелоадим только нужное первому экрану:
// для ru латиницу (логотип, цифры) и кириллицу, для en/uz — латиницу. Остальное подтянется по unicode-range.
const FONT_PRELOAD = { ru: ["/templates/fonts/nunito-latin.woff2", "/templates/fonts/nunito-cyrillic.woff2"], en: ["/templates/fonts/nunito-latin.woff2"], uz: ["/templates/fonts/nunito-latin.woff2"] } as const;

/**
 * Шаблон «Кафе / кофейня». Серверный компонент для первого экрана и статичных блоков; меню,
 * витрина, карта лояльности и шторка заказа — клиентские острова поверх демо-хранилища.
 * Два стиля (a/b) — одна разметка, разные токены и несколько структурных правил в CSS.
 *
 * Правила: заголовки до пяти слов, одна поясняющая строка на блок, фото вместо абзацев, опции —
 * чипами, цели ≥ 44px, «Заказать навынос» в первом экране и в липкой панели.
 */
export function CafeSite({ data, locale, style, localeHrefs }: TemplateProps<CafeData>) {
  const t = (l: Parameters<typeof pick>[0]) => pick(l, locale);
  const hero = data.hero[style];
  // На телефоне даём браузеру 480-й файл (≈17 КБ вместо 48 КБ) — быстрее LCP; на экранах с DPR ≥ 3 он сам возьмёт 960-й.
  // В B фото ещё и затемнено вуалью, потери резкости почти не видно.
  const heroSizes = style === "b" ? "(max-width: 860px) 260px, 100vw" : "(max-width: 860px) 240px, 52vw";
  const heroWidths = [480, 960, 1280] as (480 | 960 | 1280)[];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CafeOrCoffeeShop",
    name: data.name,
    servesCuisine: "Coffee",
    telephone: data.phone.e164,
    address: t(data.address),
    openingHours: `Mo-Su ${data.hours.open}-${data.hours.close}`,
  };

  const marquee = (hiddenCopy: boolean) => (
    <ul className="cf-marquee-set" aria-hidden={hiddenCopy || undefined}>
      {data.marquee.map((m) => (
        <li key={m.ru}>
          <Almond />
          {t(m)}
        </li>
      ))}
    </ul>
  );

  return (
    <div className="cf" data-tpl="cafe" data-style={style} lang={locale === "uz" ? "uz-Latn" : locale}>
      <link rel="stylesheet" href={TEMPLATE_CSS} precedence="default" />
      {FONT_PRELOAD[locale].map((href) => (
        <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
      ))}
      <link rel="preload" as="image" href={imgSrc(data.photos.hero, 960)} imageSrcSet={imgSet(data.photos.hero, heroWidths)} imageSizes={heroSizes} fetchPriority="high" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="cf-head">
        <a href="#top" className="cf-logo" aria-label={data.name}>
          <Almond />
          <span>{data.name}</span>
        </a>
        <nav className="cf-nav" aria-label={t(ui.navLabel)}>
          <a href="#menu">{t(ui.nav.menu)}</a>
          <a href="#card">{t(ui.nav.card)}</a>
          <a href="#contacts">{t(ui.nav.contacts)}</a>
        </nav>
        <div className="cf-head-r">
          <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
          <HeaderCart locale={locale} />
        </div>
      </header>

      <main id="top">
        <PageView />
        <section className="cf-hero" aria-labelledby="hero-title">
          <div className="cf-hero-art">
            <figure className="cf-hero-photo">
              <img src={imgSrc(data.photos.hero, 960)} srcSet={imgSet(data.photos.hero, heroWidths)} sizes={heroSizes} width={1280} height={853} alt="" fetchPriority="high" decoding="async" />
            </figure>
            <span className="cf-sticker s1">{t(data.stickers[style][0])}</span>
            <span className="cf-sticker s2">{t(data.stickers[style][1])}</span>
            <SteamCup />
          </div>
          <div className="cf-hero-copy">
            <OpenStatus open={data.hours.open} close={data.hours.close} locale={locale} />
            <h1 id="hero-title">{t(hero.title)}</h1>
            <p className="cf-lead">{t(hero.lead)}</p>
            <div className="cf-cta-row">
              <a className="cf-cta" href="#menu">
                {t(ui.order)}
                <IconArrow />
              </a>
              <a className="cf-ghost" href="#menu">
                {t(ui.seeMenu)}
              </a>
            </div>
          </div>
        </section>

        <div className="cf-marquee" aria-hidden="true" data-pausable>
          <div className="cf-marquee-track">
            {marquee(false)}
            {marquee(true)}
          </div>
        </div>

        <PromoBar fallback={data.promo} locale={locale} />
        <MenuSection locale={locale} />
        <Showcase locale={locale} />
        <LoyaltyCard locale={locale} />

        <section className="cf-sec cf-atmo" aria-label={t(ui.atmo.label)} data-reveal>
          <figure className="cf-atmo-ph a">
            <Photo name={data.photos.barista} widths={[480, 960]} src={480} width={960} height={1200} sizes="(max-width: 860px) 46vw, 24vw" loading="lazy" />
          </figure>
          <ul className="cf-atmo-tiles">
            <li>
              <IconWifi />
              <span>{t(ui.atmo.wifi)}</span>
            </li>
            <li>
              <IconPlug />
              <span>{t(ui.atmo.plugs)}</span>
            </li>
            <li>
              <IconClock />
              <span>{fill(t(ui.atmo.quiet), { a: data.quiet.from.replace(":00", ""), b: data.quiet.to.replace(":00", "") })}</span>
            </li>
            <li className="live">
              <OpenStatus open={data.hours.open} close={data.hours.close} locale={locale} className="cf-status tile" />
            </li>
          </ul>
          <figure className="cf-atmo-ph b">
            <Photo name={data.photos.interior} widths={[480, 960]} src={480} width={960} height={960} sizes="(max-width: 860px) 46vw, 24vw" loading="lazy" />
          </figure>
        </section>

        <section className="cf-sec cf-reviews" aria-labelledby="reviews-title" data-reveal>
          <div className="cf-sec-head">
            <h2 id="reviews-title">{t(ui.reviewsTitle)}</h2>
            <p>
              <span className="cf-demo-chip">{t(ui.reviewsDemo)}</span>
            </p>
          </div>
          <Carousel label={t(ui.reviewsLabel)} prevLabel={t(ui.prev)} nextLabel={t(ui.next)}>
            {data.reviews.map((r) => (
              <figure className="cf-review" key={r.name}>
                <span className="cf-stars" aria-hidden="true">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <IconStar key={i} />
                  ))}
                </span>
                <blockquote>{t(r.text)}</blockquote>
                <figcaption>
                  <b>{r.name}</b>
                  <small>{t(r.when)}</small>
                </figcaption>
              </figure>
            ))}
          </Carousel>
        </section>

        <section className="cf-sec cf-contacts" id="contacts" aria-labelledby="contacts-title" data-reveal>
          <div className="cf-sec-head">
            <h2 id="contacts-title">{t(ui.contactsTitle)}</h2>
          </div>
          <div className="cf-contacts-grid">
            <MapArt label={t(ui.mapLabel)} name={data.name} />
            <ul className="cf-contact-list">
              <li>
                <IconPin />
                <div>
                  <b>{t(data.address)}</b>
                  <TrackedLink type="route" className="cf-link" href={data.mapUrl} external={/^https?:/.test(data.mapUrl)}>
                    {t(ui.route)} <IconArrow />
                  </TrackedLink>
                </div>
              </li>
              <li>
                <IconClock />
                <div>
                  <b>{fill(t(ui.hoursStatic), { a: data.hours.open, b: data.hours.close })}</b>
                  <OpenStatus open={data.hours.open} close={data.hours.close} locale={locale} className="cf-status inline" />
                </div>
              </li>
              <li>
                <IconPhone />
                <div>
                  <TrackedLink type="call" className="cf-link big" href={`tel:${data.phone.e164}`}>
                    {data.phone.display}
                  </TrackedLink>
                </div>
              </li>
              <li>
                <IconSend />
                <div>
                  <TrackedLink type="telegram" className="cf-link big" href={`https://t.me/${data.telegram}`} external>
                    @{data.telegram}
                  </TrackedLink>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="cf-foot">
        <span>
          © {data.name} · {t(ui.demoNote)}
        </span>
        <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
      </footer>

      <StickyBar locale={locale} />
      <OptionsSheet locale={locale} />
      <CartSheet locale={locale} shop={data.name} telegram={data.telegram} hours={data.hours} mode={data.order.mode} />
      <MotionLayer />
    </div>
  );
}

function LangSwitch({ locale, hrefs, label }: { locale: Locale; hrefs: Record<Locale, string>; label: string }) {
  return (
    <nav className="cf-lang" aria-label={label}>
      {LOCALES.map((l) => (
        <a key={l} href={hrefs[l]} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}>
          {l.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}

/** Схема района: нарисованные улицы и булавка. Без внешних карт — ни трекеров, ни лишнего веса. */
function MapArt({ label, name }: { label: string; name: string }) {
  return (
    <figure className="cf-map" role="img" aria-label={label}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <rect width="400" height="300" fill="var(--map-bg)" />
        <path d="M-10 210 L120 190 L200 120 L300 100 L420 40" stroke="var(--map-road)" strokeWidth="16" fill="none" strokeLinecap="round" />
        <path d="M60 320 L110 200 L150 -10" stroke="var(--map-road)" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M250 320 L270 190 L330 -10" stroke="var(--map-road)" strokeWidth="10" fill="none" strokeLinecap="round" />
        <rect x="170" y="190" width="60" height="44" rx="10" fill="var(--map-park)" />
        <rect x="300" y="200" width="70" height="60" rx="12" fill="var(--map-park)" />
        <circle cx="206" cy="128" r="30" fill="var(--map-pin)" opacity="0.18" />
      </svg>
      <span className="cf-map-pin">
        <IconPin />
        <b>{name}</b>
      </span>
    </figure>
  );
}
