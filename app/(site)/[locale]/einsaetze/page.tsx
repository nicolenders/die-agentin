import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getMissions } from "@/lib/queries/missions";
import { getPublishedIdentities } from "@/lib/queries/identities";
import { formatDate } from "@/lib/format";
import { availableMissionYears, parseYearSelection, matchesYear } from "@/lib/missions";
import { parseCsvParam, toggleCsv } from "@/lib/filters";
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
  searchParams: Promise<{ jahr?: string; identitaet?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { jahr, identitaet } = await searchParams;
  const [allMissions, identities] = await Promise.all([
    getMissions(locale),
    getPublishedIdentities(locale),
  ]);

  // Server-seitiger Jahresfilter (Phase 8.4). Standard: aktuelles Jahr + geplant.
  // Die Auswahl steht in der URL; die Kennzahlen unten beziehen sich auf ALLE.
  const selection = parseYearSelection(jahr);
  const currentYear = new Date().getUTCFullYear();
  const years = availableMissionYears(allMissions.map((m) => m.startDate.getUTCFullYear()));

  // Identitätsfilter (Mehrfachauswahl): ein Einsatz passt, wenn er mindestens
  // einer der ausgewählten Identitäten zugeordnet ist.
  const selectedIdentities = parseCsvParam(identitaet).filter((slug) =>
    identities.some((i) => i.slug === slug),
  );
  const missions = allMissions.filter(
    (m) =>
      matchesYear(m.startDate.getUTCFullYear(), m.future, selection, currentYear) &&
      (selectedIdentities.length === 0 ||
        m.identitySlugs.some((s) => selectedIdentities.includes(s))),
  );

  const isDe = locale === "de";
  const jahrStr = selection === "aktuell" ? "aktuell" : selection === "alle" ? "alle" : String(selection);
  const buildHref = (jahrSel: string, ids: string[]): string => {
    const p = new URLSearchParams();
    if (jahrSel && jahrSel !== "aktuell") p.set("jahr", jahrSel);
    if (ids.length) p.set("identitaet", ids.join(","));
    const q = p.toString();
    return `/${locale}/einsaetze${q ? `?${q}` : ""}`;
  };
  const yearHref = (sel: string) => buildHref(sel, selectedIdentities);

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
      <p style={{ marginTop: 6 }}>
        <Link className="btn ghost sm" href={`/${locale}/briefings`}>
          {locale === "de" ? "Was ich mitbringe: Briefings" : "What I bring: briefings"} →
        </Link>
      </p>

      <div className="year-filter" role="group" aria-label={isDe ? "Jahr wählen" : "Choose year"} style={{ marginTop: 22 }}>
        <Link className="chip" aria-current={selection === "aktuell" ? "true" : undefined} href={yearHref("aktuell")}>
          {isDe ? "Aktuell & geplant" : "Current & planned"}
        </Link>
        {years.map((y) => (
          <Link key={y} className="chip" aria-current={selection === y ? "true" : undefined} href={yearHref(String(y))}>
            {y}
          </Link>
        ))}
        <Link className="chip" aria-current={selection === "alle" ? "true" : undefined} href={yearHref("alle")}>
          {isDe ? "Alle Jahre" : "All years"}
        </Link>
      </div>

      {identities.length > 0 ? (
        <div className="year-filter" role="group" aria-label={isDe ? "Nach Identität filtern" : "Filter by identity"} style={{ marginTop: 10 }}>
          <Link className="chip" aria-current={selectedIdentities.length === 0 ? "true" : undefined} href={buildHref(jahrStr, [])}>
            {isDe ? "Alle Identitäten" : "All identities"}
          </Link>
          {identities.map((i) => {
            const on = selectedIdentities.includes(i.slug);
            return (
              <Link
                key={i.id}
                className="chip"
                aria-current={on ? "true" : undefined}
                href={buildHref(jahrStr, toggleCsv(selectedIdentities, i.slug))}
                style={on ? { borderColor: i.color } : undefined}
              >
                {i.name}
              </Link>
            );
          })}
        </div>
      ) : null}

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
