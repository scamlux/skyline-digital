import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { basePriceUsd } from "@/lib/pricing/rules";
import { SERVICE_KEYS, splitDots } from "@/lib/site/service-page";
import { formatUsd } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/** Список услуг в варианте «Референс»: крупные строки-индекс с ценой «от», преимуществами и примерами. */
export async function RefServices({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  const [t, th, tr] = await Promise.all([
    getTranslations("services"),
    getTranslations("home"),
    getTranslations("home.ref"),
  ]);

  return (
    <>
      <section className="r-sec r-phead">
        <p className="r-label">
          {th("eyebrows.services")} — {pad(SERVICE_KEYS.length)}
        </p>
        <h1 className="r-ptitle">{t("title")}</h1>
        <p className="r-pintro">{t("intro")}</p>
      </section>

      <section className="r-sec r-psec" aria-label={t("title")}>
        <div className="r-svlist">
          {SERVICE_KEYS.map((key, i) => (
            <article key={key} className="r-svrow">
              <Link href={`/services/${key}`} className="r-svhead">
                <span className="no">{pad(i + 1)}</span>
                <h2>{t(`items.${key}.title`)}</h2>
                <span className="pr">
                  {t("from")} {formatUsd(basePriceUsd(key))}
                </span>
                <span className="ar" aria-hidden="true">
                  ↗
                </span>
              </Link>
              <div className="r-svbody">
                <p>{t(`items.${key}.desc`)}</p>
                <dl className="r-lane">
                  <div>
                    <dt>{t("benefitsLabel")}</dt>
                    <dd>{splitDots(t(`items.${key}.benefits`)).join(" · ")}</dd>
                  </div>
                  <div>
                    <dt>{t("examplesLabel")}</dt>
                    <dd>{splitDots(t(`items.${key}.examples`)).join(" · ")}</dd>
                  </div>
                </dl>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="r-final">
        <p className="r-label">{t("ctaHint")}</p>
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
