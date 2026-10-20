import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { type ContentStatus } from "@/lib/domain";
import {
  MISSION_LIST_STATUSES,
  MISSION_LIST_STATUS_CLASS,
  MISSION_LIST_STATUS_LABEL,
  missionListStatus,
  missionStatusWhere,
  parseMissionListStatus,
  type MissionListStatus,
} from "@/lib/admin/mission-status";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import SharePanel from "@/components/admin/SharePanel";
import { identityDisplayName } from "@/lib/identities";
import { missionTalkLanguage, talkLanguageLabel } from "@/lib/mission-language";
import { getShareTemplates, getShareProfiles } from "@/lib/queries/settings";
import { renderShareText, sharePublicPath } from "@/lib/share";
import { DEFAULT_PAGE_SIZE, pageWindow, paginate, parsePage } from "@/lib/admin/pagination";
import { RETURN_PARAM, editHref } from "@/lib/admin/return-to";
import { editionRange } from "@/lib/events/naming";
import { deleteMission } from "./actions";

export const metadata = { title: "Einsätze · Zentrale" };

// Veröffentlichung des Einsatzes — eine andere Frage als der Einsatzstatus:
// hier geht es um die öffentliche Einsatzakte, dort um den Auftritt selbst.
const PUBLICATION: Record<ContentStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Entwurf", cls: "draft" },
  SCHEDULED: { label: "Eingeplant", cls: "sched" },
  PUBLISHED: { label: "Live", cls: "live" },
  ARCHIVED: { label: "Archiviert", cls: "" },
};

interface Filter {
  q: string;
  /** Einsatzstatus: geplant, abgeschlossen, abgesagt oder archiviert. */
  status: MissionListStatus | "";
  ort: "" | "vorort" | "online";
  /** Jahr als Text; leer = alle Jahre. */
  jahr: string;
  /** Kennung der Veranstaltung; leer = alle. */
  veranstaltung: string;
}

