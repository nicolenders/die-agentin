import Link from "next/link";
import { db } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { CONTENT_STATUSES, isOneOf, type ContentStatus } from "@/lib/domain";
import ConfirmButton from "@/components/admin/ConfirmButton";
import Flash from "@/components/admin/Flash";
import SharePanel from "@/components/admin/SharePanel";
import { identityDisplayName } from "@/lib/identities";
import { missionTalkLanguage, talkLanguageLabel } from "@/lib/mission-language";
import { getShareTemplates, getShareProfiles } from "@/lib/queries/settings";
import { renderShareText, sharePublicPath } from "@/lib/share";
import { DEFAULT_PAGE_SIZE, pageWindow, paginate, parsePage } from "@/lib/admin/pagination";
import { deleteMission } from "./actions";

export const metadata = { title: "Einsätze · Zentrale" };

const STATUS: Record<ContentStatus, { label: string; cls: string }> = {
  DRAFT: { label: "Entwurf", cls: "draft" },
  SCHEDULED: { label: "Eingeplant", cls: "sched" },
  PUBLISHED: { label: "Live", cls: "live" },
  ARCHIVED: { label: "Archiviert", cls: "" },
};

interface Filter {
  q: string;
  status: ContentStatus | "";
  ort: "" | "vorort" | "online";
  /** Jahr als Text; leer = alle Jahre. */
  jahr: string;
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
    seite?: string;
  }>;
}) {
  const { ok, err, q, status, ort, jahr, seite } = await searchParams;
  const filter: Filter = {
    q: (q ?? "").trim(),
    status: isOneOf(CONTENT_STATUSES, status ?? "") ? (status as ContentStatus) : "",
    ort: ort === "online" || ort === "vorort" ? ort : "",
    jahr: /^\d{4}$/.test(jahr ?? "") ? (jahr as string) : "",
  };
  const requestedPage = parsePage(seite);
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const [templates, shareProfiles] = await Promise.all([getShareTemplates(), getShareProfiles()]);

  let rows: Awaited<ReturnType<typeof load>>["rows"] = [];
  let matching = 0;
  let grandTotal = 0;
  let years: number[] = [];
  let dbError = false;
  try {
    const loaded = await load(base, templates, filter, requestedPage);
    rows = loaded.rows;
    matching = loaded.matching;
    grandTotal = loaded.grandTotal;
    years = loaded.years;
  } catch {
    dbError = true;
  }

  const page = paginate(matching, requestedPage);
  const isFiltered = filter.q !== "" || filter.status !== "" || filter.ort !== "" || filter.jahr !== "";

  /** Blätter-Link, der die Filter mitnimmt. */
  const pageHref = (target: number) => {
    const params = new URLSearchParams();
    if (filter.q) params.set("q", filter.q);
    if (filter.status) params.set("status", filter.status);
    if (filter.ort) params.set("ort", filter.ort);
    if (filter.jahr) params.set("jahr", filter.jahr);
    if (target > 1) params.set("seite", String(target));
    const query = params.toString();
    return `/admin/einsaetze${query ? `?${query}` : ""}`;
  };

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
            {CONTENT_STATUSES.map((s) => (
              <option key={s} value={s}>{STATUS[s].label}</option>
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
              <th>Akte</th>
              <th>Texte</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((m) => {
              const st = STATUS[m.contentStatus] ?? STATUS.DRAFT;
              return (
                <tr key={m.id}>
                  <td><b>{m.eventName}</b></td>
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
                  <td><span className={`st ${st.cls}`}>{st.label}</span></td>
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
                    <Link className="btn ghost sm" href={`/admin/einsaetze/bearbeiten?id=${m.id}`}>Bearbeiten</Link>{" "}
                    <form action={deleteMission} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={m.id} />
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
      ...(filter.status ? { contentStatus: filter.status } : {}),
      ...(filter.ort === "online" ? { isOnline: true } : filter.ort === "vorort" ? { isOnline: false } : {}),
      ...(year !== null
        ? {
            startDate: {
              gte: new Date(Date.UTC(year, 0, 1)),
              lt: new Date(Date.UTC(year + 1, 0, 1)),
            },
          }
        : {}),
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
  const [grandTotal, allDates] = await Promise.all([
    db.mission.count(),
    db.mission.findMany({ select: { startDate: true }, orderBy: { startDate: "desc" } }),
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
      city: m.city,
      countryCode: m.countryCode,
      isOnline: m.isOnline,
      caseFilePublic: m.caseFilePublic,
      startDate: m.startDate,
      contentStatus: m.contentStatus as ContentStatus,
      talk: delivery ? { id: delivery.talkId, title: delivery.talk.translations[0]?.title ?? "(ohne Titel)" } : null,
      language: missionTalkLanguage(m.sessionLanguage, delivery?.language),
      hasDe: m.translations.some((t) => t.locale === "de"),
      hasEn: m.translations.some((t) => t.locale === "en"),
      share,
    };
  });
  return { rows, matching, grandTotal, years };
}
