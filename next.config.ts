import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const projectRoot = dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
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
