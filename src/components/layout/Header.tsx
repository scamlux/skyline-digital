"use client";

import { useState } from "react";
import { useTranslations, useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/services", key: "services" },
  { href: "/projects", key: "projects" },
  { href: "/about", key: "about" },
  { href: "/contact", key: "contact" },
] as const;

/**
 * The header is part of the "night sky" — it shares the hero's background so
 * on the home page they merge into one canvas.
 */
export function Header() {
  const t = useTranslations("nav");
  const locale = useLocale();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-night text-day">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 md:px-8">
        <Link
          href="/"
          className="font-display text-sm font-medium tracking-wide"
          onClick={() => setOpen(false)}
        >
          skyline<span className="text-apricot">.</span>digital
        </Link>

        <nav className="hidden items-center gap-8 md:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "text-sm text-mist transition-colors hover:text-day",
                pathname.startsWith(item.href) && "text-day",
              )}
            >
              {t(item.key)}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-5 md:flex">
          <LocaleSwitcher current={locale} pathname={pathname} />
          <Link
            href="/calculator"
            className="horizon-gradient rounded-full px-5 py-2.5 text-sm font-medium text-night transition-opacity hover:opacity-90"
          >
            {t("calculate")}
          </Link>
        </div>

        <button
          type="button"
          className="md:hidden"
          aria-expanded={open}
          aria-label={t("menu")}
          onClick={() => setOpen((v) => !v)}
        >
          <span className="font-mono text-sm">{open ? "×" : "≡"}</span>
        </button>
      </div>

      {open && (
        <div className="border-t border-line-night px-5 pb-6 md:hidden">
          <nav className="flex flex-col gap-4 py-4" aria-label="Mobile">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-base text-day"
                onClick={() => setOpen(false)}
              >
                {t(item.key)}
              </Link>
            ))}
          </nav>
          <div className="flex items-center justify-between gap-4">
            <LocaleSwitcher current={locale} pathname={pathname} />
            <Link
              href="/calculator"
              className="horizon-gradient rounded-full px-5 py-2.5 text-sm font-medium text-night"
              onClick={() => setOpen(false)}
            >
              {t("calculate")}
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

function LocaleSwitcher({
  current,
  pathname,
}: {
  current: string;
  pathname: string;
}) {
  return (
    <div className="flex items-center gap-2 font-mono text-xs uppercase">
      {routing.locales.map((loc) => (
        <Link
          key={loc}
          href={pathname}
          locale={loc}
          className={cn(
            "transition-colors",
            loc === current ? "text-apricot" : "text-mist hover:text-day",
          )}
        >
          {loc}
        </Link>
      ))}
    </div>
  );
}
