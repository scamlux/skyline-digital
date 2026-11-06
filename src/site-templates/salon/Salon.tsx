/* eslint-disable @next/next/no-img-element -- шаблон переносимый (без next/image): адаптивные <img srcset> с готовыми webp */
import { Fragment } from "react";
import { Carousel } from "../kit/carousel";
import { MotionLayer } from "../kit/motion";
import { LOCALES, pick, type L, type Locale, type TemplateProps } from "../types";
import { BookingForm } from "./Booking";
import { buildCatalog } from "./catalog";
import { MasterCards, NextWindowCard, OpenStatus, PageView, PromoBar, StickyBar, TrackedLink } from "./client-bits";
import { SalonProvider } from "./context";
import type { SalonData } from "./data";
import { Lookbook } from "./Lookbook";
import { Quiz } from "./Quiz";
import { ServicesList } from "./Services";
import { splitHeadline } from "./format";
import { salonUi as ui } from "./ui";

// CSS лежит в public/, а не импортируется: импортированный .css Turbopack добавляет во все
// маршруты сайта (ADR 0007), а шаблону нужно оставаться переносимым (ADR 0009).
const TEMPLATE_CSS = "/templates/salon.css";
/**
 * Шрифты первого экрана. A — Onest, B — Literata целиком (и заголовки, и текст): один шрифт вместо двух
 * экономит ~50 КБ на первом экране, где они конкурируют с фото hero (LCP). Preload — оба файла семейства:
 * пробелы и знаки препинания берутся из латинского файла даже в русском тексте.
 */
const FONT_PRELOAD = (style: "a" | "b", locale: Locale): string[] => {
  const family = style === "a" ? "onest" : "literata";
  const scripts = locale === "ru" ? ["cyrillic", "latin"] : ["latin"];
  return scripts.map((sc) => `/templates/fonts/${family}-${sc}.woff2`);
};

const IMG = "/templates/salon/img";

type W = 480 | 640 | 960 | 1280;
const img = (base: string, w: W) => `${IMG}/${base}-${w}.webp`;
const srcSet = (base: string, widths: W[]) => widths.map((w) => `${img(base, w)} ${w}w`).join(", ");

/**
 * Слова → буквы с индексом для поочерёдного появления (текст виден сразу, анимируется только transform).
 * Пробел между словами стоит ВНЕ inline-block слова: внутри него он схлопывался бы («безспешки»).
 */
function Letters({ text, offset }: { text: string; offset: number }) {
  let i = offset;
  return (
    <>
      {splitHeadline(text).map((word, w) => (
        <Fragment key={w}>
          {w > 0 && " "}
          <span className="sl-word" aria-hidden="true">
            {word.map((ch, k) => (
              <span key={k} className="sl-ch" style={{ "--i": i++ } as React.CSSProperties}>
                {ch}
              </span>
            ))}
          </span>
        </Fragment>
      ))}
    </>
  );
}

/**
 * Шаблон «Салон / барбершоп». Сервер-компонент без зависимостей от остального сайта: данные и
 * тексты — из props, стили — public/templates/salon.css. Два стиля — одна разметка:
 * A «Ночь» (барбершоп: тёмный, латунь, зерно, фото на весь экран с медленным наездом, огромный
 * заголовок) и B «Пудра» (салон: кремовый, антиква, органичные формы, мягкий свет).
 *
 * Скорость: контент первого экрана никогда не прячется (LCP — заголовок или фото hero с preload),
 * анимируются только transform/opacity и стартуют после первой отрисовки (data-live), ставятся на
 * паузу вне экрана и в фоновой вкладке; без canvas и WebGL; при prefers-reduced-motion страница
 * статична.
 */
