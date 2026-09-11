import type { MetadataRoute } from "next";

// The app itself (app.vidlix.in) is a separate domain entirely (see
// middleware.ts's domain split) and was never reachable under this
// one anyway — nothing here needs a Disallow for it.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/" },
    sitemap: "https://vidlix.in/sitemap.xml",
  };
}
