import createMiddleware from "next-intl/middleware";
import { NextResponse, type NextRequest } from "next/server";
import { routing } from "./i18n/routing";

const intl = createMiddleware(routing);

/**
 * /admin/* is gated behind HTTP Basic Auth (ADMIN_USER / ADMIN_PASSWORD). The
 * radar panel exposes scraped business contacts, so it must never be public:
 * when the env vars are missing the route is refused (503) rather than opened.
 * Everything else flows through the next-intl locale middleware.
 */
export default function proxy(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/admin")) {
    const user = process.env.ADMIN_USER;
    const pass = process.env.ADMIN_PASSWORD;
    if (!user || !pass) {
      return new NextResponse("Admin panel is not configured.", { status: 503 });
    }
    const header = req.headers.get("authorization") ?? "";
    if (header.startsWith("Basic ")) {
      try {
        const [u, p] = atob(header.slice(6)).split(":");
        if (u === user && p === pass) return NextResponse.next();
      } catch {
        /* malformed header → fall through to challenge */
      }
    }
    return new NextResponse("Authentication required", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="Skyline Admin"' },
    });
  }
  return intl(req);
}

export const config = {
  matcher: [
    "/((?!api|_next|_vercel|icon|apple-icon|opengraph-image|manifest.webmanifest|sitemap.xml|robots.txt|favicon.ico|.*\\..*).*)",
    "/admin/:path*",
  ],
};
