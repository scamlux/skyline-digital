import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { HorizontalPin } from "@/components/site/chrome/ref/HorizontalPin";
import { getProjects } from "@/lib/portfolio";
import { basePriceUsd } from "@/lib/pricing/rules";
import { formatUsd } from "@/lib/utils";
import type { HomeVariantProps } from "../index";

// Тот же порядок, что в OldHome / services (там список тоже объявлен локально).
const SERVICE_KEYS = ["website", "webApp", "mobileApp", "ai", "automation", "uiux"] as const;
const PROCESS_KEYS = ["brief", "estimate", "design", "build", "launch"] as const;

const pad = (n: number) => String(n).padStart(2, "0");

/** «Сайты, приложения и *AI-решения*, …» → кусок в звёздочках подсвечивается акцентом. */
function accentTitle(title: string) {
  return title.split(/(\*[^*]+\*)/g).map((part, i) =>
    part.startsWith("*") && part.endsWith("*") ? <em key={i}>{part.slice(1, -1)}</em> : part,
  );
}

/**
 * Главная в варианте «Референс» (фаза 1, шаг 1): hero, услуги, проекты и
 * «Как мы работаем» — три горизонтальные секции, финальный CTA.
 * Preloader, курсор, полноэкранное меню, «Философия» и FLIP-кейс — следующий шаг.
 */
export async function RefHome({ params }: HomeVariantProps) {
  await params;
  const [t, ts, tp, tf, projects] = await Promise.all([
    getTranslations("home"),
    getTranslations("services"),
    getTranslations("projects"),
    getTranslations("footer"),
    getProjects(),
  ]);

  return (
    <>
      <section className="r-hero">
        <p className="r-label">Skyline Digital · {tf("location")}</p>
        <h1 className="r-h1">{accentTitle(t("hero.title"))}</h1>
        <p className="r-sub">{t("hero.subtitle")}</p>
        <div className="r-cta">
          <Link href="/calculator" className="r-btn">
            {t("hero.ctaPrimary")} <span aria-hidden="true">→</span>
          </Link>
          <Link href="/projects" className="r-btn ghost">
            {t("hero.ctaSecondary")}
          </Link>
        </div>
      </section>

      {/* ——— Услуги ——— */}
      <HorizontalPin
        id="r-svc"
        ariaLabel={t("servicesTitle")}
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
            <span className="pt">{ts(`items.${key}.title`)}</span>
            <p className="pd">{ts(`items.${key}.desc`)}</p>
            <span className="pp">
              <span>{t("ref.start")}</span>
              {t("from")} {formatUsd(basePriceUsd(key))}
            </span>
          </Link>
        ))}
      </HorizontalPin>

      {/* ——— Проекты ——— */}
      <HorizontalPin
        id="r-work"
        ariaLabel={t("projectsTitle")}
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
          <Link key={p.slug} href={`/projects/${p.slug}`} className="r-pcard">
            <div className="r-pcimg">
              <Image
                src={p.image}
                alt={p.title}
                fill
                sizes="(max-width: 900px) 78vw, 520px"
                priority={false}
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
              <span className="r-badge" style={{ marginTop: 14 }}>
                {t(`process.${key}.badge`)}
              </span>
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

      <section className="r-sec r-final">
        <p className="r-label">{t("eyebrows.contact")}</p>
        <h2 style={{ marginTop: 22 }}>{t("finalTitle")}</h2>
        <div className="r-cta" style={{ marginTop: 0 }}>
          <Link href="/contact" className="r-btn">
            {t("finalCta")} <span aria-hidden="true">→</span>
          </Link>
          <Link href="/calculator" className="r-btn ghost">
            {t("hero.ctaPrimary")}
          </Link>
        </div>
      </section>
    </>
  );
}
