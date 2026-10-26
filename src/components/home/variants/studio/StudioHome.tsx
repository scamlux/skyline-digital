import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getProjects } from "@/lib/portfolio";
import { basePriceUsd } from "@/lib/pricing/rules";
import { formatUsd } from "@/lib/utils";
import type { HomeVariantProps } from "../index";
import { StudioCaroNav, StudioParticles, StudioRotator } from "./StudioHeroFx";

// Тот же порядок, что в OldHome / RefHome.
const SERVICE_KEYS = ["website", "webApp", "mobileApp", "ai", "automation", "uiux"] as const;
const PROCESS_KEYS = ["brief", "estimate", "design", "build", "launch"] as const;
const STAT_KEYS = ["projects", "years", "langs"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** «12+» → 12 и «+»; «2 мин» → 2 и « мин» — для счётчика. Нечисловое значение — как есть. */
function splitStat(value: string) {
  const m = value.match(/^(\d+)(.*)$/);
  return m ? { n: Number(m[1]), suffix: m[2] } : null;
}

/**
 * Главная в варианте Studio — порядок и эффекты эталона `#ver-studio`:
 * hero с параллаксом неба/города и частицами, цифры, калькулятор, карусель
 * проектов, таблица услуг, процесс с линией прогресса, финальный CTA.
 * Все тексты и цифры — из существующих ключей и данных сайта.
 */
export async function StudioHome({ params }: HomeVariantProps) {
  await params;
  const [t, ts, tp, tr, tst, projects] = await Promise.all([
    getTranslations("home"),
    getTranslations("services"),
    getTranslations("projects"),
    getTranslations("home.ref"),
    getTranslations("home.studio"),
    getProjects(),
  ]);

  const words = tst.raw("heroWords") as string[];

  return (
    <>
      <section className="hero">
        <div className="hero-bg" aria-hidden="true">
          <div className="layer sky" data-depth="0.12" />
          <StudioParticles />
          <div className="layer city" data-depth="0.34" />
        </div>
        <div className="hero-veil" aria-hidden="true" />
        <div className="hero-content" id="s-hero-content">
          <span className="kick center">{tr("eyebrow")}</span>
          <h1>
            <span className="sr-only-v">{tst("heroTitleSr")}</span>
            <span className="hl" aria-hidden="true">
              {tst("heroLine1")}
            </span>
            <StudioRotator words={words} />
            <span className="hl" aria-hidden="true">
              {tst("heroLine3")}
            </span>
          </h1>
          <p className="hero-sub">{tst("heroSub")}</p>
          <div className="hero-cta">
            <Link className="btn-fill" href="/calculator">
              {t("hero.ctaPrimary")} <span className="ar" aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
        <div className="scroll-cue" aria-hidden="true">
          <span>{tr("scroll")}</span>
          <span className="line" />
        </div>
      </section>

      <section className="panel" aria-label={t("eyebrows.about")}>
        <div className="wrap inr">
          <div className="statline">
            {STAT_KEYS.map((key) => {
              const value = t(`stats.${key}.value`);
              const s = splitStat(value);
              return (
                <div key={key} className="stat rv">
                  <div className="n">
                    {s ? (
                      <span data-count={s.n} data-suffix={s.suffix}>
                        {value}
                      </span>
                    ) : (
                      value
                    )}
                  </div>
                  <div className="l">{t(`stats.${key}.label`)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <section className="panel dark calc">
        <span className="glow" aria-hidden="true" />
        <div className="wrap inr">
          <span className="kick center">{t("eyebrows.calculator")}</span>
          <h2 className="rv">{t("calcTitle")}</h2>
          <p className="rv">{t("calcText")}</p>
          <Link className="btn-fill rv" href="/calculator">
            {t("hero.ctaPrimary")} <span className="ar" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="panel" id="work">
        <div className="wrap inr">
          <div className="sec-head">
            <div className="l">
              <span className="kick">{t("projectsTitle")}</span>
              <h2>{t("eyebrows.projects")}</h2>
            </div>
            <div className="r">{tst("workNote")}</div>
          </div>
          <div className="caro">
            <div className="carotrack" id="s-carotrack">
              {projects.map((p, i) => (
                <Link
                  key={p.slug}
                  className="pcard"
                  href={`/projects/${p.slug}`}
                >
                  <div className="pcimg">
                    <span className="pctag">
                      {tp(`categories.${p.category}`)} · {p.year}
                    </span>
                    <Image
                      src={p.image}
                      alt={p.title}
                      fill
                      sizes="(max-width: 480px) 84vw, 400px"
                      loading={i < 2 ? "eager" : "lazy"}
                    />
                  </div>
                  <div className="pcbody">
                    <h3>{p.title}</h3>
                    <p>{p.description}</p>
                    <div className="pcfoot">
                      <span className="popen">
                        {tst("more")} <span className="ar" aria-hidden="true">→</span>
                      </span>
                      <span className="pcyr">{p.technologies.slice(0, 2).join(" · ")}</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            <StudioCaroNav
              trackId="s-carotrack"
              labels={{ prev: tst("prev"), next: tst("next"), hint: tst("caroHint") }}
            />
          </div>
          <Link
            href="/projects"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 9,
              marginTop: 28,
              fontWeight: 600,
              color: "var(--acc)",
              textDecoration: "none",
            }}
          >
            {t("allProjects")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <section className="panel" id="services" style={{ background: "var(--card)" }}>
        <div className="wrap inr">
          <div className="sec-head">
            <div className="l">
              <span className="kick">{t("servicesTitle")}</span>
              <h2>{t("eyebrows.services")}</h2>
            </div>
            <div className="r">{tst("servicesNote")}</div>
          </div>
          <div className="svc-tbl">
            {SERVICE_KEYS.map((key, i) => (
              <Link key={key} className="srow" href={`/services/${key}`}>
                <span className="no">{pad(i + 1)}</span>
                <span className="nm">{ts(`items.${key}.title`)}</span>
                <span className="ds">{ts(`items.${key}.desc`)}</span>
                <span className="pr">
                  <span className="f">{t("from")}</span> <span className="v">{formatUsd(basePriceUsd(key))}</span>
                </span>
                <span className="arr" aria-hidden="true">
                  →
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="panel" id="process">
        <div className="wrap inr">
          <div className="sec-head">
            <div className="l">
              <span className="kick">{t("processTitle")}</span>
              <h2>{t("eyebrows.process")}</h2>
            </div>
            <div className="r">{tst("processNote")}</div>
          </div>
          <div className="proc" id="s-proc">
            <div className="rail" aria-hidden="true">
              <div className="rail-fill" />
            </div>
            {PROCESS_KEYS.map((key, i) => (
              <div key={key} className={i === 0 ? "pstep on" : "pstep"}>
                <span className="dot" aria-hidden="true" />
                <div className="top">
                  <span className="num">{pad(i + 1)}</span>
                  <span className="bd">{t(`process.${key}.badge`)}</span>
                </div>
                <h3>{t(`process.${key}.title`)}</h3>
                <p>{t(`process.${key}.text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel final" id="contact" style={{ background: "var(--card)" }}>
        <div className="wrap inr">
          <span className="kick center">{t("eyebrows.contact")}</span>
          <h2 className="rv" style={{ marginTop: 20 }}>
            {tr("finalA")} <em>{tr("finalB")}</em>
          </h2>
          <Link className="btn-fill rv" href="/contact">
            {t("finalCta")} <span className="ar" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
