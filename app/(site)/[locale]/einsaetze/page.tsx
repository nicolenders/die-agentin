import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getMissions } from "@/lib/queries/missions";
import { formatDate } from "@/lib/format";
import { availableMissionYears, parseYearSelection, matchesYear } from "@/lib/missions";
import WorldMap, { type MapMission } from "@/components/map/WorldMap";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav.einsaetze };
}

export default async function EinsaetzePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ jahr?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { jahr } = await searchParams;
  const allMissions = await getMissions(locale);

  // Server-seitiger Jahresfilter (Phase 8.4). Standard: aktuelles Jahr + geplant.
  // Die Auswahl steht in der URL; die Kennzahlen unten beziehen sich auf ALLE.
  const selection = parseYearSelection(jahr);
  const currentYear = new Date().getUTCFullYear();
  const years = availableMissionYears(allMissions.map((m) => m.startDate.getUTCFullYear()));
  const missions = allMissions.filter((m) =>
    matchesYear(m.startDate.getUTCFullYear(), m.future, selection, currentYear),
  );

  const yearHref = (sel: string) => `/${locale}/einsaetze${sel === "aktuell" ? "" : `?jahr=${sel}`}`;
  const isDe = locale === "de";

  const mapMissions: MapMission[] = missions.map((m) => ({
    id: m.id,
    slug: m.slug,
    eventName: m.eventName,
    city: `${m.city}, ${m.countryCode}`,
    countryCode: m.countryCode,
    lat: m.lat,
    lon: m.lon,
    year: m.startDate.getUTCFullYear(),
    future: m.future,
    dateLabel: formatDate(m.startDate, locale),
    eventUrl: m.eventUrl,
    published: m.published,
    bannerUrl: m.bannerUrl,
    bannerAlt: m.bannerAlt,
    bannerAi: m.bannerAi,
  }));

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{locale === "de" ? "Einsätze vor Ort" : "Missions on site"}</p>
      <h2>{locale === "de" ? "Wo ich war. Wo ich hinfahre." : "Where I've been. Where I'm headed."}</h2>
      <p className="lead">
        {locale === "de"
          ? "Jeder Pin ist ein Einsatz: eine Veranstaltung, ein Briefing, eine Stadt. Die vollständige Liste steht als Tabelle unter der Karte."
          : "Every pin is a mission: an event, a briefing, a city. The full list is in the table below the map."}
      </p>

      <div className="year-filter" role="group" aria-label={isDe ? "Jahr wählen" : "Choose year"} style={{ marginTop: 22 }}>
        <Link className="chip" aria-pressed={selection === "aktuell"} href={yearHref("aktuell")}>
          {isDe ? "Aktuell & geplant" : "Current & planned"}
        </Link>
        {years.map((y) => (
          <Link key={y} className="chip" aria-pressed={selection === y} href={yearHref(String(y))}>
            {y}
          </Link>
        ))}
        <Link className="chip" aria-pressed={selection === "alle"} href={yearHref("alle")}>
          {isDe ? "Alle Jahre" : "All years"}
        </Link>
      </div>
      <p className="meta" style={{ marginTop: 8 }}>
        {isDe
          ? `${missions.length} von ${allMissions.length} Einsätzen angezeigt (Kennzahlen zählen alle).`
          : `Showing ${missions.length} of ${allMissions.length} missions (metrics count all).`}
      </p>

      <div style={{ marginTop: 26 }}>
        {mapMissions.length > 0 ? (
          <WorldMap
            missions={mapMissions}
            locale={locale}
            labels={{
              all: locale === "de" ? "Alle" : "All",
              done: locale === "de" ? "Abgeschlossener Einsatz" : "Completed mission",
              planned: locale === "de" ? "Geplant" : "Planned",
              size: locale === "de" ? "Punktgröße = Anzahl" : "Dot size = count",
              open: locale === "de" ? "Veranstaltungswebsite" : "Event website",
              view: locale === "de" ? "Ansicht wählen" : "Choose view",
            }}
          />
        ) : (
          <div className="card bracket">
            <p className="muted">
              {locale === "de" ? "Noch keine Einsätze erfasst." : "No missions recorded yet."}
            </p>
          </div>
        )}
      </div>

      {/* Barrierefreie Tabellenalternative — immer sichtbar (SPEC §11). */}
      <p className="eyebrow" style={{ marginTop: 44 }}>
        {locale === "de" ? "Einsatzliste" : "Mission list"}
      </p>
      <table>
        <thead>
          <tr>
            <th>{locale === "de" ? "Datum" : "Date"}</th>
            <th>{locale === "de" ? "Veranstaltung" : "Event"}</th>
            <th>{locale === "de" ? "Ort" : "Location"}</th>
            <th>{locale === "de" ? "Status" : "Status"}</th>
          </tr>
        </thead>
        <tbody>
          {missions.map((m) => (
            <tr key={m.id}>
              <td className="meta">{formatDate(m.startDate, locale)}</td>
              <td>
                {m.published && m.slug ? (
                  <Link href={`/${locale}/einsaetze/${m.slug}`}>{m.eventName}</Link>
                ) : (
                  m.eventName
                )}
              </td>
              <td>
                {m.city}, {m.countryCode}
              </td>
              <td>
                {m.future
                  ? locale === "de"
                    ? "Geplant"
                    : "Planned"
                  : locale === "de"
                    ? "Abgeschlossen"
                    : "Completed"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