export default async function EinsaetzeAdminPage({
  searchParams,
}: {
  searchParams: Promise<{
    ok?: string;
    err?: string;
    q?: string;
    status?: string;
    ort?: string;
    jahr?: string;
    veranstaltung?: string;
    seite?: string;
  }>;
}) {
  const { ok, err, q, status, ort, jahr, veranstaltung, seite } = await searchParams;
  const filter: Filter = {
    q: (q ?? "").trim(),
    status: parseMissionListStatus(status),
    ort: ort === "online" || ort === "vorort" ? ort : "",
    jahr: /^\d{4}$/.test(jahr ?? "") ? (jahr as string) : "",
    veranstaltung: (veranstaltung ?? "").trim(),
  };
  const requestedPage = parsePage(seite);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const [templates, shareProfiles] = await Promise.all([getShareTemplates(), getShareProfiles()]);

  let rows: Awaited<ReturnType<typeof load>>["rows"] = [];
  let matching = 0;
  let grandTotal = 0;
  let years: number[] = [];
  let seriesOptions: { id: string; name: string }[] = [];
  let dbError = false;
  try {
    const loaded = await load(base, templates, filter, requestedPage);
    rows = loaded.rows;
    matching = loaded.matching;
    grandTotal = loaded.grandTotal;
    years = loaded.years;
    seriesOptions = loaded.seriesOptions;
  } catch {
    dbError = true;
  }

  const page = paginate(matching, requestedPage);
  const isFiltered =
    filter.q !== "" ||
    filter.status !== "" ||
    filter.ort !== "" ||
    filter.jahr !== "" ||
    filter.veranstaltung !== "";

  /** Blätter-Link, der die Filter mitnimmt. */
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (filter.q) params.set("q", filter.q);
    if (filter.status) params.set("status", filter.status);
    if (filter.ort) params.set("ort", filter.ort);
    if (filter.jahr) params.set("jahr", filter.jahr);
    if (filter.veranstaltung) params.set("veranstaltung", filter.veranstaltung);
    if (target > 1) params.set("seite", String(target));
    const query = params.toString();
    return `/admin/einsaetze${query ? `?${query}` : ""}`;
  };

  // Die Ansicht, in der Nicole gerade steht — Filter und Seite. Sie reist mit
  // in die Maske und bringt sie beim Zurückgehen wieder hierher zurück.
  const listHref = pageHref(page.page);

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Einsätze</h1>
        <Link className="btn solid sm" href="/admin/einsaetze/bearbeiten" style={{ marginLeft: "auto" }}>
          + Neuer Einsatz
        </Link>
      </div>
      <p className="muted">Vorträge, Konferenzen, Auftritte: mit Ort auf der Karte und Bezug zum Briefing.</p>
      <Flash ok={ok} err={err} />

      <form method="get" className="list-filter" role="search">
        <label className="f">
          Suche
          <input className="f" type="search" name="q" defaultValue={filter.q} placeholder="Veranstaltung, Stadt, Briefing …" style={{ minWidth: 240 }} />
        </label>
        <label className="f">
          Status
          <select className="f" name="status" defaultValue={filter.status} style={{ minWidth: 150 }}>
            <option value="">Alle</option>
            {MISSION_LIST_STATUSES.map((s) => (
              <option key={s} value={s}>{MISSION_LIST_STATUS_LABEL[s]}</option>
            ))}
          </select>
        </label>
        <label className="f">
          Ort
          <select className="f" name="ort" defaultValue={filter.ort} style={{ minWidth: 150 }}>
            <option value="">Alle</option>
            <option value="vorort">Vor Ort</option>
            <option value="online">Online</option>
          </select>
        </label>
        {/* Nur Jahre, zu denen es auch Einsätze gibt — eine Auswahl, die ins
            Leere führt, ist keine Auswahl. */}
        <label className="f">
          Jahr
          <select className="f" name="jahr" defaultValue={filter.jahr} style={{ minWidth: 120 }}>
            <option value="">Alle</option>
            {years.map((y) => (
              <option key={y} value={String(y)}>{y}</option>
            ))}
          </select>
        </label>
        {/* Nach Veranstaltung filtern: der Blick auf „alles, was ich bei
            dieser Konferenz je gemacht habe". Gepflegt werden Veranstaltungen
            unter „Veranstaltungen". */}
        {seriesOptions.length > 0 ? (
          <label className="f">
            Veranstaltung
            <select className="f" name="veranstaltung" defaultValue={filter.veranstaltung} style={{ minWidth: 180 }}>
              <option value="">Alle</option>
              {seriesOptions.map((v) => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          </label>
        ) : null}
        <button className="btn solid sm" type="submit">Filtern</button>
        {isFiltered ? <Link className="btn ghost sm" href="/admin/einsaetze">Zurücksetzen</Link> : null}
        {!dbError ? (
          <span className="meta">
            {page.total === 0 ? "0" : `${page.from}–${page.to}`} von {page.total}
            {isFiltered ? ` (${grandTotal} gesamt)` : ""}
          </span>
        ) : null}
      </form>

      {dbError ? (
        <p className="st sched" style={{ display: "inline-block", marginTop: 16 }}>Datenbank wird geweckt … einen Moment.</p>
      ) : rows.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 18 }}>
          {isFiltered ? (
            <>
              <p className="eyebrow">Keine Treffer</p>
              <p className="muted">Für diese Auswahl gibt es keinen Einsatz. Filter lockern oder zurücksetzen.</p>
            </>
          ) : (
            <>
              <p className="eyebrow">Noch keine Einsätze</p>
              <p className="muted">Trag deinen ersten Auftritt nach. Er gehört auf die Karte.</p>
            </>
          )}
        </div>
      ) : (
        <table style={{ marginTop: 18 }}>
          <thead>
            <tr>
              <th>Veranstaltung</th>
              <th>Briefing</th>
              <th>Sprache</th>
              <th>Ort</th>
              <th>Datum</th>
              <th>Status</th>
              <th>Veröffentlichung</th>
              <th>Akte</th>
              <th>Texte</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const pub = PUBLICATION[m.contentStatus] ?? PUBLICATION.DRAFT;
              return (
                <tr key={m.id}>
                  <td>
                    <b>{m.eventName}</b>
                    {m.series ? (
                      <>
                        <br />
                        <Link className="meta" href={`/admin/einsaetze?veranstaltung=${m.series.id}`}>
                          {m.series.name}
                        </Link>
                        {m.edition ? <span className="meta"> · {m.edition}</span> : null}
                      </>
                    ) : null}
                  </td>
                  <td className="meta">
                    {m.talk ? (
                      <Link href={`/admin/briefings/bearbeiten?id=${m.talk.id}`}>{m.talk.title}</Link>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="meta">{talkLanguageLabel(m.language, "de") ?? "—"}</td>
                  <td className="meta">{m.isOnline ? "Online" : `${m.city}${m.countryCode ? `, ${m.countryCode}` : ""}`}</td>
                  <td className="meta">{formatDate(m.startDate, "de")}</td>
                  <td><span className={`st ${MISSION_LIST_STATUS_CLASS[m.status]}`}>{MISSION_LIST_STATUS_LABEL[m.status]}</span></td>
                  <td><span className={`st ${pub.cls}`}>{pub.label}</span></td>
                  <td>{m.caseFilePublic ? <span className="st live">Sichtbar</span> : <span className="st">Verborgen</span>}</td>
                  <td>
                    <span className={`lng ${m.hasDe ? "on" : ""}`}>DE</span>{" "}
                    <span className={`lng ${m.hasEn ? "on" : ""}`}>EN</span>
                  </td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {m.share ? (
                      <>
                        <SharePanel title={m.eventName} textDe={m.share.textDe} textEn={m.share.textEn} profiles={shareProfiles} />{" "}
                      </>
                    ) : null}
                    <Link className="btn ghost sm" href={editHref("/admin/einsaetze/bearbeiten", m.id, listHref)}>Bearbeiten</Link>{" "}
                    <form action={deleteMission} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={m.id} />
                      <input type="hidden" name={RETURN_PARAM} value={listHref} />
                      <ConfirmButton confirmText={`Einsatz „${m.eventName}" wirklich löschen?`}>Löschen</ConfirmButton>
                    </form>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}

      {!dbError && page.pageCount > 1 ? (
        <nav className="filter-row" aria-label="Seiten" style={{ marginTop: 16, alignItems: "center" }}>
          {page.hasPrev ? (
            <Link className="btn ghost sm" href={pageHref(page.page - 1)} rel="prev">← Zurück</Link>
          ) : null}
          {pageWindow(page.page, page.pageCount).map((p, i) =>
            p === null ? (
              <span key={`luecke-${i}`} className="meta" aria-hidden>…</span>
            ) : (
              <Link
                key={p}
                className="chip sm"
                aria-current={p === page.page ? "page" : undefined}
                href={pageHref(p)}
              >
                {p}
              </Link>
            ),
          )}
          {page.hasNext ? (
            <Link className="btn ghost sm" href={pageHref(page.page + 1)} rel="next">Weiter →</Link>
          ) : null}
          <span className="meta">Seite {page.page} von {page.pageCount}</span>
        </nav>
      ) : null}
    </section>
  );
}

async function load(
  base: string,
  templates: Awaited<ReturnType<typeof getShareTemplates>>,
  filter: Filter,
  requestedPage: number,
) {
  const year = filter.jahr ? Number(filter.jahr) : null;
  const where = {
      ...missionStatusWhere(filter.status),
      ...(filter.ort === "online" ? { isOnline: true } : filter.ort === "vorort" ? { isOnline: false } : {}),
      ...(year !== null
        ? {
            startDate: {
              gte: new Date(Date.UTC(year, 0, 1)),
              lt: new Date(Date.UTC(year + 1, 0, 1)),
            },
          }
        : {}),
      ...(filter.veranstaltung ? { eventSeriesId: filter.veranstaltung } : {}),
      ...(filter.q
        ? {
            OR: [
              { eventName: { contains: filter.q } },
              { city: { contains: filter.q } },
              { deliveries: { some: { talk: { translations: { some: { title: { contains: filter.q } } } } } } },
            ],
          }
        : {}),
  };

  // Erst zählen, dann die Seite holen: Ohne die Gesamtzahl lässt sich eine zu
  // hohe Seitennummer nicht auf die letzte zurückholen.
  const matching = await db.mission.count({ where });
  const page = paginate(matching, requestedPage, DEFAULT_PAGE_SIZE);

  const missions = await db.mission.findMany({
    where,
    orderBy: { startDate: "desc" },
    include: {
      translations: { select: { locale: true, slug: true } },
      identities: { select: { codenameDe: true, codenameEn: true, roleDe: true, roleEn: true } },
      eventSeries: { select: { id: true, name: true } },
      eventEdition: { select: { label: true, startDate: true, endDate: true } },
      deliveries: {
        take: 1,
        orderBy: { heldOn: "desc" },
        include: { talk: { include: { translations: { where: { locale: "de" } } } } },
      },
    },
    skip: page.offset,
    take: page.pageSize,
  });

  // Auswahl der Jahre aus dem GESAMTEN Bestand, nicht aus der gefilterten
  // Seite: sonst verschwindet das Jahr, mit dem man gerade gefiltert hat.
  const [grandTotal, allDates, seriesOptions] = await Promise.all([
    db.mission.count(),
    db.mission.findMany({ select: { startDate: true }, orderBy: { startDate: "desc" } }),
    db.eventSeries.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  const years = [...new Set(allDates.map((m) => m.startDate.getUTCFullYear()))].sort((a, b) => b - a);
  const rows = missions.map((m) => {
    const de = m.translations.find((t) => t.locale === "de");
    const en = m.translations.find((t) => t.locale === "en");
    const names = m.identities.map((i) => identityDisplayName(i, "de"));
    const delivery = m.deliveries[0];
    // Teilen nur für veröffentlichte Einsätze mit öffentlichem Slug.
    const share =
      m.contentStatus === "PUBLISHED" && de?.slug
        ? {
            textDe: renderShareText(
              templates.mission.de,
              {
                title: m.eventName,
                url: base + sharePublicPath("mission", "de", de.slug),
                identities: names,
                city: m.city,
                date: formatDate(m.startDate, "de"),
              },
              "de",
            ),
            textEn: renderShareText(
              templates.mission.en,
              {
                title: m.eventName,
                url: base + sharePublicPath("mission", "en", en?.slug ?? de.slug),
                identities: names,
                city: m.city,
                date: formatDate(m.startDate, "en"),
              },
              "en",
            ),
          }
        : null;
    return {
      id: m.id,
      eventName: m.eventName,
      series: m.eventSeries,
      // Die Ausgabe zeigt ihren Zeitraum, nicht nur ihre Bezeichnung: „2026"
      // allein sagt nichts, „2026 · 12.03.2026 – 14.03.2026" schon.
      edition: m.eventEdition
        ? [m.eventEdition.label, editionRange(m.eventEdition.startDate, m.eventEdition.endDate, "de")]
            .filter(Boolean)
            .join(" · ")
        : null,
      city: m.city,
      countryCode: m.countryCode,
      isOnline: m.isOnline,
      caseFilePublic: m.caseFilePublic,
      startDate: m.startDate,
      contentStatus: m.contentStatus as ContentStatus,
      status: missionListStatus(m.status, m.contentStatus),
      talk: delivery ? { id: delivery.talkId, title: delivery.talk.translations[0]?.title ?? "(ohne Titel)" } : null,
      language: missionTalkLanguage(m.sessionLanguage, delivery?.language),
      hasDe: m.translations.some((t) => t.locale === "de"),
      hasEn: m.translations.some((t) => t.locale === "en"),
      share,
    };
  });
  return { rows, matching, grandTotal, years, seriesOptions };
}
