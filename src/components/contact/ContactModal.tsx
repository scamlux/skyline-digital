"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { CONTACTS, CONTACT_LINKS, telegramHandle } from "@/lib/contact";

type Row = {
  label: string;
  value: string;
  href: string;
  external?: boolean;
  icon: React.ReactNode;
};

/**
 * A "business card" modal: brand + role and three clickable contacts,
 * centered on a dimmed, blurred backdrop. Closes on backdrop click or Esc.
 */
export function ContactModal({ onClose }: { onClose: () => void }) {
  const t = useTranslations("contactCard");
  const cardRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  // Esc to close + lock body scroll while open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose]);

  const rows: Row[] = [
    {
      label: t("emailLabel"),
      value: CONTACTS.email,
      href: CONTACT_LINKS.email,
      icon: <IconMail />,
    },
    {
      label: t("phoneLabel"),
      value: CONTACTS.phoneDisplay,
      href: CONTACT_LINKS.phone,
      icon: <IconPhone />,
    },
    {
      label: t("telegramLabel"),
      value: telegramHandle,
      href: CONTACT_LINKS.telegram,
      external: true,
      icon: <IconTelegram />,
    },
  ];

  return createPortal(
    <div
      className="animate-backdrop-in fixed inset-0 z-[100] flex items-center justify-center bg-night/70 px-5 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={t("eyebrow")}
      onClick={onClose}
    >
      <div
        ref={cardRef}
        className="animate-card-in relative w-full max-w-md overflow-hidden rounded-2xl border border-line bg-surface shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Card header with the brand's horizon gradient */}
        <div className="horizon-gradient h-1 w-full" aria-hidden />

        <button
          ref={closeRef}
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full text-muted transition-colors hover:bg-day hover:text-ink"
        >
          <span className="text-lg leading-none">×</span>
        </button>

        <div className="px-7 pb-8 pt-7 md:px-9 md:pb-9">
          <p className="font-mono text-xs uppercase tracking-widest text-mist">
            {t("eyebrow")}
          </p>
          <p className="font-display mt-3 text-2xl font-medium text-ink">
            skyline<span className="text-apricot">.</span>digital
          </p>
          <p className="mt-1 text-sm text-muted">{t("role")}</p>

          <ul className="mt-7 flex flex-col gap-2">
            {rows.map((row, i) => (
              <li
                key={row.label}
                className="animate-card-row"
                style={{ "--d": `${180 + i * 90}ms` } as React.CSSProperties}
              >
                <a
                  href={row.href}
                  {...(row.external
                    ? { target: "_blank", rel: "noopener noreferrer" }
                    : {})}
                  className="group flex items-center gap-4 rounded-xl border border-line bg-day/60 px-4 py-3 transition-colors hover:border-apricot hover:bg-day"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-night text-day transition-transform group-hover:scale-105">
                    {row.icon}
                  </span>
                  <span className="min-w-0">
                    <span className="block font-mono text-[11px] uppercase tracking-wider text-mist">
                      {row.label}
                    </span>
                    <span className="block truncate text-sm font-medium text-ink">
                      {row.value}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ul>

          <p className="mt-6 text-center text-xs leading-relaxed text-muted">
            {t("note")}
          </p>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function IconMail() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" stroke="currentColor" strokeWidth="1.6" />
      <path d="m4 7 8 6 8-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function IconPhone() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M6.5 3.5h3l1.2 4-1.8 1.4a12 12 0 0 0 4.8 4.8l1.4-1.8 4 1.2v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconTelegram() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M21 4.5 3.5 11.2c-1 .4-1 1.8.1 2.1l4.2 1.3 1.6 5c.3.9 1.4 1.1 2 .4l2.3-2.4 4.2 3.1c.7.5 1.7.1 1.9-.7L21.9 6c.2-1.1-.9-2-1.9-1.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="m9 14.5 8-6-6 7" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
    </svg>
  );
}
