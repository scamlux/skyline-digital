"use client";

import { useCallback, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { Locales } from "../shared/Locales";
import { useDialog } from "../shared/useDialog";

export type StudioNavItem = { href: string; label: string };

/**
 * Шапка-«остров» Studio (эталон: `.nav .island`) и мобильное меню-шторка (`.msheet`).
 * На широких экранах — ссылки, языки и «Рассчитать»; до 820px — бургер со шторкой.
 */
export function StudioNav({
  items,
  labels,
}: {
  items: StudioNavItem[];
  labels: { menu: string; close: string; calc: string; calcFull: string; home: string };
}) {
  const [open, setOpen] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const close = useCallback(() => setOpen(false), []);
  useDialog(open, sheetRef, close);

  // Переход на другую страницу (в т.ч. смена языка) — шторка закрывается.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  const current = (href: string) =>
    pathname === href || pathname.startsWith(`${href}/`) ? ("page" as const) : undefined;

  return (
    <>
      <header className="nav">
        <div className="island">
          <Link href="/" className="logo" aria-label={`Skyline Digital — ${labels.home}`}>
            <i aria-hidden="true" />
            Skyline
          </Link>
          <nav className="links" aria-label={labels.menu}>
            {items.map((it) => (
              <Link key={it.href} href={it.href} aria-current={current(it.href)}>
                {it.label}
              </Link>
            ))}
          </nav>
          <Locales />
          <Link className="navcta" href="/calculator">
            {labels.calc}
          </Link>
          <button
            type="button"
            className="burger"
            aria-label={labels.menu}
            aria-expanded={open}
            aria-controls="s-menu"
            onClick={() => setOpen(true)}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M3 6h18M3 12h18M3 18h18" />
            </svg>
          </button>
        </div>
      </header>

      <div
        ref={sheetRef}
        id="s-menu"
        className={open ? "msheet open" : "msheet"}
        role="dialog"
        aria-modal="true"
        aria-label={labels.menu}
        tabIndex={-1}
        inert={!open}
      >
        <button type="button" className="mclose" aria-label={labels.close} onClick={close}>
          ×
        </button>
        {items.map((it) => (
          <Link key={it.href} href={it.href} onClick={close} aria-current={current(it.href)}>
            {it.label}
          </Link>
        ))}
        <Link className="btn-fill" href="/calculator" onClick={close}>
          {labels.calcFull}
        </Link>
        <Locales />
      </div>
    </>
  );
}
