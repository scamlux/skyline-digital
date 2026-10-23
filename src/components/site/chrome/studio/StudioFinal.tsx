import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";

/** Финальный CTA Studio (эталон: `.panel.final`) — общий для внутренних страниц. */
export async function StudioFinal({ title }: { title?: string }) {
  const [th, tr] = await Promise.all([getTranslations("home"), getTranslations("home.ref")]);
  return (
    <section className="panel final" style={{ background: "var(--card)" }}>
      <div className="wrap inr">
        <span className="kick center">{th("eyebrows.contact")}</span>
        <h2 className="rv" style={{ marginTop: 20 }}>
          {title ?? tr("finalA")} <em>{tr("finalB")}</em>
        </h2>
        <Link className="btn-fill rv" href="/calculator">
          {th("hero.ctaPrimary")} <span className="ar" aria-hidden="true">→</span>
        </Link>
      </div>
    </section>
  );
}
