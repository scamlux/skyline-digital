import { defineRouting } from "next-intl/routing";

/**
 * Locale configuration for the whole app.
 * ru is the default and is shown without a URL prefix ("as-needed").
 * en and uz are served under /en and /uz.
 */
export const routing = defineRouting({
  locales: ["ru", "en", "uz"],
  defaultLocale: "ru",
  localePrefix: "as-needed",
});

export type Locale = (typeof routing.locales)[number];