export function SalonSite({ data, locale, style, localeHrefs }: TemplateProps<SalonData>) {
  const t = (l: L) => pick(l, locale);
  const catalog = buildCatalog(data, locale);
  // A — барбер на весь экран (3:2); B — «длинные волны» из лукбука (4:5) в органической маске.
  const hero = style === "a" ? { base: data.photos.hero, widths: [480, 960, 1280] as W[], w: 1280, h: 853 } : { base: data.photos.heroB, widths: [480, 640, 960] as W[], w: 960, h: 1200 };
  const heroSizes = style === "a" ? "100vw" : "(max-width: 860px) 300px, 540px";
  const [line1, line2] = data.hero[style];
  const heroLabel = `${t(line1)} ${t(line2)}`;
  const decSep = locale === "en" ? "." : ",";
  const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const statText = (v: number, decimals: number | undefined, plus: boolean | undefined) => {
    const [i, frac] = v.toFixed(decimals ?? 0).split(".");
    return `${group(Number(i))}${frac ? decSep + frac : ""}${plus ? "+" : ""}`;
  };

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BarberShop",
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
      <link rel="preload" as="image" href={img(hero.base, hero.widths.includes(640) ? 640 : 960)} imageSrcSet={srcSet(hero.base, hero.widths)} imageSizes={heroSizes} fetchPriority="high" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <SalonProvider catalog={catalog}>
        <header className="sl-head">
          <a href="#top" className="sl-logo" aria-label={data.name}>
            <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true" focusable="false">
              <path d="M4.5 21.8 20.6 4.3a2.2 2.2 0 0 1 3.2-.1l1.5 1.5a2.2 2.2 0 0 1 0 3.1L9.6 24.9z" fill="currentColor" />
              <path d="M3.5 28.5l.9-5.4 4.5 4.5z" fill="currentColor" opacity=".7" />
            </svg>
            {data.name}
          </a>
          <nav className="sl-nav" aria-label={t(ui.navLabel)}>
            <a href="#looks">{t(ui.nav.looks)}</a>
            <a href="#quiz">{t(ui.nav.quiz)}</a>
            <a href="#services">{t(ui.nav.services)}</a>
            <a href="#masters">{t(ui.nav.masters)}</a>
            <a href="#reviews">{t(ui.nav.reviews)}</a>
            <a href="#contacts">{t(ui.nav.contacts)}</a>
          </nav>
          <div className="sl-head-r">
            <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
            <a className="sl-btn sm" href="#book">
              {t(ui.bookShort)}
            </a>
          </div>
        </header>

        <main id="top">
          <PageView />
          <PromoBar text={t(data.promo)} locale={locale} />

          <section className="sl-hero" data-pointer data-pausable>
            <div className="sl-fx" aria-hidden="true">
              {style === "a" ? (
                <>
                  <i className="sl-glow" />
                  <i className="sl-grain" />
                </>
              ) : (
                <>
                  <i className="sl-blob b1" />
                  <i className="sl-blob b2" />
                  <i className="sl-blob b3" />
                  <i className="sl-ring" />
                </>
              )}
            </div>
            <div className="sl-hero-visual">
              <figure className="sl-hero-photo">
                <img src={img(hero.base, hero.widths.includes(640) ? 640 : 960)} srcSet={srcSet(hero.base, hero.widths)} sizes={heroSizes} width={hero.w} height={hero.h} alt="" fetchPriority="high" decoding="async" />
              </figure>
              <a className="sl-badge" href="#book" aria-label={t(ui.badge.label)}>
                <svg viewBox="0 0 120 120" aria-hidden="true" focusable="false">
                  <defs>
                    <path id="sl-circle" d="M60 60m-46 0a46 46 0 1 1 92 0a46 46 0 1 1-92 0" />
                  </defs>
                  <text>
                    <textPath href="#sl-circle" textLength="286" lengthAdjust="spacing">
                      {t(ui.badge.text)}
                    </textPath>
                  </text>
                </svg>
                <span className="sl-badge-arrow" aria-hidden="true">
                  ↗
                </span>
              </a>
            </div>
            <div className="sl-hero-copy">
              <OpenStatus open={data.hours.open} close={data.hours.close} locale={locale} />
              <h1 aria-label={heroLabel}>
                <span className="sl-line l1">
                  <Letters text={t(line1)} offset={0} />
                </span>
                <span className="sl-line l2">
                  <Letters text={t(line2)} offset={Array.from(t(line1)).length} />
                </span>
              </h1>
              <p className="sl-tagline">{t(data.tagline)}</p>
              <p className="sl-intro">{t(data.intro)}</p>
              <div className="sl-cta">
                <a className="sl-btn" href="#book">
                  {t(ui.book)}
                </a>
                <a className="sl-btn ghost" href="#quiz">
                  {t(ui.quizCta)}
                </a>
              </div>
            </div>
            <div className="sl-floats">
              <div className="sl-chip sl-chip-rating">
                <small>★★★★★</small>
                <b>4,9 · {t(ui.float.rating)}</b>
              </div>
              <NextWindowCard />
            </div>
          </section>

          <div className="sl-marquee" data-pausable role="group" aria-label={t(ui.marqueeLabel)}>
            <div className="sl-marquee-track">
              <ul>
                {data.marquee.map((x) => (
                  <li key={x.ru}>{t(x)}</li>
                ))}
              </ul>
              <ul aria-hidden="true">
                {data.marquee.map((x) => (
                  <li key={x.ru}>{t(x)}</li>
                ))}
              </ul>
            </div>
          </div>

          <section className="sl-stats" aria-label={t(ui.statsNote)} data-reveal>
            <dl>
              {data.stats.map((s) => (
                <div key={s.id}>
                  <dt>{t(s.label)}</dt>
                  <dd data-count={s.value} data-dec={s.decimals ?? 0} data-dec-sep={decSep}>
                    {statText(s.value, s.decimals, s.plus)}
                  </dd>
                </div>
              ))}
            </dl>
            <p>{t(ui.statsNote)}</p>
          </section>

          <section className="sl-sec" id="looks" aria-labelledby="looks-title">
            <div className="sl-sec-head" data-reveal>
              <h2 id="looks-title">{t(ui.looks.title)}</h2>
              <p>{t(ui.looks.hint)}</p>
            </div>
            <Lookbook />
          </section>

          <section className="sl-sec sl-quiz-sec" id="quiz" aria-labelledby="quiz-title">
            <div className="sl-sec-head" data-reveal>
              <h2 id="quiz-title">{t(ui.quiz.title)}</h2>
              <p>{t(ui.quiz.lead)}</p>
            </div>
            <div className="sl-quiz-wrap">
              <Quiz />
              <div className="sl-quiz-deco" aria-hidden="true">
                {data.looks.filter((_, i) => i % 2 === 0).map((l, i) => (
                  <img key={l.id} src={`${IMG}/${l.photo}-240.webp`} width={240} height={300} alt="" loading="lazy" decoding="async" style={{ "--k": i } as React.CSSProperties} />
                ))}
              </div>
            </div>
          </section>

          <section className="sl-sec" id="services" aria-labelledby="services-title">
            <div className="sl-sec-head" data-reveal>
              <h2 id="services-title">{t(ui.services.title)}</h2>
              <p>{t(ui.services.hint)}</p>
            </div>
            <ServicesList />
          </section>

          <section className="sl-sec" id="masters" aria-labelledby="masters-title">
            <div className="sl-sec-head" data-reveal>
              <h2 id="masters-title">{t(ui.masters.title)}</h2>
              <p>{t(ui.masters.hint)}</p>
            </div>
            <MasterCards />
          </section>

          <section className="sl-sec sl-reviews" id="reviews" aria-labelledby="reviews-title">
            <div className="sl-sec-head" data-reveal>
              <h2 id="reviews-title">{t(ui.reviews.title)}</h2>
              <p>{t(ui.reviews.note)}</p>
            </div>
            <Carousel label={t(ui.reviews.label)} prevLabel={t(ui.reviews.prev)} nextLabel={t(ui.reviews.next)}>
              {data.reviews.map((r) => (
                <figure key={r.name} className="sl-review">
                  <p className="sl-stars" role="img" aria-label={t(ui.reviews.stars)}>
                    ★★★★★
                  </p>
                  <blockquote>{t(r.text)}</blockquote>
                  <figcaption>
                    <b>{r.name}</b> · {t(r.service)}
                  </figcaption>
                </figure>
              ))}
            </Carousel>
          </section>

          <section className="sl-sec sl-about" aria-labelledby="about-title">
            <div className="sl-about-copy" data-reveal>
              <h2 id="about-title">{t(data.about.title)}</h2>
              {data.about.paragraphs.map((p) => (
                <p key={p.ru}>{t(p)}</p>
              ))}
              <dl className="sl-facts">
                {data.about.facts.map((f) => (
                  <div key={f.k.ru}>
                    <dt>{t(f.k)}</dt>
                    <dd>{t(f.v)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            <div className="sl-about-media" data-reveal>
              <img src={img(data.photos.interior, 960)} srcSet={srcSet(data.photos.interior, [480, 960])} sizes="(max-width: 860px) 46vw, 300px" width={960} height={960} alt={t(ui.photoAlt.interior)} loading="lazy" decoding="async" />
              <img src={img(data.photos.hero, 480)} srcSet={srcSet(data.photos.hero, [480, 960])} sizes="(max-width: 860px) 46vw, 300px" width={960} height={640} alt={t(ui.photoAlt.hero)} loading="lazy" decoding="async" />
            </div>
          </section>

          <section className="sl-sec sl-faq" aria-labelledby="faq-title">
            <div className="sl-sec-head" data-reveal>
              <h2 id="faq-title">{t(ui.faq.title)}</h2>
            </div>
            <div className="sl-faq-wrap">
            <div className="sl-faq-list" data-reveal>
              {data.faq.map((x) => (
                <details key={x.q.ru} name="faq">
                  <summary>{t(x.q)}</summary>
                  <p>{t(x.a)}</p>
                </details>
              ))}
            </div>
            <aside className="sl-faq-help" data-reveal>
              <h3>{t(ui.faq.helpTitle)}</h3>
              <p>{t(ui.faq.helpText)}</p>
              <TrackedLink type="telegram" className="sl-btn ghost" href={`https://t.me/${data.telegram}`} external>
                {t(ui.faq.helpCta)}
              </TrackedLink>
            </aside>
            </div>
          </section>

          <section className="sl-sec sl-book" id="book" aria-labelledby="book-title">
            <div className="sl-book-copy" data-reveal>
              <h2 id="book-title">{t(ui.form.title)}</h2>
              <p>{t(ui.form.lead)}</p>
              <img className="sl-book-copy-photo" src={img(data.photos.tools, 480)} srcSet={srcSet(data.photos.tools, [480, 960])} sizes="360px" width={960} height={960} alt="" loading="lazy" decoding="async" />
            </div>
            <BookingForm />
          </section>

          <section className="sl-sec sl-contacts" id="contacts" aria-labelledby="contacts-title">
            <div className="sl-sec-head" data-reveal>
              <h2 id="contacts-title">{t(ui.contactsTitle)}</h2>
            </div>
            <div className="sl-contacts-grid" data-reveal>
              <div className="sl-contacts-list">
                <div>
                  <h3>{t(ui.addressLabel)}</h3>
                  <p>{t(data.address)}</p>
                  <TrackedLink type="route" className="sl-link" href={data.mapUrl} external={/^https?:/.test(data.mapUrl)}>
                    {t(ui.route)} →
                  </TrackedLink>
                </div>
                <div>
                  <h3>{t(ui.hoursTitle)}</h3>
                  <p>{t(ui.hoursValue).replace("{a}", data.hours.open).replace("{b}", data.hours.close)}</p>
                </div>
                <div>
                  <h3>{t(ui.call)}</h3>
                  <p>
                    <TrackedLink type="call" className="sl-link big" href={`tel:${data.phone.e164}`}>
                      {data.phone.display}
                    </TrackedLink>
                  </p>
                  <TrackedLink type="telegram" className="sl-link" href={`https://t.me/${data.telegram}`} external>
                    @{data.telegram} →
                  </TrackedLink>
                </div>
              </div>
              <MapCard label={t(ui.mapLabel)} />
            </div>
          </section>
          <MotionLayer />
        </main>

        <footer className="sl-foot">
          <span>© {data.name}</span>
          <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
        </footer>

        <StickyBar phone={data.phone.e164} telegram={data.telegram} locale={locale} />
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
