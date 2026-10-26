import { getTranslations } from "next-intl/server";
import { AuditRunner } from "@/components/audit/AuditRunner";

/** «Аудит сайта» в варианте «Референс»: тот же `AuditRunner`, перекрашенный через `.v-embed`. */
export async function RefAudit({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "audit" });

  return (
    <>
      <section className="r-sec r-phead">
        <p className="r-label">{t("eyebrow")}</p>
        <h1 className="r-ptitle">{t("title")}</h1>
        <p className="r-pintro">{t("subtitle")}</p>
      </section>
      <section className="r-sec" style={{ paddingTop: 0 }}>
        <div className="v-embed" style={{ maxWidth: 900 }}>
          <AuditRunner />
        </div>
      </section>
    </>
  );
}
