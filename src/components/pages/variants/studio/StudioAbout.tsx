import { getTranslations } from "next-intl/server";
import { StudioFinal } from "@/components/site/chrome/studio/StudioFinal";
import { STACK } from "@/lib/stack";

const VALUES = ["v1", "v2", "v3"] as const;
const STAT_KEYS = ["projects", "years", "langs"] as const;

/** «О нас» в варианте Studio: шапка, два абзаца, принципы-карточки, цифры, тёмная панель стека, CTA. */
export async function StudioAbout({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  const [t, th] = await Promise.all([getTranslations("about"), getTranslations("home")]);

  return (
    <>
      <section className="s-phead">
        <div className="wrap">
          <span className="kick">{th("eyebrows.about")}</span>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
        </div>
      </section>

      <section className="panel">
        <div className="wrap inr">
          <div className="s-lead">
            <p>{t("p1")}</p>
            <p>{t("p2")}</p>
          </div>
          <div className="sec-head" style={{ marginTop: 64, marginBottom: 0 }}>
            <div className="l">
              <h2>{t("valuesTitle")}</h2>
            </div>
          </div>
          <div className="s-vals">
            {VALUES.map((key, i) => (
              <article key={key} className="rv">
                <span className="num">{String(i + 1).padStart(2, "0")}</span>
                <h2>{t(`${key}.title`)}</h2>
                <p>{t(`${key}.text`)}</p>
              </article>
            ))}
          </div>
          <div className="statline" style={{ marginTop: 22 }}>
            {STAT_KEYS.map((key) => (
              <div key={key} className="stat rv">
                <div className="n">{th(`stats.${key}.value`)}</div>
                <div className="l">{th(`stats.${key}.label`)}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="panel dark">
        <div className="wrap inr">
          <div className="sec-head">
            <div className="l">
              <span className="kick">{th("eyebrows.stack")}</span>
              <h2>{t("stackTitle")}</h2>
            </div>
          </div>
          <div className="s-stack">
            {STACK.map((tech) => (
              <span key={tech}>{tech}</span>
            ))}
          </div>
        </div>
      </section>

      <StudioFinal />
    </>
  );
}
