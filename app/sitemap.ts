import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import { getPublishedDispatches } from "@/lib/queries/dispatches";
import { getPublishedIdentities } from "@/lib/queries/identities";
import { siteOrigin } from "@/lib/site";

const SITE = siteOrigin();

// Sitemap (SPEC §5). Statische Bereiche plus veröffentlichte Depeschen und
// Identitäten (Phase 3). Ist die DB beim Build nicht erreichbar, werden nur die
// statischen Routen ausgegeben. Kanonischer Host über siteOrigin (Phase 1.2b).
export const dynamic = "force-dynamic";

const SECTIONS = [
  "",
  "depeschen",
  "identitaeten",
  "einsaetze",
  "briefings",
  "publikationen",
  "ausbildung",
  "legende",
  "impressum",
  "datenschutz",
  "barrierefreiheit",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
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
