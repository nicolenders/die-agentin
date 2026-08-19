import type { MetadataRoute } from "next";
import { canonicalHost, siteOrigin } from "@/lib/site";

const SITE = siteOrigin();

// robots.txt (Phase 1.2 / 13.4). Admin ausgeschlossen. KI-Crawler werden NICHT
// ausgesperrt — Nicole will in ChatGPT, Claude, Perplexity & Co. auffindbar
// sein. Der host-abhängige noindex für Nicht-Zieldomains passiert zusätzlich
// über den X-Robots-Tag-Header (proxy.ts).
export default function robots(): MetadataRoute.Robots {
  const aiBots = ["GPTBot", "ClaudeBot", "Claude-Web", "PerplexityBot", "Google-Extended", "CCBot", "Applebot-Extended"];
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: "/admin" },
      // KI-Crawler ausdrücklich erlauben.
      ...aiBots.map((userAgent) => ({ userAgent, allow: "/", disallow: "/admin" })),
    ],
    sitemap: `${SITE}/sitemap.xml`,
    // `Host:` erwartet einen nackten Hostnamen. Mit Schema davor ist die Zeile
    // syntaktisch falsch und wird von den Crawlern, die sie überhaupt lesen,
    // verworfen.
    host: canonicalHost() || undefined,
  };
}
