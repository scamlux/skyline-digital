import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { StudioFinal } from "@/components/site/chrome/studio/StudioFinal";
import { basePriceUsd } from "@/lib/pricing/rules";
import { SERVICE_KEYS, splitDots } from "@/lib/site/service-page";
import { formatUsd } from "@/lib/utils";

const pad = (n: number) => String(n).padStart(2, "0");

/** Список услуг в варианте Studio: таблица-строки как на главной + карточки с составом и примерами. */
export async function StudioServices({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  const [t, th] = await Promise.all([getTranslations("services"), getTranslations("home")]);

  return (
    <>
      <section className="s-phead">
        <div className="wrap">
          <span className="kick">{th("eyebrows.services")}</span>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
        </div>
      </section>

      <section className="panel">
        <div className="wrap inr">
          <div className="s-svgrid">
            {SERVICE_KEYS.map((key, i) => (
              <article key={key} className="s-svcard rv">
                <div className="top">
                  <span className="no">{pad(i + 1)}</span>
                  <span className="pr">
                    <span className="f">{t("from")}</span> {formatUsd(basePriceUsd(key))}
                  </span>
                </div>
                <h2>
                  <Link href={`/services/${key}`}>{t(`items.${key}.title`)}</Link>
                </h2>
                <p>{t(`items.${key}.desc`)}</p>
                <div className="cols">
                  <div>
                    <h3>{t("benefitsLabel")}</h3>
                    <ul>
                      {splitDots(t(`items.${key}.benefits`)).map((b) => (
                        <li key={b}>{b}</li>
                      ))}
                    </ul>
                  </div>
                  <div>
                    <h3>{t("examplesLabel")}</h3>
                    <ul>
                      {splitDots(t(`items.${key}.examples`)).map((e) => (
                        <li key={e}>{e}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <StudioFinal />
    </>
  );
}
