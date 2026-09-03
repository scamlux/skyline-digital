"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { PhoneInputUz } from "@/components/ui/PhoneInputUz";

/**
 * КП download gate: the PDF link unlocks only after a valid UZ phone is
 * entered (masked input — junk can't be typed). The phone rides along to the
 * proposal endpoint, which stores it on the lead.
 */
export function ProposalDownloadGate({ token }: { token: string }) {
  const t = useTranslations("estimate");
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);

  const download = async () => {
    setBusy(true);
    setError(false);
    try {
      const res = await fetch(`/api/proposal/${token}?phone=${encodeURIComponent(phone)}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `KP-skyline-${token.slice(0, 6)}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(a.href);
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
      <PhoneInputUz
        value={phone}
        onChange={setPhone}
        className="rounded-full border border-line-night bg-night-deep px-5 py-3 font-mono text-sm text-day outline-none transition-colors placeholder:text-mist/60 focus:border-apricot"
      />
      <button
        type="button"
        disabled={!phone || busy}
        onClick={download}
        className="horizon-gradient rounded-full px-7 py-3.5 text-sm font-medium text-night transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        title={!phone ? t("phoneGate.hint") : undefined}
      >
        {busy ? "…" : t("phoneGate.download")}
      </button>
      {error && <span className="text-sm text-red-400">{t("phoneGate.error")}</span>}
    </div>
  );
}
