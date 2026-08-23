import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import { getPublishedDispatches } from "@/lib/queries/dispatches";
import { getPublishedIdentities } from "@/lib/queries/identities";
import { db } from "@/lib/db";
import { siteOrigin } from "@/lib/site";

const SITE = siteOrigin();

// Sitemap (SPEC §5). Statische Bereiche plus veröffentlichte Depeschen und
// Identitäten (Phase 3). Kanonischer Host über siteOrigin (Phase 1.2b).
//
// Wichtig: Ist die Datenbank nicht erreichbar, liefern die Query-Funktionen
// leere Listen. Eine Sitemap, die daraufhin nur die statischen Routen ausgibt,
// wäre eine Falschaussage gegenüber Google — „diese Detailseiten gibt es nicht
// mehr" — und kostet Indexierung. Deshalb wird die Erreichbarkeit vorher
// geprüft und im Fehlerfall gar keine Sitemap ausgeliefert: der Fehler schlägt
// durch, Next antwortet mit 500, und der Crawler versucht es später erneut,
// statt die Detailseiten als verschwunden zu verbuchen. (Ein 503 wäre das
// genauere Signal, ist über die Metadata-Konvention von Next aber nicht
// setzbar — dafür müsste die Sitemap ein eigener Route Handler werden.)
export const dynamic = "force-dynamic";

/** Wirft, wenn die Datenbank nicht antwortet. */
async function assertDatabaseReachable(): Promise<void> {
  await db.$queryRaw`SELECT 1`;
}

const SECTIONS = [
  "",
  "depeschen",
  "identitaeten",
  "einsaetze",
  "briefings",
  "publikationen",
  "sichtungen",
  "ausbildung",
  "akte",
  "legende",
  "impressum",
  "datenschutz",
  "barrierefreiheit",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await assertDatabaseReachable();

  const entries: MetadataRoute.Sitemap = [];

  for (const locale of locales) {
    for (const section of SECTIONS) {
      entries.push({
        url: `${SITE}/${locale}${section ? `/${section}` : ""}`,
        changeFrequency: section === "" ? "daily" : "weekly",
        priority: section === "" ? 1 : 0.7,
      });
    }
  }

  for (const locale of locales) {
    const dispatches = await getPublishedDispatches(locale);
    for (const d of dispatches) {
      entries.push({
        url: `${SITE}/${locale}/depeschen/${d.slug}`,
        lastModified: (d.format === "REFERENCE" ? d.reviewedAt : d.publishedAt) ?? undefined,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
    const identities = await getPublishedIdentities(locale);
    for (const i of identities) {
      entries.push({
        url: `${SITE}/${locale}/identitaeten/${i.slug}`,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
