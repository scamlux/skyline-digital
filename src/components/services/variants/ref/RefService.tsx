import Image from "next/image";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getServicePage, isServiceKey } from "@/lib/site/service-page";
import { formatUsd } from "@/lib/utils";

/** Деталка услуги в варианте «Референс»: цена «от», состав с ценами опций, кейсы, FAQ, CTA в калькулятор. */
export async function RefService({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  if (!isServiceKey(slug)) notFound();
  const [t, tp, th, data] = await Promise.all([
    getTranslations("services"),
    getTranslations("projects"),
    getTranslations("home"),
    getServicePage(locale, slug),
  ]);
  const { price, benefits, features, cases, faq, jsonLd } = data;

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <section className="r-sec r-phead">
        <Link href="/services" className="r-back">
          ← {t("title")}
        </Link>
        <p className="r-label" style={{ marginTop: 28 }}>
          {th("eyebrows.services")}
        </p>
        <h1 className="r-ptitle">{t(`items.${slug}.title`)}</h1>
        <p className="r-pintro">{t(`items.${slug}.desc`)}</p>
        <div className="r-hcta" style={{ justifyContent: "flex-start", alignItems: "center" }}>
          <Link href={`/calculator?type=${slug}`} className="r-cta">
            {t("ctaButton")} <span aria-hidden="true">→</span>
          </Link>
          <span className="r-svprice">
            <span>{t("from")}</span> {formatUsd(price)}
          </span>
        </div>
      </section>

      <section className="r-sec">
        <p className="r-label">{t("includedLabel")}</p>
        <ul className="r-incl">
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
      </section>

      {cases.length > 0 && (
        <section className="r-sec">
          <div className="r-hhead" style={{ paddingInline: 0 }}>
            <div>
              <p className="r-label">{t("casesLabel")}</p>
            </div>
            <p className="r-hint">
              <Link href="/projects">{t("allProjects")} →</Link>
            </p>
          </div>
          <div className="r-pgrid r-pgrid3">
            {cases.map((p) => (
              <Link key={p.slug} href={`/projects/${p.slug}`} className="r-pcard">
                <div className="r-pcimg">
                  <Image src={p.image} alt={p.title} fill sizes="(max-width: 760px) 92vw, 30vw" />
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
          </div>
        </section>
      )}

      <section className="r-sec">
        <p className="r-label">{t("faqTitle")}</p>
        <div className="r-faq">
          {faq.map(({ q, a }) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="r-final">
        <p className="r-label">{t("ctaText")}</p>
        <h2>{t("ctaTitle")}</h2>
        <div className="r-hcta">
          <Link href={`/calculator?type=${slug}`} className="r-cta">
            {t("ctaButton")} <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    </>
  );
}
