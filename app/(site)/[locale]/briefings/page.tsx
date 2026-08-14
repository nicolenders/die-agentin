import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getBriefingList } from "@/lib/queries/briefings";
import { getPublishedIdentities } from "@/lib/queries/identities";
import { richValueToPlain } from "@/lib/content/rich";
import RichText from "@/components/content/RichText";
import BriefingExplorer, { type ExplorerItem } from "@/components/briefings/BriefingExplorer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav.briefings };
}

export default async function BriefingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isDe = locale === "de";

  const [list, identities] = await Promise.all([
    getBriefingList(locale),
    getPublishedIdentities(locale),
  ]);
  const categories = [...new Set(list.flatMap((i) => i.categories))].sort((a, b) =>
    a.localeCompare(b, locale),
  );
  // Nur Identitäten anbieten, die tatsächlich mit einem Briefing verknüpft sind.
  const usedSlugs = new Set(list.flatMap((i) => i.identitySlugs));
  const filterIdentities = identities
    .filter((i) => usedSlugs.has(i.slug))
    .map((i) => ({ slug: i.slug, name: i.name, color: i.color, portraitUrl: i.portraitUrl }));

  const items: ExplorerItem[] = list.map((i) => ({
    id: i.id,
    title: i.title,
    searchText: `${i.title} ${richValueToPlain(i.abstract)} ${i.categories.join(" ")} ${i.audiences.join(" ")}`,
    categories: i.categories,
    audiences: i.audiences,
    identitySlugs: i.identitySlugs,
    level: i.level,
    durationMin: i.durationMin,
    deCount: i.deCount,
    enCount: i.enCount,
    total: i.total,
    abstractNode: <RichText value={i.abstract} locale={locale} />,
  }));

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{isDe ? "Briefings · Vortragsrepertoire" : "Briefings · talk repertoire"}</p>
      <h2>{isDe ? "Was ich mitbringe" : "What I bring"}</h2>
      <p className="lead">
        {isDe
          ? "Alle Vorträge — suchbar und nach Kategorien filterbar, sortiert nach Häufigkeit."
          : "All talks — searchable and filterable by category, sorted by frequency."}
      </p>

      {items.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 24 }}>
          <p className="muted">{isDe ? "Noch keine Briefings im Repertoire." : "No briefings yet."}</p>
        </div>
      ) : (
        <div style={{ marginTop: 24 }}>
          <BriefingExplorer items={items} categories={categories} identities={filterIdentities} locale={locale} />
        </div>
      )}
    </section>
  );
}
