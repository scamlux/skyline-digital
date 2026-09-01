"use client";

import { useCallback, useEffect, useRef } from "react";

/**
 * Cloudflare Turnstile widget (explicit rendering).
 *
 * Renders nothing when NEXT_PUBLIC_TURNSTILE_SITE_KEY is absent, so local dev
 * and any deploy made before the keys are configured keep working — the server
 * skips verification in exactly the same case (see src/lib/turnstile.ts).
 */

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "";
const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

/** Whether the captcha is wired up in this build. */
export const turnstileEnabled = Boolean(SITE_KEY);

interface TurnstileApi {
  render: (
    el: HTMLElement,
    opts: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback"?: () => void;
      "error-callback"?: () => void;
      theme?: "auto" | "light" | "dark";
      appearance?: "always" | "execute" | "interaction-only";
      language?: string;
    },
  ) => string;
  reset: (id?: string) => void;
  remove: (id?: string) => void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      `script[src="${SCRIPT_SRC}"]`,
    );
    const el = existing ?? document.createElement("script");
    el.addEventListener("load", () => resolve());
    el.addEventListener("error", () => {
      scriptPromise = null;
      reject(new Error("turnstile script failed to load"));
    });
    if (!existing) {
      el.src = SCRIPT_SRC;
      el.async = true;
      el.defer = true;
      document.head.appendChild(el);
    }
  });
  return scriptPromise;
}

export interface TurnstileWidgetProps {
  /** Called with a fresh token, and with "" when it expires or errors. */
  onToken: (token: string) => void;
  /** BCP-47 locale, e.g. "ru" / "en" / "uz". */
  language?: string;
  className?: string;
}

export function TurnstileWidget({
  onToken,
  language,
  className,
}: TurnstileWidgetProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);
  // Keep the latest callback without re-rendering the widget on every parent
  // render (assigned in an effect — refs must not be written during render).
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  }, [onToken]);

  const emit = useCallback((token: string) => onTokenRef.current(token), []);

  useEffect(() => {
    if (!SITE_KEY) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !hostRef.current || !window.turnstile) return;
        if (idRef.current !== null) return;
        idRef.current = window.turnstile.render(hostRef.current, {
          sitekey: SITE_KEY,
          callback: (token) => emit(token),
          "expired-callback": () => emit(""),
          "error-callback": () => emit(""),
          theme: "auto",
          language,
        });
      })
      .catch(() => {
        // Script blocked (ad-blocker, network). Leave the token empty; the
        // server rejects the submit with a clear error instead of hanging.
        emit("");
      });

    return () => {
      cancelled = true;
      if (idRef.current !== null) {
        window.turnstile?.remove(idRef.current);
        idRef.current = null;
      }
    };
  }, [emit, language]);

  if (!SITE_KEY) return null;
  return <div ref={hostRef} className={className} />;
}

/** Resets every widget on the page so the user can retry after a failure. */
export function resetTurnstile() {
  window.turnstile?.reset();
}
