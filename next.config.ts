import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  // Puppeteer / chromium are heavy native deps used only in the PDF route.
  // Keep them external so they are not bundled into the serverless output.
  serverExternalPackages: ["puppeteer-core", "@sparticuz/chromium"],
};

export default withNextIntl(nextConfig);
