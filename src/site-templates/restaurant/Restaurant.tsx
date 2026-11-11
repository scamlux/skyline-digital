/* eslint-disable @next/next/no-img-element -- шаблон переносимый (без next/image): адаптивные <img srcset> с готовыми webp */
import { Carousel } from "../kit/carousel";
import { RatingLine, ReviewAuthor } from "../kit/client-content";
import { MotionLayer } from "../kit/motion";
import { LOCALES, pick, type L, type Locale, type TemplateProps } from "../types";
import { BookButton, HoursText, OpenStatus, PageView, PromoBar, StickyBar, TrackedLink } from "./client-bits";
import type { DeliveryId, RestaurantData } from "./data";
import { IconArrow, IconBag, IconClock, IconPhone, IconPin, IconScooter, IconSend, IconStar, Kazan } from "./icons";
import { MenuSection } from "./Menu";
import { LatePhoto as Photo } from "./late-photo";
import { Steam, imgSet, imgSrc } from "./media";
import { SetBuilder } from "./SetBuilder";
import { LazyBookingSheet } from "./lazy-sheet";
import { restaurantUi as ui } from "./ui";

// CSS лежит в public/, а не импортируется: импортированный .css Turbopack добавляет во все
// маршруты сайта (ADR 0007), а шаблону нужно оставаться переносимым (ADR 0009).
const TEMPLATE_CSS = "/templates/restaurant.css";
// Текст и интерфейс набраны Onest в обоих стилях; заголовки A — Literata (у B тоже Onest). Прелоадим только то,
// чем набран первый экран: для ru кириллицу заголовка и латиницу интерфейса (цифры, логотип), для en/uz — латиницу
// (ʻ из uz лежит в латинском диапазоне). Literata не тянет лишнего: заголовок A кириллический, цифры и логотип — Onest.
const fontPreload = (style: "a" | "b", locale: Locale) => {
  const latin = (f: string) => `/templates/fonts/${f}-latin.woff2`;
  const cyr = (f: string) => `/templates/fonts/${f}-cyrillic.woff2`;
  const onest = locale === "ru" ? [latin("onest"), cyr("onest")] : [latin("onest")];
  if (style === "b") return onest;
  return [...onest, locale === "ru" ? cyr("literata") : latin("literata")];
};

/** Запасной src первого кадра: есть у обоих файлов (kazan и hero). */
const HERO_SRC_WIDTH = 960;

const DELIVERY_ICON = { uzum: IconBag, yandex: IconScooter } satisfies Record<DeliveryId, () => React.JSX.Element>;

/**
 * Шаблон «Ресторан». Серверный компонент для первого экрана и статичных блоков; меню, конструктор
 * набора и окно брони — клиентские острова поверх демо-хранилища. Два стиля (a/b) — одна разметка,
 * разные токены и несколько структурных правил в CSS.
 *
 * Правила: заголовки до пяти слов, одна поясняющая строка на блок, фото и цифры вместо абзацев,
 * цели ≥ 44px, «Забронировать стол» в первом экране и в липкой панели.
 */
