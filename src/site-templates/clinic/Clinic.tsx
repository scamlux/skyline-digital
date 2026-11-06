/* eslint-disable @next/next/no-img-element -- шаблон переносимый (без next/image): адаптивные <img srcset> с готовыми webp */
import { Carousel } from "../kit/carousel";
import { MotionLayer } from "../kit/motion";
import { plural } from "../kit/plural";
import { LOCALES, pick, type Locale, type TemplateProps } from "../types";
import { Calculator, type CalcRow } from "./Calculator";
import { BookingForm } from "./Booking";
import { DoctorBook, NextFreeCard, OpenStatus, PageView, PromoBar, ServiceCard, StickyBar, TrackedLink } from "./client-bits";
import type { ClinicData } from "./data";
import { ServiceGlyph } from "./icons";
import { toScheduleData } from "./schedule";
import { clinicUi as ui } from "./ui";

// CSS лежит в public/, а не импортируется: импортированный .css Turbopack добавляет во все
// маршруты сайта (ADR 0007), а шаблону нужно оставаться переносимым (ADR 0009).
const TEMPLATE_CSS = "/templates/clinic.css";
const FONT_PRELOAD = ["/templates/fonts/onest-latin.woff2", "/templates/fonts/onest-cyrillic.woff2"] as const;
const IMG = "/templates/clinic/img";

type W = 480 | 960 | 1280;
const img = (base: string, w: W) => `${IMG}/${base}-${w}.webp`;
const srcSet = (base: string, widths: W[]) => widths.map((w) => `${img(base, w)} ${w}w`).join(", ");

/**
 * Шаблон «Клиника / стоматология». Сервер-компонент без зависимостей от остального сайта:
 * данные и тексты — из props, стили — public/templates/clinic.css. Два стиля (a/b) — одна
 * разметка: «Свет» (светлый, живая аврора) и «Глубина» (тёмный, свет следует за курсором).
 *
 * Скорость: контент первого экрана никогда не прячется (LCP — заголовок или фото hero с
 * preload), анимируются только transform/opacity и стартуют после первой отрисовки;
 * движение — один остров MotionLayer по data-атрибутам; при prefers-reduced-motion
 * страница статична.
 */
