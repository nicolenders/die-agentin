import type { MetadataRoute } from "next";
import { locales } from "@/lib/i18n/config";
import { getPublishedPosts } from "@/lib/queries/posts";
import { getPublishedDossiers } from "@/lib/queries/dossiers";

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

// Sitemap (SPEC §5). Statische Bereiche plus veröffentlichte Beiträge. Ist die
// DB beim Build nicht erreichbar, werden nur die statischen Routen ausgegeben.
export const dynamic = "force-dynamic";

const SECTIONS = [
  "",
  "signale",
  "dossiers",
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
    const posts = await getPublishedPosts(locale);
    for (const post of posts) {
      entries.push({
        url: `${SITE}/${locale}/signale/${post.slug}`,
        lastModified: post.publishedAt ?? undefined,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
    const dossiers = await getPublishedDossiers(locale);
    for (const dossier of dossiers) {
      entries.push({
        url: `${SITE}/${locale}/dossiers/${dossier.slug}`,
        lastModified: dossier.reviewedAt ?? undefined,
        changeFrequency: "monthly",
        priority: 0.6,
      });
    }
  }

  return entries;
}
