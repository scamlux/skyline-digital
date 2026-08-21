import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CONTACTS, CONTACT_LINKS, telegramHandle } from "@/lib/contact";

export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="bg-night text-day">
      {/* The horizon: day above, night below. */}
      <div className="horizon-gradient h-px w-full opacity-80" aria-hidden />
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-3 md:px-8">
        <div>
          <p className="font-display text-sm font-medium">
            skyline<span className="text-apricot">.</span>digital
          </p>
          <p className="mt-3 hidden max-w-xs text-sm leading-relaxed text-mist md:block">
            {t("tagline")}
          </p>
        </div>
        <nav className="hidden flex-col gap-3 text-sm md:flex" aria-label="Footer">
          <Link href="/services" className="text-mist transition-colors hover:text-day">
            {t("services")}
          </Link>
          <Link href="/projects" className="text-mist transition-colors hover:text-day">
            {t("projects")}
          </Link>
          <Link href="/about" className="text-mist transition-colors hover:text-day">
            {t("about")}
          </Link>
          <Link href="/contact" className="text-mist transition-colors hover:text-day">
            {t("contact")}
          </Link>
        </nav>
        <div className="flex flex-col gap-3 text-sm md:items-end">
          <Link
            href="/calculator"
            className="horizon-gradient hidden w-fit rounded-full px-5 py-2.5 font-medium text-night transition-opacity hover:opacity-90 md:inline-block"
          >
            {t("cta")}
          </Link>
          <div className="flex flex-col gap-2 text-sm md:items-end">
            <a
              href={CONTACT_LINKS.email}
              className="text-mist transition-colors hover:text-day"
            >
              {CONTACTS.email}
            </a>
            <a
              href={CONTACT_LINKS.phone}
              className="text-mist transition-colors hover:text-day"
            >
              {CONTACTS.phoneDisplay}
            </a>
            <a
              href={CONTACT_LINKS.telegram}
              target="_blank"
              rel="noopener noreferrer"
              className="text-mist transition-colors hover:text-day"
            >
              {telegramHandle}
            </a>
          </div>
          <p className="mt-auto font-mono text-xs text-mist">
            © {year} Skyline Digital · {t("location")}
          </p>
        </div>
      </div>
    </footer>
  );
}
