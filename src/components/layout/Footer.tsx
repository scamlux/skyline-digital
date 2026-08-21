import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { CONTACTS, CONTACT_LINKS, telegramHandle } from "@/lib/contact";

/**
 * Footer as the page's horizon at dusk: a single gradient hairline (day above,
 * night below) is the only bold move. Below it, two quiet tiers — brand and
 * contacts, then a thin rule, then copyright and a few text links. No loud CTA
 * button: the header already carries "Связаться с нами" and each page its own.
 */
export function Footer() {
  const t = useTranslations("footer");
  const year = new Date().getFullYear();

  const contacts = [
    { href: CONTACT_LINKS.email, label: CONTACTS.email },
    { href: CONTACT_LINKS.phone, label: CONTACTS.phoneDisplay },
    { href: CONTACT_LINKS.telegram, label: telegramHandle, external: true },
  ];

  const nav = [
    { href: "/services", label: t("services") },
    { href: "/projects", label: t("projects") },
    { href: "/about", label: t("about") },
  ];

  return (
    <footer className="bg-night text-day">
      {/* The horizon: day above, night below — the footer's one signature. */}
      <div className="horizon-gradient h-px w-full opacity-80" aria-hidden />

      <div className="mx-auto max-w-6xl px-5 py-14 md:px-8">
        {/* Tier 1: brand + contacts */}
        <div className="flex flex-col gap-10 md:flex-row md:items-start md:justify-between">
          <div className="max-w-sm">
            <p className="font-display text-base font-medium">
              skyline<span className="text-apricot">.</span>digital
            </p>
            <p className="mt-3 hidden text-sm leading-relaxed text-mist md:block">
              {t("tagline")}
            </p>
          </div>

          <div className="md:text-right">
            <p className="font-mono text-xs uppercase tracking-[0.2em] text-mist">
              {t("contact")}
            </p>
            <ul className="mt-4 flex flex-col gap-2 text-sm md:items-end">
              {contacts.map((c) => (
                <li key={c.label}>
                  <a
                    href={c.href}
                    {...(c.external
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                    className="text-day/80 transition-colors hover:text-apricot"
                  >
                    {c.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Thin rule between the tiers */}
        <div className="mt-12 h-px w-full bg-line-night" aria-hidden />

        {/* Tier 2: copyright + quiet nav */}
        <div className="mt-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="font-mono text-xs text-mist">
            © {year} Skyline Digital · {t("location")}
          </p>
          <nav className="hidden gap-6 text-sm md:flex" aria-label="Footer">
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className="text-mist transition-colors hover:text-day"
              >
                {n.label}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </footer>
  );
}
