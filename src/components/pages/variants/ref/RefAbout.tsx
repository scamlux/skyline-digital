import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { STACK } from "@/lib/stack";

const VALUES = ["v1", "v2", "v3"] as const;
const STAT_KEYS = ["projects", "years", "langs"] as const;

/** «О нас» в варианте «Референс»: крупный заголовок, два абзаца, принципы, цифры, стек, CTA. */
export async function RefAbout({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  const [t, th, tr] = await Promise.all([
    getTranslations("about"),
    getTranslations("home"),
    getTranslations("home.ref"),
  ]);

  return (
    <>
      <section className="r-sec r-phead">
        <p className="r-label">{th("eyebrows.about")}</p>
        <h1 className="r-ptitle">{t("title")}</h1>
        <p className="r-pintro">{t("intro")}</p>
      </section>

      <section className="r-sec">
        <div className="r-lead">
          <p>{t("p1")}</p>
          <p>{t("p2")}</p>
        </div>
      </section>

      <section className="r-sec">
        <p className="r-label">{t("valuesTitle")}</p>
        <div className="r-vals">
          {VALUES.map((key, i) => (
            <article key={key}>
              <span className="r-pcc">{String(i + 1).padStart(2, "0")}</span>
              <h2>{t(`${key}.title`)}</h2>
              <p>{t(`${key}.text`)}</p>
            </article>
          ))}
        </div>
        <div className="r-stats" style={{ marginTop: 64 }}>
          {STAT_KEYS.map((key, i) => (
            <div key={key}>
              <div className="n">{i === 0 ? <b>{th(`stats.${key}.value`)}</b> : th(`stats.${key}.value`)}</div>
              <div className="l">{th(`stats.${key}.label`)}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="r-sec">
        <p className="r-label">{t("stackTitle")}</p>
        <div className="r-stack">
          {STACK.map((tech) => (
            <span key={tech}>{tech}</span>
          ))}
        </div>
      </section>

      <section className="r-final">
        <p className="r-label">{th("eyebrows.contact")}</p>
        <h2>
          {tr("finalA")}
          <br />
          <em>{tr("finalB")}</em>
        </h2>
        <div className="r-hcta">
          <Link href="/calculator" className="r-cta">
            {t("cta")} <span aria-hidden="true">→</span>
          </Link>
          <Link href="/contact" className="r-cta ghost">
            {th("finalCta")}
          </Link>
        </div>
      </section>
    </>
  );
}
