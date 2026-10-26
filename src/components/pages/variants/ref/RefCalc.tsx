import { getTranslations } from "next-intl/server";
import { Wizard } from "@/components/calculator/Wizard";
import { EstimateView } from "@/components/estimate/EstimateView";

/** Калькулятор в варианте «Референс»: тот же `Wizard` (расчёт и отправка не тронуты), перекрашен `.v-embed`. */
export async function RefCalculator({
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
      <section className="r-sec r-phead">
        <p className="r-label">{th("eyebrows.calculator")}</p>
        <h1 className="r-ptitle">{t("title")}</h1>
        <p className="r-pintro">{t("intro")}</p>
      </section>
      <section className="r-sec" style={{ paddingTop: 0 }}>
        <div className="v-embed" style={{ maxWidth: 960 }}>
          <Wizard initialType={type} />
        </div>
      </section>
    </>
  );
}

/** Смета в варианте «Референс»: тело старой страницы сметы, перекрашенное `.v-embed`. */
export async function RefEstimate({ params }: { params: Promise<{ locale: string; token: string }> }) {
  const { token } = await params;
  return (
    <div className="v-embed v-page">
      <EstimateView token={token} wrapper="div" />
    </div>
  );
}
