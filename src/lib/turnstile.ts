import "server-only";

/**
 * Cloudflare Turnstile server-side verification.
 *
 * Graceful degradation by design: when TURNSTILE_SECRET_KEY is absent the
 * check is skipped, so this code can ship to production *before* the keys are
 * added without taking the forms down. Once the key is set in Vercel, every
 * public form POST must carry a valid token.
 */

const SITEVERIFY = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

export interface TurnstileResult {
  /** True when the request may proceed. */
  ok: boolean;
  /** True when verification was skipped because no secret is configured. */
  skipped?: boolean;
  /** Cloudflare error codes, for logs. */
  errors?: string[];
}

export function isTurnstileConfigured(): boolean {
  return Boolean(process.env.TURNSTILE_SECRET_KEY);
}

/**
 * Verifies a Turnstile token. Never throws — a Cloudflare outage returns
 * ok:false with an error code, and the caller decides what to do.
 */
export async function verifyTurnstile(
  token: string | undefined | null,
  ip?: string,
): Promise<TurnstileResult> {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return { ok: true, skipped: true };
  if (!token) return { ok: false, errors: ["missing-input-response"] };

  const body = new URLSearchParams({ secret, response: token });
  if (ip && ip !== "unknown") body.set("remoteip", ip);

  try {
    const res = await fetch(SITEVERIFY, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      // Never let a hung Cloudflare request hold a lambda open.
      signal: AbortSignal.timeout(8000),
    });
    const data = (await res.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (data.success) return { ok: true };
    const errors = data["error-codes"] ?? ["unknown"];
    console.warn("[turnstile] verification failed:", errors.join(","));
    return { ok: false, errors };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[turnstile] siteverify request failed:", msg);
    return { ok: false, errors: ["internal-error"] };
  }
}
