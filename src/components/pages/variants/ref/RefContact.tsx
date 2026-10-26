import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { ContactForm } from "@/components/contact/ContactForm";
import { CONTACTS, CONTACT_LINKS, telegramHandle } from "@/lib/contact";

/**
 * «Контакты» в варианте «Референс». Форма — тот же `ContactForm` (отправка, валидация,
 * антиспам без изменений), перекрашена через `.v-embed`.
 */
export async function RefContact({ params }: { params: Promise<{ locale: string }> }) {
  await params;
  const [t, th] = await Promise.all([getTranslations("contact"), getTranslations("home")]);

  return (
    <>
      <section className="r-sec r-phead">
        <p className="r-label">{th("eyebrows.contact")}</p>
        <h1 className="r-ptitle">{t("title")}</h1>
        <p className="r-pintro">{t("intro")}</p>
      </section>

      <section className="r-sec" style={{ paddingTop: 0 }}>
        <div className="r-split">
          <div className="v-embed v-form">
            <ContactForm />
          </div>
          <aside>
            <p className="r-label">{t("directTitle")}</p>
            <div className="r-direct">
              <a href={CONTACT_LINKS.email}>
                {CONTACTS.email} <span>Email</span>
              </a>
              <a href={CONTACT_LINKS.phone}>
                {CONTACTS.phoneDisplay} <span>Tel</span>
              </a>
              <a href={CONTACT_LINKS.telegram} target="_blank" rel="noopener noreferrer">
                {telegramHandle} <span>Telegram</span>
              </a>
            </div>
            <p className="r-label" style={{ marginTop: 48 }}>
              {t("altTitle")}
            </p>
            <p className="r-note" style={{ marginTop: 0 }}>
              {t("altText")}
            </p>
            <div className="r-hcta" style={{ justifyContent: "flex-start", marginTop: 22 }}>
              <Link href="/calculator" className="r-cta">
                {t("altCta")} <span aria-hidden="true">→</span>
              </Link>
            </div>
          </aside>
        </div>
      </section>
    </>
  );
}
