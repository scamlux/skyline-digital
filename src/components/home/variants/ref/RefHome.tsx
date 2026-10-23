import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HorizontalPin } from "@/components/site/chrome/ref/HorizontalPin";
import { getProjects } from "@/lib/portfolio";
import { basePriceUsd } from "@/lib/pricing/rules";
import { formatUsd } from "@/lib/utils";
import type { HomeVariantProps } from "../index";
import { RefCaseModal, type RefCase } from "./RefCaseModal";
import { RefPhilosophy } from "./RefPhilosophy";

// Тот же порядок, что в OldHome / services (там список тоже объявлен локально).
const SERVICE_KEYS = ["website", "webApp", "mobileApp", "ai", "automation", "uiux"] as const;
const PROCESS_KEYS = ["brief", "estimate", "design", "build", "launch"] as const;
const STAT_KEYS = ["projects", "years", "langs"] as const;
// Вордмарк эталона: заливка и контур через букву.
const MARK = "SKYLINE".split("");

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * Главная в варианте «Референс» — порядок и эффекты эталона `#ver-ref`:
 * hero-вордмарк, бегущая строка, «Философия», проекты (с depth-открытием кейса),
 * услуги, «Как мы работаем» (роадмап + бизнес-процесс), цифры, финал.
 */
export async function RefHome({ params }: HomeVariantProps) {
  await params;
  const [t, ts, tp, projects] = await Promise.all([
    getTranslations("home"),
    getTranslations("services"),
    getTranslations("projects"),
    getProjects(),
  ]);

  const serviceTitles = SERVICE_KEYS.map((k) => ts(`items.${k}.title`));
  const cases: RefCase[] = projects.map((p) => ({
    slug: p.slug,
    title: p.title,
    cat: `${tp(`categories.${p.category}`)} · ${p.year}`,
    desc: p.description,
    tags: p.technologies,
    image: p.image,
    url: p.url,
  }));

  const marquee = (copy: number) =>
    serviceTitles.map((title, i) => (
      <span key={`${copy}-${i}`}>
        <span className={i % 2 ? "acc" : undefined}>{title}</span> <span className="sep">/</span>{" "}
      </span>
    ));

  return (
    <>
      <section className="r-hero">
        <div className="r-glow" aria-hidden="true" />
        <div className="r-in">
          <p className="r-eyebrow">{t("ref.eyebrow")}</p>
          <h1 className="r-mark">
            <span className="sr-only-v">{t("hero.title").replaceAll("*", "")}</span>
            <span aria-hidden="true">
              {MARK.map((ch, i) => (
                <span key={i} className={i % 2 ? "ch o" : "ch"}>
                  {ch}
                </span>
              ))}
            </span>
          </h1>
          <p className="r-sub">{t("hero.subtitle")}</p>
          <div className="r-hcta">
            <Link href="/calculator" className="r-cta">
              {t("hero.ctaPrimary")} <span aria-hidden="true">→</span>
            </Link>
            <Link href="/projects" className="r-cta ghost">
              {t("hero.ctaSecondary")}
            </Link>
          </div>
        </div>
        <div className="r-scroll" aria-hidden="true">
          {t("ref.scroll")}
          <span className="ln" />
        </div>
      </section>

      <div className="r-marq" aria-hidden="true">
        <div className="r-marq-t">
          {marquee(0)}
          {marquee(1)}
        </div>
      </div>

      <RefPhilosophy big={t("ref.philosophyPill")} pill={t("ref.philosophyPill")}>
        <p>{t.rich("ref.philosophy", { b: (chunks) => <b>{chunks}</b> })}</p>
      </RefPhilosophy>

      {/* ——— Проекты: клик открывает кейс поверх страницы, ссылка ведёт на деталку ——— */}
      <HorizontalPin
        id="r-work"
        ariaLabel={t("projectsTitle")}
        trackClassName="r-wtrack"
        progressBar
        head={
          <div className="r-hhead">
            <div>
              <p className="r-label">
                {t("eyebrows.projects")} — {pad(projects.length)}
              </p>
              <h2 className="r-htitle">{t("projectsTitle")}</h2>
            </div>
            <p className="r-hint">
              {t("ref.scrollHint")} · <Link href="/projects">{t("allProjects")} →</Link>
            </p>
          </div>
        }
      >
        {projects.map((p, i) => (
          <Link key={p.slug} href={`/projects/${p.slug}`} className="r-pcard" data-case={p.slug}>
            <div className="r-pcimg">
              <Image
                src={p.image}
                alt={p.title}
                fill
                sizes="(max-width: 760px) 82vw, 420px"
                loading={i < 2 ? "eager" : "lazy"}
              />
              <span className="r-pcopen" aria-hidden="true">
                ↗
              </span>
            </div>
            <div className="r-pcbd">
              <span className="r-pcn">{p.title}</span>
              <span className="r-pcc">
                {tp(`categories.${p.category}`)} · {p.year}
              </span>
            </div>
          </Link>
        ))}
      </HorizontalPin>

      {/* ——— Услуги ——— */}
      <HorizontalPin
        id="r-svc"
        ariaLabel={t("servicesTitle")}
        progressBar
        head={
          <div className="r-hhead">
            <div>
              <p className="r-label">{t("eyebrows.services")}</p>
              <h2 className="r-htitle">{t("servicesTitle")}</h2>
            </div>
            <p className="r-hint">
              {t("ref.scrollHint")} · <Link href="/services">{t("ref.allServices")} →</Link>
            </p>
          </div>
        }
      >
        {SERVICE_KEYS.map((key, i) => (
          <Link key={key} href={`/services/${key}`} className="r-panel">
            <span className="pn">
              {pad(i + 1)} / {pad(SERVICE_KEYS.length)}
            </span>
            <span className="pt">{serviceTitles[i]}</span>
            <p className="pd">{ts(`items.${key}.desc`)}</p>
            <span className="pp">
              <span>{t("ref.start")}</span>
              {t("from")} {formatUsd(basePriceUsd(key))}
            </span>
          </Link>
        ))}
      </HorizontalPin>

      {/* ——— Как мы работаем: роадмап + бизнес-процесс ——— */}
      <HorizontalPin
        id="r-proc"
        ariaLabel={t("processTitle")}
        trackClassName="r-road"
        head={
          <div className="r-hhead">
            <div>
              <p className="r-label">{t("eyebrows.process")}</p>
              <h2 className="r-htitle">{t("processTitle")}</h2>
            </div>
            <p className="r-hint">{t("ref.scrollHint")}</p>
          </div>
        }
      >
        {PROCESS_KEYS.map((key, i) => (
          <article key={key} className="r-step" data-step>
            <div className="r-steprow" aria-hidden="true">
              <span className="r-node">{pad(i + 1)}</span>
              {i < PROCESS_KEYS.length - 1 && (
                <span className="r-seg">
                  <i />
                </span>
              )}
            </div>
            <div className="r-panel">
              <span className="pn">
                {t("ref.step")} {pad(i + 1)} / {pad(PROCESS_KEYS.length)}
              </span>
              <span className="r-badge">{t(`process.${key}.badge`)}</span>
              <h3 className="pt">{t(`process.${key}.title`)}</h3>
              <dl className="r-lane">
                <div>
                  <dt>{t("ref.what")}</dt>
                  <dd>{t(`process.${key}.text`)}</dd>
                </div>
                <div>
                  <dt>{t("ref.how")}</dt>
                  <dd>{t(`process.${key}.detail`)}</dd>
                </div>
              </dl>
            </div>
          </article>
        ))}
      </HorizontalPin>

      <section className="r-sec" aria-label={t("eyebrows.about")}>
        <div className="r-stats">
          {STAT_KEYS.map((key, i) => (
            <div key={key}>
              <div className="n">{i === 0 ? <b>{t(`stats.${key}.value`)}</b> : t(`stats.${key}.value`)}</div>
              <div className="l">{t(`stats.${key}.label`)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="r-final">
        <p className="r-label">{t("eyebrows.contact")}</p>
        <h2>
          {t("ref.finalA")}
          <br />
          <em>{t("ref.finalB")}</em>
        </h2>
        <div className="r-hcta">
          <Link href="/contact" className="r-cta">
            {t("finalCta")} <span aria-hidden="true">→</span>
          </Link>
          <Link href="/calculator" className="r-cta ghost">
            {t("hero.ctaPrimary")}
          </Link>
        </div>
      </section>

      <RefCaseModal
        cases={cases}
        labels={{ close: t("ref.close"), openSite: t("ref.openSite"), caseMore: t("ref.caseMore") }}
      />
    </>
  );
}
