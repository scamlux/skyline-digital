"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

/** Переключатель языка вариантов Studio/Референс — та же логика, что в старом Header. */
export function Locales() {
  const locale = useLocale();
  const pathname = usePathname();
  return (
    <nav className="r-locales" aria-label="Language">
      {routing.locales.map((loc) => (
        <Link key={loc} href={pathname} locale={loc} aria-current={loc === locale ? "true" : undefined}>
          {loc}
        </Link>
      ))}
    </nav>
  );
}
