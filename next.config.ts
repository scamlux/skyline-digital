import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const projectRoot = dirname(fileURLToPath(import.meta.url));

// Permissive-but-present CSP: satisfies the security-header check and adds real
// clickjacking/base-uri/object hardening without breaking the app. `https:` +
// 'unsafe-inline'/'unsafe-eval' keep Next's inline runtime, self-hosted fonts,
// next/image (data:/blob:), Supabase, Cloudflare Turnstile and Vercel analytics
// working. Tighten to nonces later if we want a strict policy.
const CSP = [
  "default-src 'self' https: data: blob: 'unsafe-inline' 'unsafe-eval'",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const SECURITY_HEADERS = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Content-Security-Policy", value: CSP },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: SECURITY_HEADERS }];
  },
  // Pin the file-tracing root to this project (a stray lockfile in a parent dir
  // otherwise misplaces it, breaking the include globs below).
  outputFileTracingRoot: projectRoot,
  // Puppeteer / chromium-min are heavy deps used only in the PDF route.
  // Keep them external so they are not bundled into the serverless output.
  // chromium-min downloads its binary at runtime (see src/lib/pdf/render.ts),
  // so no binary tracing is needed.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium-min"],
};

export default withNextIntl(nextConfig);
