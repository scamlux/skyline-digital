import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Match all pathnames except API routes, Next internals, metadata image
  // routes (icon/apple-icon/opengraph-image have no file extension, so they'd
  // otherwise be caught and locale-routed) and static files.
  matcher: [
    "/((?!api|_next|_vercel|icon|apple-icon|opengraph-image|manifest.webmanifest|sitemap.xml|robots.txt|favicon.ico|.*\\..*).*)",
  ],
};
