import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ContactForm } from "@/components/contact/ContactForm";
import { CONTACTS, CONTACT_LINKS, telegramHandle } from "@/lib/contact";

/** «Контакты» в варианте Studio: тот же `ContactForm` (перекрашен `.v-embed`), прямые контакты, калькулятор. */
export async function StudioContact({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  const [t, th] = await Promise.all([getTranslations("contact"), getTranslations("home")]);

  return (
    <>
      <section className="s-phead">
        <div className="wrap">
          <span className="kick">{th("eyebrows.contact")}</span>
          <h1>{t("title")}</h1>
          <p>{t("intro")}</p>
        </div>
      </section>

      <section className="panel">
        <div className="wrap inr">
          <div className="s-split">
            <div className="v-embed v-light">
              <ContactForm />
            </div>
            <aside style={{ display: "grid", gap: 18 }}>
              <div className="s-aside">
                <h2>{t("directTitle")}</h2>
                <ul>
                  <li>
                    <a href={CONTACT_LINKS.email}>
                      {CONTACTS.email} <span>Email</span>
                    </a>
                  </li>
                  <li>
                    <a href={CONTACT_LINKS.phone}>
                      {CONTACTS.phoneDisplay} <span>Tel</span>
                    </a>
                  </li>
                  <li>
                    <a href={CONTACT_LINKS.telegram} target="_blank" rel="noopener noreferrer">
                      {telegramHandle} <span>Telegram</span>
                    </a>
                  </li>
                </ul>
              </div>
              <div className="s-aside">
                <h2>{t("altTitle")}</h2>
                <p>{t("altText")}</p>
                <Link className="btn-fill" href="/calculator" style={{ marginTop: 18 }}>
                  {t("altCta")} <span className="ar" aria-hidden="true">→</span>
                </Link>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </>
  );
}
