"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

const SERVICES = [
  "website",
  "webApp",
  "mobileApp",
  "ai",
  "automation",
  "uiux",
] as const;

type Status = "idle" | "sending" | "success" | "error";

const inputCls =
  "w-full rounded-lg border border-line bg-surface px-4 py-3 text-sm outline-none transition-colors placeholder:text-mist focus:border-night";

export function ContactForm() {
  const t = useTranslations("contact.form");
  const ts = useTranslations("calc.types");
  const [status, setStatus] = useState<Status>("idle");

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form).entries());
    setStatus("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus("success");
      form.reset();
    } catch {
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="rounded-xl border border-line bg-surface p-8 text-center">
        <div className="sun-disc mx-auto h-10 w-10" aria-hidden />
        <h2 className="mt-5 font-display text-xl font-medium">{t("success")}</h2>
        <p className="mt-2 text-sm text-muted">{t("successText")}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">{t("name")} *</span>
          <input name="name" required maxLength={120} className={inputCls} />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">{t("email")} *</span>
          <input name="email" type="email" required maxLength={200} className={inputCls} />
        </label>
      </div>
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">{t("messenger")}</span>
          <input
            name="messenger"
            maxLength={200}
            placeholder={t("messengerPlaceholder")}
            className={inputCls}
          />
        </label>
        <label className="grid gap-1.5">
          <span className="text-sm font-medium">{t("service")}</span>
          <select name="service" defaultValue="" className={inputCls}>
            <option value="" disabled>
              {t("servicePlaceholder")}
            </option>
            {SERVICES.map((s) => (
              <option key={s} value={s}>
                {ts(`${s}.title`)}
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">{t("budget")}</span>
        <input
          name="budget"
          maxLength={120}
          placeholder={t("budgetPlaceholder")}
          className={inputCls}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-sm font-medium">{t("message")} *</span>
        <textarea
          name="message"
          required
          rows={5}
          maxLength={2000}
          placeholder={t("messagePlaceholder")}
          className={cn(inputCls, "resize-y")}
        />
      </label>
      {/* Honeypot — hidden from real users, bots fill it in. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="absolute -left-[9999px] h-0 w-0 opacity-0"
        aria-hidden
      />

      {status === "error" && (
        <p className="text-sm text-afterglow" role="alert">
          {t("error")}
        </p>
      )}

      <button
        type="submit"
        disabled={status === "sending"}
        className="mt-2 w-fit rounded-full bg-night px-8 py-4 text-sm font-medium text-day transition-opacity hover:opacity-90 disabled:opacity-60"
      >
        {status === "sending" ? t("sending") : t("submit")}
      </button>
    </form>
  );
}
