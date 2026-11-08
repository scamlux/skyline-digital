/* eslint-disable @next/next/no-img-element -- шаблон переносимый (без next/image): адаптивные <img srcset> с готовыми webp */
import { MotionLayer } from "../kit/motion";
import { LOCALES, pick, type Locale, type TemplateProps } from "../types";
import { BookButton, OpenStatus, PageView, PromoBar, StickyBar, TrackedLink } from "./client-bits";
import type { ClinicData } from "./data";
import { DoctorList } from "./Doctors";
import { SymptomTiles } from "./Hero";
import { JawMap } from "./Jaw";
import { Packages, PriceBento, type BentoCell } from "./Prices";
import { toScheduleData } from "./schedule";
import { BookingSheet } from "./Sheet";
import { clinicUi as ui } from "./ui";
import { WhitenSlider } from "./Whiten";

// CSS лежит в public/, а не импортируется: импортированный .css Turbopack добавляет во все
// маршруты сайта (ADR 0007), а шаблону нужно оставаться переносимым (ADR 0009).
const TEMPLATE_CSS = "/templates/clinic.css";
const IMG = "/templates/clinic/img";
/** Шрифт: для русского нужны оба набора, для английского и узбекского (с ʻ U+02BB) — только латиница. */
const FONT_LATIN = "/templates/fonts/onest-latin.woff2";
const FONT_CYRILLIC = "/templates/fonts/onest-cyrillic.woff2";
const HERO_SIZES = "(max-width: 760px) 96px, 560px";

type W = 480 | 960 | 1280;
/** Реальные размеры 480-х файлов плиток-фото (для width/height у <img>, без сдвига вёрстки). */
const PHOTO_SIZE = { consult: { w: 480, h: 320 }, scanner: { w: 480, h: 480 }, kids: { w: 480, h: 600 } } as const;
const img = (base: string, w: W) => `${IMG}/${base}-${w}.webp`;
const srcSet = (base: string, widths: W[]) => widths.map((w) => `${img(base, w)} ${w}w`).join(", ");

/**
 * Шаблон «Клиника / стоматология»: «стоматология, где всё понятно заранее». Сервер-компонент без
 * зависимостей от остального сайта: данные и тексты из props, стили — public/templates/clinic.css.
 * Два стиля (a/b) — одна разметка: «Белый кабинет» (бумажный, клинически точный, кобальт) и
 * «Ночная смена» (тёмный, холодное свечение, челюсть как скан).
 *
 * Скорость: первый экран — текст и плитки (LCP — заголовок), анимируются только transform/opacity
 * и стартуют после первой отрисовки; движение — один остров MotionLayer; при
 * prefers-reduced-motion страница статична. Тяжёлого JS нет: ни canvas, ни WebGL.
 */
