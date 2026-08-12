// Kanonischer Host der Website (Phase 1.2). `PUBLIC_SITE_HOST` (reiner Hostname,
// z. B. "nicolenders.com") ist die einzige Quelle der Wahrheit für zwei Dinge:
//
//  1. die noindex-Entscheidung in `proxy.ts` — jeder andere Host als dieser
//     bekommt `X-Robots-Tag: noindex, nofollow`, damit Staging-URLs (z. B.
//     *.azurecontainerapps.io) nicht als Duplicate Content indexiert werden;
//  2. die canonical-/OG-Basis der Metadaten — unabhängig davon, unter welchem
//     Host die Anfrage kam.
//
// Der Cutover (Phase 14) ist damit eine reine Konfigurationsänderung:
// `PUBLIC_SITE_HOST` umstellen, fertig.
//
// Fällt `PUBLIC_SITE_HOST` weg, wird der Host aus `NEXT_PUBLIC_SITE_URL`
// abgeleitet (Abwärtskompatibilität), zuletzt "localhost:3000".

const FALLBACK_URL = "http://localhost:3000";

/** Kanonischer Hostname ohne Schema, z. B. "nicolenders.com". Leer, wenn keiner konfiguriert ist. */
export function canonicalHost(): string {
  const explicit = process.env.PUBLIC_SITE_HOST?.trim();
  if (explicit) return explicit.replace(/^https?:\/\//i, "").replace(/\/.*$/, "");

  const fromUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (fromUrl) {
    try {
      return new URL(fromUrl).host;
    } catch {
      /* ignore */
    }
  }
  return "";
}

/** Absolute Basis-URL (Origin) unter dem kanonischen Host, host-unabhängig. */
export function siteOrigin(): string {
  const host = canonicalHost();
  if (!host) return process.env.NEXT_PUBLIC_SITE_URL?.trim() || FALLBACK_URL;
  const scheme = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  return `${scheme}://${host}`;
}

/** Absolute canonical-URL für einen Pfad (mit führendem `/`). */
export function canonicalUrl(path: string): string {
  const base = siteOrigin();
  return path === "/" ? base : `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
