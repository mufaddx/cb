import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Two faces of one Next.js deployment, split by hostname (not by
// separate deploys) — matches how spec §10 (public marketing site)
// and the authenticated app were never meant to compete for the same
// domain. `vidlix.in` only ever serves the marketing/public pages;
// `app.vidlix.in` only ever serves the authenticated product.
//
// This can't check "is the user logged in" — the access token lives
// in localStorage (see lib/apiClient.ts), which the edge runtime has
// no access to. So `app.vidlix.in/` always routes to `/login`; the
// login page itself does the client-side check and bounces an
// already-authenticated visitor on to `/dashboard`.

const APP_HOST = "app.vidlix.in";
const MARKETING_HOST = "vidlix.in";

// Every route this app serves that belongs to the authenticated
// product, not the public marketing site. Anything not in this list
// (plus a handful of shared static paths) is treated as marketing.
const APP_PATH_PREFIXES = [
  "/dashboard",
  "/campaigns",
  "/deals",
  "/offers",
  "/onboarding",
  "/products",
  "/shipments",
  "/wallet",
  "/admin",
  "/login",
  "/signup",
  "/verify-otp",
];

function isAppPath(pathname: string): boolean {
  return APP_PATH_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export function middleware(req: NextRequest) {
  const host = req.headers.get("host")?.split(":")[0] ?? "";
  const { pathname, search } = req.nextUrl;

  // Local/dev/preview hosts (localhost, *.vercel.app) and anything
  // that isn't exactly one of the two production domains: no rewrite,
  // so `npm run dev` and preview deployments still show every route.
  const isAppHost = host === APP_HOST;
  const isMarketingHost = host === MARKETING_HOST || host === `www.${MARKETING_HOST}`;
  if (!isAppHost && !isMarketingHost) return NextResponse.next();

  if (isAppHost && pathname === "/") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAppHost && !isAppPath(pathname)) {
    // A marketing path was requested on the app domain (e.g. someone
    // followed an old /about link) — send it to where that page
    // actually lives instead of 404ing.
    return NextResponse.redirect(new URL(`https://${MARKETING_HOST}${pathname}${search}`, req.url));
  }

  if (isMarketingHost && isAppPath(pathname)) {
    return NextResponse.redirect(new URL(`https://${APP_HOST}${pathname}${search}`, req.url));
  }

  return NextResponse.next();
}

export const config = {
  // Skip Next.js internals and static assets — only page navigations
  // need this hostname check.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api).*)"],
};