export function ClinicSite({ data, locale, style, localeHrefs }: TemplateProps<ClinicData>) {
  const t = (l: Parameters<typeof pick>[0]) => pick(l, locale);
  const sched = toScheduleData(data);
  const doctorOf = (id: string) => data.doctors.find((d) => d.id === id) ?? data.doctors[0];
  const decSep = locale === "en" ? "." : ",";
  const group = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, "\u00a0");
  const statText = (v: number, decimals: number | undefined, plus: boolean | undefined) => {
    const [i, frac] = v.toFixed(decimals ?? 0).split(".");
    return `${group(Number(i))}${frac ? decSep + frac : ""}${plus ? "+" : ""}`;
  };

  const tiles = data.symptoms.map((x) => {
    const d = doctorOf(x.doctorId);
    return { id: x.id, icon: x.icon, label: t(x.label), line: t(x.line), options: x.options, bookService: x.bookService, doctor: { id: d.id, name: t(d.name), role: t(d.role), photo: d.photo } };
  });

  const svc = (id: string) => data.services.find((s) => s.id === id)!;
  const cell = (id: string, extra: Partial<BentoCell> = {}): BentoCell => ({ id, name: t(svc(id).name), unit: t(svc(id).unit), ...extra });
  const cells: BentoCell[] = [
    cell("consult", { span: "big", photo: data.photos.consult, photoSize: PHOTO_SIZE.consult, unit: t(svc("consult").blurb) }),
    cell("clean"),
    cell("filling"),
    cell("canals"),
    cell("whitening"),
    cell("implant", { span: "wide", accent: true }),
    cell("braces", { photo: data.photos.scanner, photoSize: PHOTO_SIZE.scanner }),
    cell("veneers"),
    cell("kids", { span: "wide", photo: data.photos.kids, photoSize: PHOTO_SIZE.kids }),
    cell("crown"),
    cell("extract"),
  ];
  const packages = data.packages.map((p) => ({ id: p.id, name: t(p.name), includes: p.includes.map(t), items: p.items, instalmentMonths: p.instalmentMonths }));
  const doctorCards = data.doctors.map((d) => ({
    id: d.id,
    name: t(d.name),
    role: t(d.role),
    years: d.years,
    photo: d.photo,
    tags: d.tags,
    slotService: d.serviceIds.find((id) => id !== "consult") ?? "consult",
  }));

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
      <link rel="preload" href={FONT_LATIN} as="font" type="font/woff2" crossOrigin="" />
      {locale === "ru" && <link rel="preload" href={FONT_CYRILLIC} as="font" type="font/woff2" crossOrigin="" />}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="cl-head">
        <a href="#top" className="cl-logo" aria-label={data.name}>
          <svg viewBox="0 0 32 32" width="26" height="26" aria-hidden="true" focusable="false">
            <path d="M9.5 5C6.5 5 4.5 7.2 4.5 10c0 2.6 1 4.4 1.8 6.9.8 2.6 1 9.1 3.2 9.1 1.9 0 1.9-5.4 4.5-5.4s2.6 5.4 4.5 5.4c2.2 0 2.4-6.5 3.2-9.1.8-2.5 1.8-4.3 1.8-6.9 0-2.8-2-5-5-5-2.1 0-3.2 1-4.5 1S11.6 5 9.5 5Z" fill="currentColor" />
          </svg>
          {data.name}
        </a>
        <nav className="cl-nav" aria-label={t(ui.navLabel)}>
          <a href="#jaw">{t(ui.nav.jaw)}</a>
          <a href="#prices">{t(ui.nav.prices)}</a>
          <a href="#doctors">{t(ui.nav.doctors)}</a>
          <a href="#contacts">{t(ui.nav.contacts)}</a>
        </nav>
        <div className="cl-head-r">
          <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
          <BookButton locale={locale} className="cl-btn cl-head-book" />
        </div>
      </header>

      <main id="top">
        <PageView />
        <section className="cl-hero" aria-labelledby="hero-title">
          <p className="cl-status">
            <OpenStatus open={data.hours.open} close={data.hours.close} closedDays={data.hours.closedDays} locale={locale} />
            <span className="cl-coord" aria-hidden="true">
              41.3111° N · 69.2797° E
            </span>
          </p>
          <h1 id="hero-title">{t(ui.hero.title)}</h1>
          <p className="cl-lead">{t(ui.hero.lead)}</p>
          <figure className="cl-vis cl-scan">
            <img
              src={img(data.photos.hero, 960)}
              srcSet={srcSet(data.photos.hero, [480, 960, 1280])}
              sizes={HERO_SIZES}
              width={1280}
              height={853}
              alt={t(ui.hero.visual)}
              fetchPriority="high"
              decoding="async"
            />
            <figcaption>{t(ui.hero.visual)}</figcaption>
          </figure>
          <SymptomTiles tiles={tiles} sched={sched} locale={locale} />
        </section>

        <PromoBar text={t(data.promo)} locale={locale} />

        <section className="cl-stats" aria-label={t(ui.statsNote)}>
          <dl>
            {data.stats.map((s) => (
              <div key={s.id}>
                <dt>{t(s.label)}</dt>
                <dd>
                  <b data-count={s.value} data-dec={s.decimals ?? 0} data-dec-sep={decSep}>
                    {statText(s.value, s.decimals, s.plus)}
                  </b>
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="cl-sec cl-jaw-sec" id="jaw" aria-labelledby="jaw-title">
          <div className="cl-sec-head" data-reveal>
            <h2 id="jaw-title">{t(ui.jaw.title)}</h2>
            <p>{t(ui.jaw.lead)}</p>
          </div>
          <JawMap sched={sched} locale={locale} />
        </section>

        <section className="cl-sec cl-whiten-sec" id="whiten" aria-labelledby="whiten-title">
          <div className="cl-sec-head" data-reveal>
            <h2 id="whiten-title">{t(ui.whiten.title)}</h2>
            <p>{t(ui.whiten.lead)}</p>
          </div>
          <WhitenSlider sched={sched} before={data.photos.whitenBefore} after={data.photos.whitenAfter} locale={locale} />
        </section>

        <section className="cl-sec" id="prices" aria-labelledby="prices-title">
          <div className="cl-sec-head" data-reveal>
            <h2 id="prices-title">{t(ui.prices.title)}</h2>
            <p>{t(ui.prices.lead)}</p>
          </div>
          <PriceBento cells={cells} sched={sched} locale={locale} />
          <h3 className="cl-sub" data-reveal>
            {t(ui.prices.packages)}
          </h3>
          <Packages packages={packages} sched={sched} locale={locale} />
        </section>

        <section className="cl-sec" id="doctors" aria-labelledby="doctors-title">
          <div className="cl-sec-head" data-reveal>
            <h2 id="doctors-title">{t(ui.doctors.title)}</h2>
            <p>{t(ui.doctors.lead)}</p>
          </div>
          <DoctorList doctors={doctorCards} sched={sched} locale={locale} />
        </section>

        <section className="cl-sec" id="reviews" aria-labelledby="reviews-title">
          <div className="cl-sec-head" data-reveal>
            <h2 id="reviews-title">{t(ui.reviews.title)}</h2>
            <p>{t(ui.reviews.note)}</p>
          </div>
          <div className="cl-reviews cl-snap" role="region" aria-label={t(ui.reviews.label)} tabIndex={0}>
            {data.reviews.map((r) => (
              <figure key={r.name} className="cl-review">
                <p className="cl-stars">{t(ui.reviews.stars)}</p>
                <blockquote>{t(r.text)}</blockquote>
                <figcaption>
                  <b>{r.name}</b> · {t(r.service)}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        <section className="cl-sec cl-faq" aria-labelledby="faq-title">
          <div className="cl-sec-head" data-reveal>
            <h2 id="faq-title">{t(ui.faq.title)}</h2>
          </div>
          <div className="cl-faq-list" data-reveal>
            {data.faq.map((x) => (
              <details key={x.q.ru} name="faq">
                <summary>{t(x.q)}</summary>
                <p>{t(x.a)}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="cl-sec cl-contacts" id="contacts" aria-labelledby="contacts-title">
          <div className="cl-sec-head" data-reveal>
            <h2 id="contacts-title">{t(ui.contactsTitle)}</h2>
          </div>
          <div className="cl-contacts-grid" data-reveal>
            <div className="cl-contacts-list">
              <div>
                <h3>{t(ui.addressLabel)}</h3>
                <p>{t(data.address)}</p>
                <TrackedLink type="route" className="cl-link" href={data.mapUrl} external={/^https?:/.test(data.mapUrl)}>
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
                  <TrackedLink type="call" className="cl-link big" href={`tel:${data.phone.e164}`}>
                    {data.phone.display}
                  </TrackedLink>
                </p>
                <TrackedLink type="telegram" className="cl-link" href={`https://t.me/${data.telegram}`} external>
                  @{data.telegram} →
                </TrackedLink>
              </div>
              {data.facts.map((f) => (
                <div key={f.k.ru}>
                  <h3>{t(f.k)}</h3>
                  <p>{t(f.v)}</p>
                </div>
              ))}
            </div>
            <MapCard label={t(ui.mapLabel)} />
          </div>
        </section>
        <MotionLayer />
      </main>

      <footer className="cl-foot">
        <p className="cl-foot-name" aria-hidden="true">
          {data.name}
        </p>
        <div className="cl-foot-row">
          <span>© {data.name}</span>
          <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
        </div>
      </footer>

      <BookingSheet
        mode={data.booking.mode}
        telegram={data.telegram}
        clinic={data.name}
        sched={sched}
        services={data.services.map((s) => ({ id: s.id, name: t(s.name) }))}
        doctors={data.doctors.map((d) => ({ id: d.id, name: t(d.name), role: t(d.role), photo: d.photo }))}
        locale={locale}
      />
      <StickyBar phone={data.phone.e164} telegram={data.telegram} locale={locale} />
    </div>
  );
}

/** Схематичная карта района (вымышленная): дороги и метка. Демо — без внешних карт. */
function MapCard({ label }: { label: string }) {
  return (
    <div className="cl-map" role="img" aria-label={label}>
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
      <span className="cl-pin" aria-hidden="true">
        <i />
      </span>
      <small>{label}</small>
    </div>
  );
}

function LangSwitch({ locale, hrefs, label }: { locale: Locale; hrefs: Record<Locale, string>; label: string }) {
  return (
    <nav className="cl-lang" aria-label={label}>
      {LOCALES.map((l) => (
        <a key={l} href={hrefs[l]} hrefLang={l} lang={l} aria-current={l === locale ? "true" : undefined}>
          {l.toUpperCase()}
        </a>
      ))}
    </nav>
  );
}
