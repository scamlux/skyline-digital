/* eslint-disable @next/next/no-img-element -- шаблон переносимый (без next/image): адаптивные <img srcset> с готовыми webp */
import { RatingLine, ReviewAuthor } from "../kit/client-content";
import { MotionLayer } from "../kit/motion";
import { LOCALES, pick, type L, type Locale, type StyleId, type TemplateProps } from "../types";
import { BookingSheet } from "./Booking";
import { buildCatalog } from "./catalog";
import { ActionBar, BookButton, CtaWatcher, MasterCards, NextWindowChip, OpenStatus, PageView, PromoStrip, TrackedLink } from "./client-bits";
import { SalonProvider } from "./context";
import type { SalonData, SectionCopy } from "./data";
import { Icon } from "./icons";
import { Lookbook } from "./Lookbook";
import { Quiz } from "./Quiz";
import { ServicesPicker } from "./Services";
import { salonUi as ui } from "./ui";

// CSS лежит в public/, а не импортируется: импортированный .css Turbopack добавляет во все
// маршруты сайта (ADR 0007), а шаблону нужно оставаться переносимым (ADR 0009).
const TEMPLATE_CSS = "/templates/salon.css";
const IMG = "/templates/salon/img";

/**
 * Шрифт заголовка первого экрана: A — Oswald (плотный, узкий), B — Cormorant (антиква). Текст
 * hero набран им, поэтому грузим его заранее; Onest для основного текста подтянется сам.
 */
const FONT_PRELOAD = (style: StyleId, locale: Locale): string[] => {
  const family = style === "a" ? "oswald" : "cormorant";
  // Заголовок hero набран одним алфавитом: кириллица для ru, латиница для en/uz. Второй файл первому экрану не нужен.
  const scripts = locale === "ru" ? ["cyrillic"] : ["latin"];
  return scripts.map((sc) => `/templates/fonts/${family}-${sc}.woff2`);
};

type W = 480 | 640 | 960 | 1280 | 1600;
const img = (base: string, w: W) => `${IMG}/${base}-${w}.webp`;
const srcSet = (base: string, widths: W[]) => widths.map((w) => `${img(base, w)} ${w}w`).join(", ");

/** Секция: номер (виден только в стиле A), заголовок до пяти слов и одна короткая строка. */
function Section({ id, n, copy, locale, className, line, children }: { id: string; n: number; copy: SectionCopy; locale: Locale; className?: string; line?: React.ReactNode; children: React.ReactNode }) {
  const t = (l: L) => pick(l, locale);
  return (
    <section className={`sl-sec${className ? ` ${className}` : ""}`} id={id} aria-labelledby={`${id}-title`}>
      <header className="sl-sec-head" data-reveal>
        <span className="sl-num" aria-hidden="true">
          {String(n).padStart(2, "0")}
        </span>
        <h2 id={`${id}-title`}>{t(copy.title)}</h2>
        {line === undefined ? <p>{t(copy.line)}</p> : line}
      </header>
      {children}
    </section>
  );
}

/**
 * Шаблон «Салон». Сервер-компонент без зависимостей от остального сайта: данные и тексты из props,
 * стили public/templates/salon.css. Это два разных сайта на одной разметке:
 * A «USTARA Barbershop» (тёмный, латунь, жёсткие грани, нумерованные секции, мужской клуб) и
 * B «Nafis Beauty» (светлый, сливочный, антиква, мягкие формы, женский салон).
 *
 * Скорость: контент первого экрана никогда не прячется (LCP заголовок или фото hero с preload),
 * анимируются только transform/opacity, живые анимации стартуют после первой отрисовки (data-live),
 * ставятся на паузу вне экрана и в фоновой вкладке; без canvas и WebGL; при prefers-reduced-motion
 * страница статична.
 */
