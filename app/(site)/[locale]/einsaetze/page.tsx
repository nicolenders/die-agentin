import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getMissions } from "@/lib/queries/missions";
import { getPublishedIdentities } from "@/lib/queries/identities";
import { alternatesFor } from "@/lib/seo/alternates";
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
  return {
    title: dict.nav.einsaetze,
    description: dict.meta.einsaetze,
    alternates: alternatesFor(locale, "einsaetze"),
  };
}

export default async function EinsaetzePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isDe = locale === "de";
  const [allMissions, identities, dict] = await Promise.all([
    getMissions(locale),
    getPublishedIdentities(locale),
    getDictionary(locale),
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
    startDay: m.startDate.toISOString().slice(0, 10),
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
    language: m.language,
    durationMin: m.durationMin,
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
      {/* Überschrift und „Briefings"-Button in einer Zeile — spart Höhe. Die
          Abstände bleiben die der übrigen Seiten (.eyebrow/.page-title): mit
          `margin: 0` klebte die Überschrift an der Kennung darüber. */}
      <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p className="eyebrow">{isDe ? "Einsätze · Weltkarte" : "Missions · world map"}</p>
          <h1 className="page-title">
            {isDe ? "Auftritte, nach Ort sortiert." : "Appearances, sorted by place."}
          </h1>
        </div>
        <Link className="btn ghost sm" href={`/${locale}/briefings`} style={{ flexShrink: 0 }}>
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
          colLanguage: isDe ? "Sprache" : "Language",
          colLocation: isDe ? "Ort" : "Location",
          colStatus: isDe ? "Status" : "Status",
          statusPlanned: isDe ? "Geplant" : "Planned",
          statusDone: isDe ? "Abgeschlossen" : "Completed",
          onlineLocation: isDe ? "Online" : "Online",
          empty: isDe ? "Keine Einsätze für diese Auswahl." : "No missions for this selection.",
          phoneNote: isDe
            ? "Voreingestellt auf das laufende Jahr — über die Jahre unten kommst du an alle Einsätze."
            : "Preset to the current year — use the years below to reach every mission.",
          map: {
            aiGenerated: dict.common.aiGenerated,
            aiGeneratedImage: dict.common.aiGeneratedImage,
            all: isDe ? "Alle" : "All",
            done: isDe ? "Abgeschlossener Einsatz" : "Completed mission",
            planned: isDe ? "Geplant" : "Planned",
            size: isDe ? "Punktgröße = Anzahl" : "Dot size = count",
            open: isDe ? "Veranstaltungswebsite" : "Event website",
            view: isDe ? "Ansicht wählen" : "Choose view",
            briefing: isDe ? "Briefing" : "Briefing",
            identity: isDe ? "Identität" : "Identity",
            language: isDe ? "Sprache" : "Language",
            duration: isDe ? "Dauer" : "Duration",
            openFile: isDe ? "Einsatzakte öffnen" : "Open mission file",
            online: isDe ? "Online" : "Online",
            showOnMap: isDe ? "Auf der Karte" : "On the map",
          },
        }}
      />
    </section>
  );
}
