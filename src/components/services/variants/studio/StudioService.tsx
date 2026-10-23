import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { getServicePage, isServiceKey } from "@/lib/site/service-page";
import { formatUsd } from "@/lib/utils";

/** Деталка услуги в варианте Studio: тёмная шапка с ценой, состав, кейсы, FAQ, тёмный CTA в калькулятор. */
export async function StudioService({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isServiceKey(slug)) notFound();
  const [t, tp, th, tst, data] = await Promise.all([
    getTranslations("services"),
    getTranslations("projects"),
    getTranslations("home"),
    getTranslations("home.studio"),
    getServicePage(locale, slug),
  ]);
  const { price, benefits, features, cases, faq, jsonLd } = data;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="s-phead">
        <div className="wrap">
          <Link href="/services" className="s-back">
            ← {t("title")}
          </Link>
          <span className="kick">{th("eyebrows.services")}</span>
          <h1>{t(`items.${slug}.title`)}</h1>
          <p>{t(`items.${slug}.desc`)}</p>
          <div className="s-pricecta">
            <Link className="btn-fill" href={`/calculator?type=${slug}`}>
              {t("ctaButton")} <span className="ar" aria-hidden="true">→</span>
            </Link>
            <span>
              {t("from")} <b>{formatUsd(price)}</b>
            </span>
          </div>
        </div>
      </section>

      <section className="panel">
        <div className="wrap inr">
          <div className="sec-head">
            <div className="l">
              <span className="kick">{t("title")}</span>
              <h2>{t("includedLabel")}</h2>
            </div>
          </div>
          <ul className="s-incl">
            {benefits.map((b) => (
              <li key={b}>{b}</li>
            ))}
            {features.map((f) => (
              <li key={f.key}>
                {f.label}
                <span>{f.price}</span>
              </li>
            ))}
          </ul>

          {cases.length > 0 && (
            <div className="s-cases">
              <div className="sec-head">
                <div className="l">
                  <h2>{t("casesLabel")}</h2>
                </div>
                <div className="r">
                  <Link href="/projects">{t("allProjects")} →</Link>
                </div>
              </div>
              <div className="s-pgrid">
                {cases.map((p) => (
                  <Link key={p.slug} className="pcard" href={`/projects/${p.slug}`}>
                    <div className="pcimg">
                      <span className="pctag">
                        {tp(`categories.${p.category}`)} · {p.year}
                      </span>
                      <Image src={p.image} alt={p.title} fill sizes="(max-width: 700px) 92vw, 380px" />
                    </div>
                    <div className="pcbody">
                      <h3>{p.title}</h3>
                      <p>{p.description}</p>
                      <div className="pcfoot">
                        <span className="popen">
                          {tst("more")} <span className="ar" aria-hidden="true">→</span>
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          )}

          <div className="s-faq">
            <h2>{t("faqTitle")}</h2>
            {faq.map(({ q, a }) => (
              <details key={q}>
                <summary>{q}</summary>
                <p>{a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="panel dark calc">
        <span className="glow" aria-hidden="true" />
        <div className="wrap inr">
          <span className="kick center">{th("eyebrows.calculator")}</span>
          <h2 className="rv">{t("ctaTitle")}</h2>
          <p className="rv">{t("ctaText")}</p>
          <Link className="btn-fill rv" href={`/calculator?type=${slug}`}>
            {t("ctaButton")} <span className="ar" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
