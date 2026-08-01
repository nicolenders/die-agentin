import type { MetadataRoute } from "next";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// robots.txt (SPEC §5, §13): Admin ist ausgeschlossen.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: "/admin" }],
    sitemap: `${SITE}/sitemap.xml`,
    host: SITE,
  };
}
