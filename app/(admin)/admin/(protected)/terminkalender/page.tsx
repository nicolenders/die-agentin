import Link from "next/link";
import Flash from "@/components/admin/Flash";
import InfoPopover from "@/components/admin/InfoPopover";
import { formatDate } from "@/lib/format";
import {
  getCalendarEntries,
  planKindLabel,
  planKindSigil,
  type PlanEntry,
} from "@/lib/queries/planning";
import {
  countOverdueTasks,
  filterPlanEntries,
  sortPlanEntries,
  toPlanSort,
  toPlanTime,
  toPlanType,
} from "@/lib/planning/filter";
import { completeMissionReport, reopenMissionReport } from "./actions";

export const metadata = { title: "Terminkalender · Zentrale" };

// Monatsraster als reines CSS-Grid (keine Kalenderbibliothek — der Aufwand einer
// eigenen Monatsansicht ist vergleichbar und spart eine Abhängigkeit).
function monthGrid(year: number, month0: number) {
  const first = new Date(Date.UTC(year, month0, 1));
  const lead = (first.getUTCDay() + 6) % 7; // Mo=0
  const days = new Date(Date.UTC(year, month0 + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

const WEEKDAYS = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"];
const MONTHS = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

const TYPE_FILTERS = [
  { id: "alle", label: "Alle" },
  { id: "mission", label: "Einsätze" },
  { id: "dispatch", label: "Depeschen" },
  { id: "task", label: "Einsatzberichte" },
] as const;

const TIME_FILTERS = [
  { id: "kommend", label: "Kommend" },
  { id: "vergangen", label: "Vergangen" },
  { id: "alle", label: "Alles" },
] as const;

const INFO_SECTIONS = [
  {
    heading: "Was hier steht",
    text: "Jeder Einsatz mit seinem Termin, jede Depesche mit ihrem Veröffentlichungsdatum — und zu jedem Einsatz die Aufgabe, den Einsatzbericht zu schreiben.",
  },
  {
    heading: "Einsatzberichte",
    text: "Eine Berichts-Aufgabe lässt sich erst abhaken, wenn im Einsatz die Texte zur Veranstaltung und zum Vortrag stehen. Bilder sind erwünscht, aber keine Bedingung.",
  },
  {
    heading: "Depeschen-Erinnerung",
    text: "Rückt ein Veröffentlichungsdatum näher, schickt die Zentrale eine Mail. Vorlauf und Empfänger stehen in den Einstellungen unter „Erinnerungen“.",
  },
];

const STATUS_LABEL: Record<string, string> = {
  DRAFT: "Entwurf",
  SCHEDULED: "Terminiert",
  PUBLISHED: "Veröffentlicht",
  ARCHIVED: "Archiv",
  OPEN: "Offen",
  DONE: "Erledigt",
};

function statusLabel(value: string): string {
  return STATUS_LABEL[value] ?? value;
}

export default async function TerminkalenderPage({
  searchParams,
}: {
  searchParams: Promise<{
    view?: string;
    month?: string;
    sort?: string;
    typ?: string;
    status?: string;
    zeit?: string;
    ok?: string;
    err?: string;
  }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "kalender" ? "kalender" : "tabelle";
  const type = toPlanType(sp.typ);
  const sort = toPlanSort(sp.sort);
  // Im Kalender ist der Zeitfilter sinnlos — der Monat IST der Zeitraum.
  const time = view === "kalender" ? "alle" : toPlanTime(sp.zeit);
  const status = sp.status ?? "";

  const now = new Date();
  const [defY, defM] = [now.getUTCFullYear(), now.getUTCMonth()];
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(sp.month ?? "");
  const year = monthMatch ? Number(monthMatch[1]) : defY;
  const month0 = monthMatch ? Number(monthMatch[2]) - 1 : defM;

  let entries: PlanEntry[] = [];
  let dbError = false;
  try {
    entries = await getCalendarEntries(now);
  } catch {
    dbError = true;
  }

  const overdue = countOverdueTasks(entries);
  const sorted = sortPlanEntries(filterPlanEntries(entries, { type, time, status }, now), sort);

  /** Link, der die aktuelle Auswahl behält und nur einen Wert austauscht. */
  const hrefWith = (patch: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { view, month: sp.month, sort, typ: type, status, zeit: time, ...patch };
    for (const [key, value] of Object.entries(merged)) {
      if (!value) continue;
      if (key === "view" && value === "tabelle") continue;
      if (key === "typ" && value === "alle") continue;
      if (key === "zeit" && value === "kommend") continue;
      if (key === "sort" && value === "date") continue;
      q.set(key, value);
    }
    const query = q.toString();
    return `/admin/terminkalender${query ? `?${query}` : ""}`;
  };
  // Die Filter reisen mit, wenn eine Aufgabe abgehakt wird.
  const currentQuery = hrefWith({}).split("?")[1] ?? "";

  const monthStr = (y: number, m0: number) => `${y}-${String(m0 + 1).padStart(2, "0")}`;
  const prev = month0 === 0 ? monthStr(year - 1, 11) : monthStr(year, month0 - 1);
  const next = month0 === 11 ? monthStr(year + 1, 0) : monthStr(year, month0 + 1);

  const byDay = new Map<number, PlanEntry[]>();
  for (const e of sorted) {
    if (!e.date) continue;
    if (e.date.getUTCFullYear() === year && e.date.getUTCMonth() === month0) {
      const day = e.date.getUTCDate();
      const list = byDay.get(day) ?? [];
      list.push(e);
      byDay.set(day, list);
    }
  }

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Terminkalender</h1>
        <div style={{ marginLeft: "auto" }}>
          <InfoPopover title="Terminkalender" sections={INFO_SECTIONS} />
        </div>
      </div>
      <p className="muted">
        Wann steht ein Einsatz an, wann geht eine Depesche raus — und welcher Einsatzbericht
        fehlt noch.
        {overdue > 0 ? (
          <>
            {" "}
            <b>
              {overdue} {overdue === 1 ? "Einsatzbericht ist" : "Einsatzberichte sind"} überfällig.
            </b>
          </>
        ) : null}
      </p>
      <Flash ok={sp.ok} err={dbError ? "failed" : sp.err} />

      <div className="tab-bar" role="tablist" style={{ marginTop: 16 }}>
        <a role="tab" aria-selected={view === "tabelle"} className={`tab${view === "tabelle" ? " active" : ""}`} href={hrefWith({ view: "tabelle" })}>Tabelle</a>
        <a role="tab" aria-selected={view === "kalender"} className={`tab${view === "kalender" ? " active" : ""}`} href={hrefWith({ view: "kalender" })}>Kalender</a>
      </div>

      <div className="filter-row" style={{ marginTop: 14, alignItems: "center", gap: 8 }}>
        <span className="meta">Zeigen:</span>
        {TYPE_FILTERS.map((t) => (
          <Link
            key={t.id}
            className="chip sm"
            aria-current={type === t.id ? "true" : undefined}
            href={hrefWith({ typ: t.id })}
          >
            {t.label}
            {t.id === "task" && overdue > 0 ? <span className="tab-count">{overdue}</span> : null}
          </Link>
        ))}
        {view === "tabelle" ? (
          <>
            <span className="meta" style={{ marginLeft: 12 }}>Zeitraum:</span>
            {TIME_FILTERS.map((t) => (
              <Link key={t.id} className="chip sm" aria-current={time === t.id ? "true" : undefined} href={hrefWith({ zeit: t.id })}>
                {t.label}
              </Link>
            ))}
          </>
        ) : null}
        {status ? (
          <Link className="chip sm" aria-current="true" href={hrefWith({ status: undefined })}>
            Status: {statusLabel(status)} ✕
          </Link>
        ) : null}
      </div>

      {view === "tabelle" ? (
        sorted.length === 0 ? (
          <div className="card bracket" style={{ marginTop: 16 }}>
            <p className="muted" style={{ margin: 0 }}>
              Für diese Auswahl steht nichts an.{" "}
              <Link href={hrefWith({ typ: "alle", zeit: "alle", status: undefined })}>Alles zeigen</Link> oder eine{" "}
              <Link href="/admin/depeschen/bearbeiten">neue Depesche</Link> beginnen.
            </p>
          </div>
        ) : (
          <table style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th><Link href={hrefWith({ sort: "title" })}>Titel</Link></th>
                <th>Typ</th>
                <th>Identität(en)</th>
                <th><Link href={hrefWith({ sort: "status" })}>Status</Link></th>
                <th><Link href={hrefWith({ sort: "date" })}>Termin</Link></th>
                <th><Link href={hrefWith({ sort: "updated" })}>Bearbeitet</Link></th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={`${e.kind}-${e.id}`}>
                  <td>
                    <Link href={e.editHref}><b>{e.title}</b></Link>
                    {e.task && e.task.missing.length > 0 ? (
                      <div className="meta">Es fehlt: {e.task.missing.join(", ")}</div>
                    ) : null}
                  </td>
                  <td className="meta">{planKindLabel(e.kind)}</td>
                  <td className="meta">
                    {e.identities.map((i) => (
                      <span key={i.name} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 8 }}>
                        <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: i.color, display: "inline-block" }} />
                        {i.name}
                      </span>
                    ))}
                  </td>
                  <td>
                    <span
                      className={`st ${e.status === "SCHEDULED" ? "sched" : e.status === "DONE" ? "live" : ""}`}
                      style={{ display: "inline-block" }}
                    >
                      {statusLabel(e.status)}
                    </span>
                  </td>
                  <td className="meta" style={{ whiteSpace: "nowrap" }}>
                    {formatDate(e.date, "de")}
                    {e.task?.overdue ? <b style={{ color: "var(--warn)" }}> überfällig</b> : null}
                  </td>
                  <td className="meta">{formatDate(e.updatedAt, "de")}</td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    {e.task ? (
                      e.status === "DONE" ? (
                        <form action={reopenMissionReport} style={{ display: "inline" }}>
                          <input type="hidden" name="missionId" value={e.task.missionId} />
                          <input type="hidden" name="query" value={currentQuery} />
                          <button className="btn ghost sm" type="submit">Wieder öffnen</button>
                        </form>
                      ) : (
                        <form action={completeMissionReport} style={{ display: "inline" }}>
                          <input type="hidden" name="missionId" value={e.task.missionId} />
                          <input type="hidden" name="query" value={currentQuery} />
                          <button
                            className="btn solid sm"
                            type="submit"
                            disabled={!e.task.complete}
                            title={
                              e.task.complete
                                ? "Einsatzbericht als erledigt markieren"
                                : `Erst ergänzen: ${e.task.missing.join(", ")}`
                            }
                          >
                            Erledigt
                          </button>
                        </form>
                      )
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <a className="btn ghost sm" href={hrefWith({ view: "kalender", month: prev })}>← Monat</a>
            <b>{MONTHS[month0]} {year}</b>
            <a className="btn ghost sm" href={hrefWith({ view: "kalender", month: next })}>Monat →</a>
            <a className="btn ghost sm" href={hrefWith({ view: "kalender", month: monthStr(defY, defM) })}>Heute</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {WEEKDAYS.map((w) => <div key={w} className="meta" style={{ textAlign: "center", padding: 4 }}>{w}</div>)}
            {monthGrid(year, month0).map((day, i) => (
              <div key={i} className="card bracket" style={{ minHeight: 86, padding: 6, opacity: day ? 1 : 0.3 }}>
                {day ? <div className="meta" style={{ marginBottom: 4 }}>{day}</div> : null}
                {day
                  ? (byDay.get(day) ?? []).slice(0, 3).map((e) => (
                      <Link
                        key={`${e.kind}-${e.id}`}
                        href={e.editHref}
                        title={`${planKindLabel(e.kind)}: ${e.title}`}
                        style={{
                          display: "block",
                          fontSize: 11,
                          borderLeft: `3px solid ${e.identities[0]?.color ?? "var(--line)"}`,
                          paddingLeft: 5,
                          marginBottom: 3,
                          textDecoration: e.status === "DONE" ? "line-through" : undefined,
                        }}
                      >
                        <span style={{ opacity: 0.6 }}>{planKindSigil(e.kind)} </span>
                        {e.title.slice(0, 22)}
                      </Link>
                    ))
                  : null}
                {day && (byDay.get(day)?.length ?? 0) > 3 ? (
                  <span className="meta">+{byDay.get(day)!.length - 3} weitere</span>
                ) : null}
              </div>
            ))}
          </div>
          <p className="meta" style={{ marginTop: 10 }}>
            E = Einsatz · D = Depesche · A = Einsatzbericht. Abhaken geht in der Tabellenansicht.
          </p>
        </div>
      )}
    </section>
  );
}