export function SalonSite({ data, locale, style, localeHrefs, mode = "demo", client }: TemplateProps<SalonData>) {
  const t = (l: L) => pick(l, locale);
  // Режим "client": вымышленные отзывы, акция и демо-пометки из data не показываются, только настоящее из client.
  const demoMode = mode === "demo";
  const catalog = buildCatalog(demoMode ? data : { ...data, booking: { mode: "telegram" }, promo: client?.promo ?? { ru: "", en: "", uz: "" } }, locale);
  const reviews = demoMode ? data.reviews : (client?.reviews ?? []);
  const rating = demoMode ? undefined : client?.rating;
  const showReviews = reviews.length > 0 || !!rating;
  const promoText = demoMode ? t(data.promo) : client?.promo ? t(client.promo) : "";
  const hero = data.hero.photo;
  const heroWidths = hero.widths as W[];
  const heroDefault = (heroWidths.includes(640) ? 640 : 960) as W;
  const heroSizes = style === "a" ? "100vw" : "(max-width: 860px) 80vw, 520px";
  const heroLabel = `${t(data.hero.line1)} ${t(data.hero.line2)}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": data.kind,
    name: data.name,
    telephone: data.phone.e164,
    address: t(data.address),
    openingHours: `Mo-Su ${data.hours.open}-${data.hours.close}`,
  };

  return (
    <div className="sl" data-tpl="salon" data-style={style} lang={locale === "uz" ? "uz-Latn" : locale}>
      <link rel="stylesheet" href={TEMPLATE_CSS} precedence="default" />
      {FONT_PRELOAD(style, locale).map((href) => (
        <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
      ))}
      <link rel="preload" as="image" href={img(hero.base, heroDefault)} imageSrcSet={srcSet(hero.base, heroWidths)} imageSizes={heroSizes} fetchPriority="high" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <SalonProvider catalog={catalog}>
        <header className="sl-head">
          <a href="#top" className="sl-logo" aria-label={data.name}>
            <span className="sl-logo-main">{data.brand.main}</span>
            <span className="sl-logo-sub">{data.brand.sub}</span>
          </a>
          <nav className="sl-nav" aria-label={t(ui.navLabel)}>
            <a href="#looks">{t(ui.nav.looks)}</a>
            <a href="#services">{t(ui.nav.services)}</a>
            <a href="#masters">{t(ui.nav.masters)}</a>
            <a href="#contacts">{t(ui.nav.contacts)}</a>
          </nav>
          <div className="sl-head-r">
            <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
            <BookButton className="sl-btn sl-head-book" />
          </div>
        </header>

        <main id="top">
          <PageView />
          <CtaWatcher />
          <section className="sl-hero" aria-labelledby="hero-title" data-pointer data-pausable>
            <figure className="sl-hero-photo">
              <img src={img(hero.base, heroDefault)} srcSet={srcSet(hero.base, heroWidths)} sizes={heroSizes} width={hero.w} height={hero.h} alt="" fetchPriority="high" decoding="async" />
            </figure>
            <div className="sl-hero-copy">
              <OpenStatus open={data.hours.open} close={data.hours.close} locale={locale} />
              <h1 id="hero-title" aria-label={heroLabel}>
                <span className="sl-line l1">{t(data.hero.line1)}</span> <span className="sl-line l2">{t(data.hero.line2)}</span>
              </h1>
              <p className="sl-hero-line">{t(data.hero.line)}</p>
              <div className="sl-cta">
                <BookButton id="hero-cta" className="sl-btn sl-btn-big" />
                <NextWindowChip />
              </div>
              <ul className="sl-perks">
                {data.place.chips.slice(0, 3).map((c) => (
                  <li key={c.label.ru}>
                    <Icon id={c.icon} size={18} />
                    {t(c.label)}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <PromoStrip text={promoText} locale={locale} />

          <Section id="looks" n={1} copy={data.copy.looks} locale={locale} className="sl-sec-wide">
            <Lookbook />
          </Section>

          <Section id="services" n={2} copy={data.copy.services} locale={locale}>
            <ServicesPicker />
            {demoMode && <p className="sl-demo-note">{t(ui.demoTag)}</p>}
          </Section>

          <Section id="quiz" n={3} copy={data.copy.quiz} locale={locale} className="sl-quiz-sec">
            <Quiz />
          </Section>

          <Section id="masters" n={4} copy={data.copy.masters} locale={locale} className="sl-sec-wide">
            <MasterCards />
          </Section>

          <Section id="place" n={5} copy={data.copy.place} locale={locale} className="sl-place-sec">
            <div className="sl-place" data-ratio={data.place.photo.ratio} data-reveal>
              <img
                src={img(data.place.photo.base, data.place.photo.widths.includes(960) ? 960 : (data.place.photo.widths[0] as W))}
                srcSet={srcSet(data.place.photo.base, data.place.photo.widths as W[])}
                sizes={data.place.photo.ratio === "wide" ? "100vw" : "(max-width: 860px) 86vw, 480px"}
                width={data.place.photo.w}
                height={data.place.photo.h}
                alt={t(data.place.alt)}
                loading="lazy"
                decoding="async"
              />
              <ul className="sl-place-chips">
                {data.place.chips.map((c) => (
                  <li key={c.label.ru}>
                    <Icon id={c.icon} size={22} />
                    <span>{t(c.label)}</span>
                  </li>
                ))}
              </ul>
            </div>
          </Section>

          {showReviews && (
            <Section
              id="reviews"
              n={6}
              copy={data.copy.reviews}
              locale={locale}
              line={
                demoMode ? undefined : rating ? (
                  <p>
                    <RatingLine rating={rating} locale={locale} />
                  </p>
                ) : null
              }
            >
              {reviews.length > 0 && (
                <ul className="sl-reviews sl-snap" aria-label={t(ui.reviews.label)}>
                  {reviews.map((r) => (
                    <li key={r.name} className="sl-review">
                      {demoMode && (
                        <p className="sl-stars" role="img" aria-label={t(ui.reviews.stars)}>
                          ★★★★★
                        </p>
                      )}
                      <blockquote>{t(r.text)}</blockquote>
                      <p className="sl-review-who">
                        <b>
                          <ReviewAuthor name={r.name} url={"url" in r ? r.url : undefined} />
                        </b>
                        {"service" in r && <> · {t(r.service)}</>}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </Section>
          )}

          <Section id="faq" n={showReviews ? 7 : 6} copy={data.copy.faq} locale={locale} className="sl-faq">
            <div className="sl-faq-list" data-reveal>
              {data.faq.map((x) => (
                <details key={x.q.ru} name="faq">
                  <summary>{t(x.q)}</summary>
                  <p>{t(x.a)}</p>
                </details>
              ))}
            </div>
          </Section>

          <section className="sl-final" aria-labelledby="cta-title" data-reveal>
            <h2 id="cta-title">{t(data.copy.cta.title)}</h2>
            <p>{t(data.copy.cta.line)}</p>
            <BookButton className="sl-btn sl-btn-big" />
          </section>

          <Section id="contacts" n={showReviews ? 8 : 7} copy={data.copy.contacts} locale={locale}>
            <div className="sl-contacts-grid" data-reveal>
              <ul className="sl-contacts-list">
                <li>
                  <Icon id="pin" size={22} />
                  <div>
                    <p>{t(data.address)}</p>
                    <TrackedLink type="route" className="sl-link" href={data.mapUrl} external={/^https?:/.test(data.mapUrl)}>
                      {t(ui.contacts.route)} →
                    </TrackedLink>
                  </div>
                </li>
                <li>
                  <Icon id="clock" size={22} />
                  <p>{t(ui.contacts.hoursValue).replace("{a}", data.hours.open).replace("{b}", data.hours.close)}</p>
                </li>
                <li>
                  <Icon id="phone" size={22} />
                  <TrackedLink type="call" className="sl-link big" href={`tel:${data.phone.e164}`}>
                    {data.phone.display}
                  </TrackedLink>
                </li>
                <li>
                  <Icon id="telegram" size={22} />
                  <TrackedLink type="telegram" className="sl-link" href={`https://t.me/${data.telegram}`} external>
                    @{data.telegram} →
                  </TrackedLink>
                </li>
              </ul>
              <MapCard label={t(demoMode ? ui.contacts.map : ui.contacts.mapClient)} />
            </div>
          </Section>
          <MotionLayer />
        </main>

        <footer className="sl-foot">
          <span>© {data.name}</span>
          <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
        </footer>
        <BookingSheet />
        <ActionBar phone={data.phone.e164} telegram={data.telegram} locale={locale} />
      </SalonProvider>
    </div>
  );
}

/** Схематичная карта района (вымышленная): дороги и пульсирующая метка. Демо — без внешних карт. */
function MapCard({ label }: { label: string }) {
  return (
    <div className="sl-map" role="img" aria-label={label} data-pausable>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <rect width="400" height="300" className="m-bg" />
        <path className="m-park" d="M250 30h110v70H250z" />
        <path className="m-river" d="M-10 230C80 200 140 250 230 215S340 180 410 205v40C340 225 270 262 200 250S60 235-10 268z" />
        <g className="m-road">
          <path d="M0 120h400" />
          <path d="M120 0v300" />
          <path d="M0 40l400 110" />
          <path d="M280 0v300" />
        </g>
        <g className="m-minor">
          <path d="M0 190h400M0 70h400M200 0v300M50 0v300M340 0v300" />
        </g>
      </svg>
      <span className="sl-pin" aria-hidden="true">
        <i />
      </span>
      <small>{label}</small>
    </div>
  );
}

function LangSwitch({ locale, hrefs, label }: { locale: Locale; hrefs: Record<Locale, string>; label: string }) {
  return (
    <nav className="sl-lang" aria-label={label}>
      {LOCALES.map((l) => (
        <a key={l} href={hrefs[l]} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}>
          {l.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
