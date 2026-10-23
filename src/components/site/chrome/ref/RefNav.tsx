"use client";

import { useCallback, useRef, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { RefLocales } from "./RefLocales";
import { useDialog } from "./useDialog";

export type RefNavItem = { href: string; label: string };

/**
 * Шапка и полноэкранное меню Референса (эталон: `.r-nav`, `.r-menu`).
 * Шапка — logo + «Рассчитать ↗» + «Меню»; меню выезжает сверху на весь экран
 * и закрывается кнопкой, Esc или переходом по ссылке.
 */
export function RefNav({
  items,
  labels,
  contacts,
}: {
  items: RefNavItem[];
  labels: { menu: string; close: string; calc: string; home: string };
  contacts: { href: string; label: string; external?: boolean }[];
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const close = useCallback(() => setOpen(false), []);
  useDialog(open, menuRef, close);

  // Переход на другую страницу (в т.ч. смена языка) — меню закрывается.
  const [seenPath, setSeenPath] = useState(pathname);
  if (seenPath !== pathname) {
    setSeenPath(pathname);
    setOpen(false);
  }

  const logo = (
    <Link href="/" className="r-logo" aria-label={`Skyline Digital — ${labels.home}`} onClick={close}>
      SKYLINE<b>.</b>
    </Link>
  );

  return (
    <>
      <header className="r-nav">
        {logo}
        <div className="r-navr">
          <Link href="/calculator" className="r-pill">
            {labels.calc} <span aria-hidden="true">↗</span>
          </Link>
          <button
            type="button"
            className="r-menubtn"
            aria-expanded={open}
            aria-controls="r-menu"
            onClick={() => setOpen(true)}
          >
            {labels.menu}
            <span className="bars" aria-hidden="true">
              <i />
              <i />
            </span>
          </button>
        </div>
      </header>

      <div
        ref={menuRef}
        id="r-menu"
        className={open ? "r-menu open" : "r-menu"}
        role="dialog"
        aria-modal="true"
        aria-label={labels.menu}
        inert={!open}
      >
        <div className="mtop">
          {logo}
          <button type="button" className="mclose" onClick={close}>
            {labels.close} <span aria-hidden="true">✕</span>
          </button>
        </div>
        <nav className="mnav" aria-label={labels.menu}>
          {items.map((it, i) => (
            <Link
              key={it.href}
              href={it.href}
              onClick={close}
              aria-current={pathname === it.href || pathname.startsWith(`${it.href}/`) ? "page" : undefined}
            >
              {it.label}
              <span className="mi" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
            </Link>
          ))}
        </nav>
        <div className="mfoot">
          {contacts.map((c) => (
            <a key={c.href} href={c.href} {...(c.external ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
              {c.label}
            </a>
          ))}
          <RefLocales />
        </div>
      </div>
    </>
  );
}