export function RestaurantSite({ data, locale, style, localeHrefs, mode = "demo", client }: TemplateProps<RestaurantData>) {
  const t = (l: Parameters<typeof pick>[0]) => pick(l, locale);
  const hero = data.hero[style];
  // Режим "client": вымышленные отзывы, цифры, акция и демо-пометки из data не показываются, только настоящее из client.
  const demoMode = mode === "demo";
  const facts: { photo?: string; value: string; label: L }[] = demoMode ? data.facts : (client?.stats ?? []);
  const reviews = demoMode ? data.reviews : (client?.reviews ?? []);
  const rating = demoMode ? undefined : client?.rating;
  const delivery = demoMode ? data.delivery : data.delivery.filter((d) => /^https?:/.test(d.url)); // заглушки «#» — только в демо
  const heroPhoto = data.photos.hero[style];
  // A: фото в верхней части экрана на телефоне и половина экрана на десктопе; B: фон на всю ширину.
  const heroSizes = style === "b" ? "100vw" : "(max-width: 860px) 55vw, 52vw";

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
    <div className="rs" data-tpl="restaurant" data-style={style} lang={locale === "uz" ? "uz-Latn" : locale}>
      <link rel="stylesheet" href={TEMPLATE_CSS} precedence="default" />
      {fontPreload(style, locale).map((href) => (
        <link key={href} rel="preload" href={href} as="font" type="font/woff2" crossOrigin="" />
      ))}
      <link rel="preload" as="image" href={imgSrc(heroPhoto, HERO_SRC_WIDTH)} imageSrcSet={imgSet(heroPhoto)} imageSizes={heroSizes} fetchPriority="high" />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <header className="rs-head">
        <a href="#top" className="rs-logo" aria-label={data.name}>
          <Kazan />
          <span>{data.name}</span>
        </a>
        <nav className="rs-nav" aria-label={t(ui.navLabel)}>
          <a href="#menu">{t(ui.nav.menu)}</a>
          <a href="#company">{t(ui.nav.group)}</a>
          <a href="#contacts">{t(ui.nav.contacts)}</a>
        </nav>
        <div className="rs-head-r">
          <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
          <BookButton className="rs-btn sm head-book">{t(ui.bookShort)}</BookButton>
        </div>
      </header>

      <main id="top">
        <PageView />
        <section className="rs-hero" aria-labelledby="hero-title" data-pointer>
          <div className="rs-hero-art">
            <figure className="rs-hero-photo">
              <img
                src={imgSrc(heroPhoto, HERO_SRC_WIDTH)}
                srcSet={imgSet(heroPhoto)}
                sizes={heroSizes}
                width={heroPhoto === "hero" ? 1280 : 960}
                height={heroPhoto === "hero" ? 853 : 640}
                alt=""
                fetchPriority="high"
                decoding="async"
              />
            </figure>
            {style === "a" ? (
              <Steam />
            ) : (
              <div className="rs-glows" aria-hidden="true">
                <i className="g1" />
                <i className="g2" />
                <i className="g3" />
              </div>
            )}
          </div>
          <div className="rs-hero-copy">
            <OpenStatus open={data.hours.open} close={data.hours.close} locale={locale} />
            <h1 id="hero-title">{t(hero.title)}</h1>
            <p className="rs-lead">{t(hero.lead)}</p>
            <div className="rs-cta-row">
              <BookButton className="rs-cta">
                {t(ui.book)}
                <IconArrow />
              </BookButton>
              <a className="rs-ghost" href="#menu">
                {t(ui.seeMenu)}
              </a>
            </div>
          </div>
        </section>

        {facts.length > 0 && (
          <ul className="rs-facts" aria-label={t(ui.factsLabel)} data-reveal>
            {facts.map((f) => (
              <li key={f.value + t(f.label)}>
                {f.photo && <Photo name={f.photo} src={480} widths={[240, 480]} sizes="(max-width: 640px) 34vw, 22vw" width={480} height={480} loading="lazy" />}
                <b>{f.value}</b>
                <span>{t(f.label)}</span>
              </li>
            ))}
          </ul>
        )}

        <PromoBar fallback={demoMode ? data.promo : client?.promo} locale={locale} />
        <MenuSection menu={data.menu} locale={locale} />
        <SetBuilder sets={data.sets} menu={data.menu} locale={locale} />

        <section className="rs-sec rs-delivery" aria-labelledby="delivery-title" data-reveal>
          <div className="rs-sec-head">
            <h2 id="delivery-title">{t(ui.delivery.title)}</h2>
            <p>{t(ui.delivery.lead)}</p>
          </div>
          <ul className="rs-tiles">
            <li>
              <TrackedLink type="telegram" className="rs-tile direct" href={`https://t.me/${data.telegram}`} external>
                <span className="rs-tile-icon">
                  <IconSend />
                </span>
                <b>Telegram</b>
                <small>{t(ui.delivery.direct)}</small>
              </TrackedLink>
            </li>
            {delivery.map((d) => {
              const Icon = DELIVERY_ICON[d.id];
              return (
                <li key={d.id}>
                  <a className="rs-tile" href={d.url} {...ext(d.url)}>
                    <span className="rs-tile-icon">
                      <Icon />
                    </span>
                    <b>{d.name}</b>
                    <small>{t(ui.delivery.app)}</small>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>

        {(reviews.length > 0 || rating) && (
          <section className="rs-sec rs-reviews" aria-labelledby="reviews-title" data-reveal>
            <div className="rs-sec-head">
              <h2 id="reviews-title">{t(ui.reviews.title)}</h2>
              <p>{demoMode ? <span className="rs-demo-chip">{t(ui.reviews.demo)}</span> : rating && <RatingLine rating={rating} locale={locale} />}</p>
            </div>
            {reviews.length > 0 && (
              <Carousel label={t(ui.reviews.label)} prevLabel={t(ui.reviews.prev)} nextLabel={t(ui.reviews.next)}>
                {reviews.map((r) => (
                  <figure className="rs-review" key={r.name}>
                    {demoMode && (
                      <span className="rs-stars" aria-hidden="true">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <IconStar key={i} />
                        ))}
                      </span>
                    )}
                    <blockquote>{t(r.text)}</blockquote>
                    <figcaption>
                      <b>
                        <ReviewAuthor name={r.name} url={"url" in r ? r.url : undefined} />
                      </b>
                      {r.when && <small>{t(r.when)}</small>}
                    </figcaption>
                  </figure>
                ))}
              </Carousel>
            )}
          </section>
        )}

        <section className="rs-sec rs-contacts" id="contacts" aria-labelledby="contacts-title" data-reveal>
          <div className="rs-sec-head">
            <h2 id="contacts-title">{t(ui.contacts.title)}</h2>
          </div>
          <div className="rs-contacts-grid">
            <MapArt label={t(ui.contacts.mapLabel)} name={data.name} />
            <ul className="rs-contact-list">
              <li>
                <IconPin />
                <div>
                  <b>{t(data.address)}</b>
                  <TrackedLink type="route" className="rs-link" href={data.mapUrl} external={/^https?:/.test(data.mapUrl)}>
                    {t(ui.route)} <IconArrow />
                  </TrackedLink>
                </div>
              </li>
              <li>
                <IconClock />
                <div>
                  <b>
                    <HoursText open={data.hours.open} close={data.hours.close} locale={locale} />
                  </b>
                  <OpenStatus open={data.hours.open} close={data.hours.close} locale={locale} className="rs-status inline" />
                </div>
              </li>
              <li>
                <IconPhone />
                <div>
                  <TrackedLink type="call" className="rs-link big" href={`tel:${data.phone.e164}`}>
                    {data.phone.display}
                  </TrackedLink>
                </div>
              </li>
              <li>
                <IconSend />
                <div>
                  <TrackedLink type="telegram" className="rs-link big" href={`https://t.me/${data.telegram}`} external>
                    @{data.telegram}
                  </TrackedLink>
                </div>
              </li>
            </ul>
          </div>
        </section>
      </main>

      <footer className="rs-foot">
        <span>
          © {data.name}
          {demoMode && ` · ${t(ui.footerDemo)}`}
        </span>
        <LangSwitch locale={locale} hrefs={localeHrefs} label={t(ui.langLabel)} />
      </footer>

      <StickyBar phone={data.phone.e164} telegram={data.telegram} locale={locale} />
      <LazyBookingSheet name={data.name} telegram={data.telegram} hours={data.hours} mode={demoMode ? data.booking.mode : "telegram"} menu={data.menu} sets={data.sets} locale={locale} />
      <MotionLayer />
    </div>
  );
}

