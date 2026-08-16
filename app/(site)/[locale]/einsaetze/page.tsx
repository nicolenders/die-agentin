import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getMissions } from "@/lib/queries/missions";
import { getPublishedIdentities } from "@/lib/queries/identities";
import { formatDate } from "@/lib/format";
import MissionExplorer, {
  type ExplorerMission,
  type ExplorerIdentity,
} from "@/components/missions/MissionExplorer";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav.einsaetze };
}

export default async function EinsaetzePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isDe = locale === "de";
  const [allMissions, identities] = await Promise.all([
    getMissions(locale),
    getPublishedIdentities(locale),
  ]);

  const explorerMissions: ExplorerMission[] = allMissions.map((m) => ({
    id: m.id,
    slug: m.slug,
    eventName: m.eventName,
    city: m.city,
    countryCode: m.countryCode,
    lat: m.lat,
    lon: m.lon,
    isOnline: m.isOnline,
    year: m.startDate.getUTCFullYear(),
    future: m.future,
    dateLabel: formatDate(m.startDate, locale),
    eventUrl: m.eventUrl,
    published: m.published,
    caseFilePublic: m.caseFilePublic,
    bannerUrl: m.bannerUrl,
    bannerAlt: m.bannerAlt,
    bannerAi: m.bannerAi,
    identitySlugs: m.identitySlugs,
    identities: m.identities,
    tools: m.tools,
    briefing: m.briefing,
  }));

  const explorerIdentities: ExplorerIdentity[] = identities.map((i) => ({
    id: i.id,
    slug: i.slug,
    name: i.name,
    color: i.color,
    portraitUrl: i.portraitUrl,
  }));

  return (
    <section style={{ padding: "44px 0 90px" }}>
      {/* Überschrift und „Briefings"-Button in einer Zeile — spart Höhe. */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <h1 className="eyebrow" style={{ flex: 1, margin: 0 }}>
          {isDe ? "Einsätze vor Ort" : "Missions on site"}
        </h1>
        <Link className="btn ghost sm" href={`/${locale}/briefings`}>
          {isDe ? "Briefings" : "Briefings"} →
        </Link>
      </div>

      <MissionExplorer
        locale={locale}
        missions={explorerMissions}
        identities={explorerIdentities}
        labels={{
          search: isDe ? "Suchen (Veranstaltung, Ort, Land) …" : "Search (event, city, country) …",
          yearLabel: isDe ? "Jahr" : "Year",
          yearCurrent: isDe ? "Aktuell & geplant" : "Current & planned",
          yearAll: isDe ? "Alle Jahre" : "All years",
          moreYears: isDe ? "weitere Jahre" : "more years",
          onlineToggle: isDe ? "Online-Events" : "Online events",
          toolLabel: isDe ? "Werkzeug" : "Tool",
          toolClear: isDe ? "Werkzeug-Filter entfernen" : "Clear tool filter",
          all: isDe ? "Alle" : "All",
          reset: isDe ? "Zurücksetzen" : "Reset",
          missionsWord: isDe ? "Einsätze" : "missions",
          listTitle: isDe ? "Einsatzliste" : "Mission list",
          colDate: isDe ? "Datum" : "Date",
          colEvent: isDe ? "Veranstaltung" : "Event",
          colBriefing: isDe ? "Briefing" : "Briefing",
          colLocation: isDe ? "Ort" : "Location",
          colStatus: isDe ? "Status" : "Status",
          statusPlanned: isDe ? "Geplant" : "Planned",
          statusDone: isDe ? "Abgeschlossen" : "Completed",
          onlineLocation: isDe ? "Online" : "Online",
          empty: isDe ? "Keine Einsätze für diese Auswahl." : "No missions for this selection.",
          map: {
            all: isDe ? "Alle" : "All",
            done: isDe ? "Abgeschlossener Einsatz" : "Completed mission",
            planned: isDe ? "Geplant" : "Planned",
            size: isDe ? "Punktgröße = Anzahl" : "Dot size = count",
            open: isDe ? "Veranstaltungswebsite" : "Event website",
            view: isDe ? "Ansicht wählen" : "Choose view",
            briefing: isDe ? "Briefing" : "Briefing",
            identity: isDe ? "Identität" : "Identity",
            language: isDe ? "Sprache" : "Language",
            openFile: isDe ? "Einsatzakte öffnen" : "Open mission file",
            online: isDe ? "Online" : "Online",
          },
        }}
      />
    </section>
  );
}
