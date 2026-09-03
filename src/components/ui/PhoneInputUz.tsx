"use client";

import { useState } from "react";

/**
 * Masked Uzbek phone input. The +998 prefix is a non-editable adornment — the
 * field holds only the 9 national digits, live-formatted «90 123 45 67», so
 * caret games or pasted junk can never corrupt the number. Emits normalized
 * +998XXXXXXXXX when complete, else "".
 */
function formatNational(digits: string): string {
  const d = digits.replace(/\D/g, "").replace(/^998/, "").slice(0, 9);
  return [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ");
}

export function PhoneInputUz({
  value,
  onChange,
  className = "",
  required = true,
}: {
  /** Normalized +998XXXXXXXXX or "". */
  value: string;
  onChange: (normalized: string) => void;
  className?: string;
  required?: boolean;
}) {
  const [display, setDisplay] = useState(value ? formatNational(value.slice(4)) : "");

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span aria-hidden className="select-none opacity-70">+998</span>
      <input
        type="tel"
        inputMode="numeric"
        autoComplete="tel-national"
        required={required}
        value={display}
        placeholder="90 123 45 67"
        aria-label="+998"
        onChange={(e) => {
          const next = formatNational(e.target.value);
          setDisplay(next);
          const digits = next.replace(/\D/g, "");
          onChange(digits.length === 9 ? "+998" + digits : "");
        }}
        className="w-full min-w-0 bg-transparent outline-none placeholder:opacity-40"
      />
    </span>
  );
}