export function ClinicSite({ data, locale, style, localeHrefs }: TemplateProps<ClinicData>) {
  const t = (l: Parameters<typeof pick>[0]) => pick(l, locale);
  const sched = toScheduleData(data);
  const heroSizes = style === "b" ? "100vw" : "(max-width: 860px) calc(100vw - 40px), 520px";
  const doctorNames = Object.fromEntries(data.doctors.map((d) => [d.id, t(d.name)]));
  const calcRows: CalcRow[] = data.services.filter((s) => s.calc).map((s) => ({ id: s.id, icon: s.icon, name: t(s.name), unit: t(s.unit) }));
  const decSep = locale === "en" ? "." : ",";
  const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const statText = (v: number, decimals: number | undefined, plus: boolean | undefined) => {
    const [i, frac] = v.toFixed(decimals ?? 0).split(".");
    return `${group(Number(i))}${frac ? decSep + frac : ""}${plus ? "+" : ""}`;
  };
  const [firstWord, ...otherWords] = data.hero.words;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Dentist",
    name: data.name,
    telephone: data.phone.e164,
    address: t(data.address),
    openingHours: `Mo-Sa ${data.hours.open}-${data.hours.close}`,
  };

  return (
    <div className="tpl" data-tpl="clinic" data-style={style} lang={locale === "uz" ? "uz-Latn" : locale}>
      <link rel="stylesheet" href={TEMPLATE_CSS} precedence="default" />
      {FONT_PRELOAD.map((href) => (
        <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
      ))}
      <link rel="preload" as="image" href={img(data.photos.hero, 960)} imageSrcSet={srcSet(data.photos.hero, [480, 960, 1280])} imageSizes={heroSizes} fetchPriority="high" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="tpl-head">
        <a href="#top" className="tpl-logo" aria-label={data.name}>
          <svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true" focusable="false">
            <path
              d="M9.5 5C6.5 5 4.5 7.2 4.5 10c0 2.6 1 4.4 1.8 6.9.8 2.6 1 9.1 3.2 9.1 1.9 0 1.9-5.4 4.5-5.4s2.6 5.4 4.5 5.4c2.2 0 2.4-6.5 3.2-9.1.8-2.5 1.8-4.3 1.8-6.9 0-2.8-2-5-5-5-2.1 0-3.2 1-4.5 1S11.6 5 9.5 5Z"
              fill="currentColor"
            />
          </svg>
          {data.name}
        </a>
        <nav className="tpl-nav" aria-label={t(ui.navLabel)}>
          <a href="#services">{t(ui.nav.services)}</a>
          <a href="#calc">{t(ui.nav.calc)}</a>
          <a href="#doctors">{t(ui.nav.doctors)}</a>
          <a href="#reviews">{t(ui.nav.reviews)}</a>
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

        <section className="tpl-hero" data-pointer data-pausable>
          <div className="tpl-fx" aria-hidden="true">
            {style === "a" ? (
              <>
                <i className="tpl-blob b1" />
                <i className="tpl-blob b2" />
                <i className="tpl-blob b3" />
              </>
            ) : (
              <>
                <i className="tpl-spot" />
                <i className="tpl-grain" />
              </>
            )}
          </div>
          <div className="tpl-hero-copy">
            <OpenStatus open={data.hours.open} close={data.hours.close} closedDays={data.hours.closedDays} locale={locale} />
            <h1>
              <span className="tpl-h1-lead">{t(data.hero.lead)}</span>{" "}
              <span className="tpl-cyc">
                <span className="tpl-cyc-w" style={{ "--i": 0 } as React.CSSProperties}>
                  {t(firstWord)}
                </span>
                {otherWords.map((w, i) => (
                  <span key={w.ru} className="tpl-cyc-w" aria-hidden="true" style={{ "--i": i + 1 } as React.CSSProperties}>
                    {t(w)}
                  </span>
                ))}
              </span>
            </h1>
            <p className="tpl-tagline">{t(data.tagline)}</p>
            <p className="tpl-intro">{t(data.intro)}</p>
            <div className="tpl-cta">
              <a className="tpl-btn" href="#book">
                {t(ui.book)}
              </a>
              <a className="tpl-btn ghost" href="#calc">
                {t(ui.calcCta)}
              </a>
            </div>
          </div>
          <div className="tpl-hero-visual">
            <figure className="tpl-hero-photo">
              <img
                src={img(data.photos.hero, 960)}
                srcSet={srcSet(data.photos.hero, [480, 960, 1280])}
                sizes={heroSizes}
                width={1280}
                height={853}
                alt=""
                fetchPriority="high"
                decoding="async"
              />
            </figure>
            <div className="tpl-floats">
              <div className="tpl-float f1" style={{ "--k": 1 } as React.CSSProperties}>
                <div className="tpl-glass">
                  <small>★★★★★</small>
                  <b>4,9 · {t(ui.float.rating)}</b>
                </div>
              </div>
              <div className="tpl-float f2" style={{ "--k": -1.4 } as React.CSSProperties}>
                <NextFreeCard sched={sched} doctorNames={doctorNames} locale={locale} />
              </div>
              <div className="tpl-float f3" style={{ "--k": 0.8 } as React.CSSProperties}>
                <div className="tpl-glass">
                  <small>{t(ui.float.painTitle)}</small>
                  <b>{t(ui.float.painText)}</b>
                </div>
              </div>
            </div>
          </div>
        </section>

        <div className="tpl-marquee" data-pausable aria-label={t(ui.trustLabel)} role="group">
          <div className="tpl-marquee-track">
            <ul>
              {data.trust.map((x) => (
                <li key={x.ru}>{t(x)}</li>
              ))}
            </ul>
            <ul aria-hidden="true">
              {data.trust.map((x) => (
                <li key={x.ru}>{t(x)}</li>
              ))}
            </ul>
          </div>
        </div>

        <section className="tpl-stats" aria-label={t(ui.statsNote)} data-reveal>
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

        <section className="tpl-sec" id="services" aria-labelledby="services-title">
          <div className="tpl-sec-head" data-reveal>
            <h2 id="services-title">{t(ui.services.title)}</h2>
            <p>{t(ui.services.hint)}</p>
          </div>
          <ul className="tpl-svc-grid">
            {data.services.map((s, i) => (
              <ServiceCard key={s.id} id={s.id} base={{ min: s.min, max: s.max }} locale={locale} index={i % 4}>
                <span className="tpl-svc-ico" aria-hidden="true">
                  <ServiceGlyph icon={s.icon} />
                </span>
                <h3>{t(s.name)}</h3>
                <p>{t(s.blurb)}</p>
                <p className="tpl-svc-unit">{t(s.unit)}</p>
              </ServiceCard>
            ))}
          </ul>
        </section>

        <section className="tpl-sec tpl-calc-sec" id="calc" aria-labelledby="calc-title">
          <div className="tpl-sec-head" data-reveal>
            <h2 id="calc-title">{t(ui.calc.title)}</h2>
            <p>{t(ui.calc.lead)}</p>
          </div>
          <Calculator rows={calcRows} sched={sched} locale={locale} />
        </section>

        <section className="tpl-sec" id="doctors" aria-labelledby="doctors-title">
          <div className="tpl-sec-head" data-reveal>
            <h2 id="doctors-title">{t(ui.doctors.title)}</h2>
            <p>{t(ui.doctors.hint)}</p>
          </div>
          <ul className="tpl-doctors">
            {data.doctors.map((d, i) => (
              <li key={d.id} className="tpl-doc" data-reveal style={{ "--d": i } as React.CSSProperties}>
                <img
                  src={img(d.photo, 480)}
                  srcSet={srcSet(d.photo, [480, 960])}
                  sizes="(max-width: 860px) 72vw, 360px"
                  width={960}
                  height={1200}
                  alt={t(d.name)}
                  loading="lazy"
                  decoding="async"
                />
                <div className="tpl-doc-body">
                  <h3>{t(d.name)}</h3>
                  <p className="tpl-doc-role">{t(d.role)}</p>
                  <p className="tpl-doc-years">
                    <b>{d.years}</b> {plural(locale, d.years, ui.years[locale])}
                  </p>
                  <DoctorBook doctorId={d.id} locale={locale} />
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="tpl-sec tpl-reviews" id="reviews" aria-labelledby="reviews-title">
          <div className="tpl-sec-head" data-reveal>
            <h2 id="reviews-title">{t(ui.reviews.title)}</h2>
            <p>{t(ui.reviews.note)}</p>
          </div>
          <Carousel label={t(ui.reviews.label)} prevLabel={t(ui.reviews.prev)} nextLabel={t(ui.reviews.next)}>
            {data.reviews.map((r) => (
              <figure key={r.name} className="tpl-review">
                <p className="tpl-stars" role="img" aria-label={t(ui.reviews.stars)}>
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

        <section className="tpl-sec tpl-about" id="about" aria-labelledby="about-title">
          <div className="tpl-about-copy" data-reveal>
            <h2 id="about-title">{t(data.about.title)}</h2>
            {data.about.paragraphs.map((p) => (
              <p key={p.ru}>{t(p)}</p>
            ))}
            <dl className="tpl-facts">
              {data.about.facts.map((f) => (
                <div key={f.k.ru}>
                  <dt>{t(f.k)}</dt>
                  <dd>{t(f.v)}</dd>
                </div>
              ))}
            </dl>
          </div>
          <div className="tpl-about-media" data-reveal>
            <img src={img(data.photos.interior, 960)} srcSet={srcSet(data.photos.interior, [480, 960])} sizes="(max-width: 860px) 46vw, 260px" width={960} height={960} alt={t(ui.photoAlt.interior)} loading="lazy" decoding="async" />
            <img src={img(data.photos.smile, 960)} srcSet={srcSet(data.photos.smile, [480, 960])} sizes="(max-width: 860px) 46vw, 260px" width={960} height={1200} alt={t(ui.photoAlt.smile)} loading="lazy" decoding="async" />
            <img src={img(data.photos.cabinet, 960)} srcSet={srcSet(data.photos.cabinet, [480, 960])} sizes="(max-width: 860px) 92vw, 540px" width={960} height={960} alt={t(ui.photoAlt.cabinet)} loading="lazy" decoding="async" />
          </div>
        </section>

        <section className="tpl-sec tpl-faq" aria-labelledby="faq-title">
          <div className="tpl-sec-head" data-reveal>
            <h2 id="faq-title">{t(ui.faq.title)}</h2>
          </div>
          <div className="tpl-faq-list" data-reveal>
            {data.faq.map((x) => (
              <details key={x.q.ru} name="faq">
                <summary>{t(x.q)}</summary>
                <p>{t(x.a)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="tpl-sec tpl-book" id="book" aria-labelledby="book-title">
          <div className="tpl-book-copy" data-reveal>
            <h2 id="book-title">{t(ui.form.title)}</h2>
            <p>{t(ui.form.lead)}</p>
          </div>
          <BookingForm
            mode={data.booking.mode}
            telegram={data.telegram}
            clinic={data.name}
            sched={sched}
            services={data.services.map((s) => ({ id: s.id, name: t(s.name) }))}
            doctors={data.doctors.map((d) => ({ id: d.id, name: t(d.name), role: t(d.role) }))}
            locale={locale}
          />
        </section>

        <section className="tpl-sec tpl-contacts" id="contacts" aria-labelledby="contacts-title">
          <div className="tpl-sec-head" data-reveal>
            <h2 id="contacts-title">{t(ui.contactsTitle)}</h2>
          </div>
          <div className="tpl-contacts-grid" data-reveal>
            <div className="tpl-contacts-list">
              <div>
                <h3>{t(ui.addressLabel)}</h3>
                <p>{t(data.address)}</p>
                <TrackedLink type="route" className="tpl-link" href={data.mapUrl} external={/^https?:/.test(data.mapUrl)}>
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
                  <TrackedLink type="call" className="tpl-link big" href={`tel:${data.phone.e164}`}>
                    {data.phone.display}
                  </TrackedLink>
                </p>
                <TrackedLink type="telegram" className="tpl-link" href={`https://t.me/${data.telegram}`} external>
                  @{data.telegram} →
                </TrackedLink>
              </div>
            </div>
            <MapCard label={t(ui.mapLabel)} />
          </div>
        </section>
        <MotionLayer />
      </main>

      <footer className="tpl-foot">
        <span>© {data.name}</span>
        <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
      </footer>

      <StickyBar phone={data.phone.e164} telegram={data.telegram} locale={locale} />
    </div>
  );
}

/** Схематичная карта района (вымышленная): дороги и пульсирующая метка. Демо — без внешних карт. */
function MapCard({ label }: { label: string }) {
  return (
    <div className="tpl-map" role="img" aria-label={label}>
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
      <span className="tpl-pin" aria-hidden="true">
        <i />
      </span>
      <small>{label}</small>
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