/** Внешняя ссылка открывается в новой вкладке; заглушка «#» (демо) — нет, иначе клик плодит копии страницы. */
const ext = (url: string) => (/^https?:/.test(url) ? { target: "_blank", rel: "noopener noreferrer" } : {});

function LangSwitch({ locale, hrefs, label }: { locale: Locale; hrefs: Record<Locale, string>; label: string }) {
  return (
    <nav className="rs-lang" aria-label={label}>
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
    <figure className="rs-map" role="img" aria-label={label}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">
        <rect width="400" height="300" fill="var(--map-bg)" />
        <path d="M-10 210 L120 190 L200 120 L300 100 L420 40" stroke="var(--map-road)" strokeWidth="16" fill="none" strokeLinecap="round" />
        <path d="M60 320 L110 200 L150 -10" stroke="var(--map-road)" strokeWidth="12" fill="none" strokeLinecap="round" />
        <path d="M250 320 L270 190 L330 -10" stroke="var(--map-road)" strokeWidth="10" fill="none" strokeLinecap="round" />
        <rect x="170" y="190" width="60" height="44" rx="10" fill="var(--map-park)" />
        <rect x="300" y="200" width="70" height="60" rx="12" fill="var(--map-park)" />
        <circle cx="206" cy="128" r="30" fill="var(--map-pin)" opacity="0.2" />
      </svg>
      <span className="rs-map-pin">
        <IconPin />
        <b>{name}</b>
      </span>
    </figure>
  );
}
