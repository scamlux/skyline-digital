import { getTranslations } from "next-intl/server";
import { AuditRunner } from "@/components/audit/AuditRunner";

/** «Аудит сайта» в варианте Studio: тёмная шапка и тот же `AuditRunner` (перекрашен `.v-embed`) на светлой панели. */
export async function StudioAudit({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "audit" });

  return (
    <>
      <section className="s-phead">
        <div className="wrap">
          <span className="kick">{t("eyebrow")}</span>
          <h1>{t("title")}</h1>
          <p>{t("subtitle")}</p>
        </div>
      </section>
      <section className="panel">
        <div className="wrap inr">
          <div className="v-embed" style={{ maxWidth: 900 }}>
            <AuditRunner />
          </div>
        </div>
      </section>
    </>
  );
}
