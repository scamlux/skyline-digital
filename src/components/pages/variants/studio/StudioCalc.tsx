import { getTranslations } from "next-intl/server";
import { Wizard } from "@/components/calculator/Wizard";
import { EstimateView } from "@/components/estimate/EstimateView";

/** Калькулятор в варианте Studio: шапка и тот же `Wizard` на тёмной панели (перекрашен `.v-embed`). */
export async function StudioCalculator({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ type?: string }>;
}) {
  await params;
  const { type } = await searchParams;
  const [t, th] = await Promise.all([getTranslations("calc"), getTranslations("home")]);
  return (
    <>
      <section className="s-phead">
        <div className="wrap">
          <span className="kick">{th("eyebrows.calculator")}</span>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
        </div>
      </section>
      <section className="panel dark">
        <div className="wrap inr">
          <div className="v-embed" style={{ maxWidth: 960, margin: "0 auto" }}>
            <Wizard initialType={type} />
          </div>
        </div>
      </section>
    </>
  );
}

/** Смета в варианте Studio: тело старой страницы сметы, перекрашенное `.v-embed`. */
export async function StudioEstimate({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { token } = await params;
  return (
    <div className="v-embed v-page">
      <EstimateView token={token} wrapper="div" />
    </div>
  );
}
