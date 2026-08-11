import Link from "next/link";
import Flash from "@/components/admin/Flash";
import { formatDate } from "@/lib/format";
import { getPlanEntries, planKindLabel, type PlanEntry } from "@/lib/queries/planning";

export const metadata = { title: "Redaktionsplan · Zentrale" };

// Monatsraster als reines CSS-Grid (keine Kalenderbibliothek — der Aufwand einer
// eigenen Monatsansicht ist vergleichbar und spart eine Abhängigkeit, Phase 4.3).
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
const MONTHS = ["Januar", "Februar", "März", "April", "Mai", "Juni", "Juli", "August", "September", "Oktober", "November", "Dezember"];

export default async function RedaktionsplanPage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; month?: string; sort?: string; type?: string; status?: string }>;
}) {
  const sp = await searchParams;
  const view = sp.view === "kalender" ? "kalender" : "tabelle";

  const now = new Date();
  const [defY, defM] = [now.getUTCFullYear(), now.getUTCMonth()];
  const monthMatch = /^(\d{4})-(\d{2})$/.exec(sp.month ?? "");
  const year = monthMatch ? Number(monthMatch[1]) : defY;
  const month0 = monthMatch ? Number(monthMatch[2]) - 1 : defM;

  let entries: PlanEntry[] = [];
  let dbError = false;
  try {
    entries = await getPlanEntries(now);
  } catch {
    dbError = true;
  }

  // Filter
  if (sp.type) entries = entries.filter((e) => e.kind === sp.type);
  if (sp.status) entries = entries.filter((e) => e.status === sp.status);

  // Sortierung (Standard: Datum aufsteigend)
  const sort = sp.sort ?? "date";
  const cmp = (a: PlanEntry, b: PlanEntry) => {
    if (sort === "title") return a.title.localeCompare(b.title);
    if (sort === "status") return a.status.localeCompare(b.status);
    if (sort === "updated") return b.updatedAt.getTime() - a.updatedAt.getTime();
    const at = a.date?.getTime() ?? Infinity;
    const bt = b.date?.getTime() ?? Infinity;
    return at - bt;
  };
  const sorted = [...entries].sort(cmp);

  const viewHref = (v: string) => {
    const q = new URLSearchParams();
    q.set("view", v);
    if (sp.month) q.set("month", sp.month);
    return `/admin/redaktionsplan?${q.toString()}`;
  };
  const monthStr = (y: number, m0: number) => `${y}-${String(m0 + 1).padStart(2, "0")}`;
  const prev = month0 === 0 ? monthStr(year - 1, 11) : monthStr(year, month0 - 1);
  const next = month0 === 11 ? monthStr(year + 1, 0) : monthStr(year, month0 + 1);

  const byDay = new Map<number, PlanEntry[]>();
  for (const e of sorted) {
    if (!e.date) continue;
    if (e.date.getUTCFullYear() === year && e.date.getUTCMonth() === month0) {
      const day = e.date.getUTCDate();
      (byDay.get(day) ?? byDay.set(day, []).get(day)!).push(e);
    }
  }

  return (
    <section>
      <h1>Redaktionsplan</h1>
      <p className="muted">Alles, was noch nicht öffentlich ist: Entwürfe, terminierte und zukünftig geplante Einträge. Depeschen und Einsätze.</p>
      <Flash ok={undefined} err={dbError ? "failed" : undefined} />

      <div className="tab-bar" role="tablist" style={{ marginTop: 16 }}>
        <a role="tab" aria-selected={view === "tabelle"} className={`tab${view === "tabelle" ? " active" : ""}`} href={viewHref("tabelle")}>Tabelle</a>
        <a role="tab" aria-selected={view === "kalender"} className={`tab${view === "kalender" ? " active" : ""}`} href={viewHref("kalender")}>Kalender</a>
      </div>

      {view === "tabelle" ? (
        sorted.length === 0 ? (
          <div className="card bracket" style={{ marginTop: 16 }}><p className="muted" style={{ margin: 0 }}>Nichts geplant. Der Plan ist leer — Zeit für eine Depesche.</p></div>
        ) : (
          <table style={{ marginTop: 16 }}>
            <thead>
              <tr>
                <th><Link href="/admin/redaktionsplan?sort=title">Titel</Link></th>
                <th>Typ</th>
                <th>Identität(en)</th>
                <th><Link href="/admin/redaktionsplan?sort=status">Status</Link></th>
                <th><Link href="/admin/redaktionsplan?sort=date">Geplant</Link></th>
                <th><Link href="/admin/redaktionsplan?sort=updated">Bearbeitet</Link></th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={`${e.kind}-${e.id}`}>
                  <td><Link href={e.editHref}><b>{e.title}</b></Link></td>
                  <td className="meta">{planKindLabel(e.kind)}</td>
                  <td className="meta">
                    {e.identities.map((i) => (
                      <span key={i.name} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginRight: 8 }}>
                        <span aria-hidden style={{ width: 8, height: 8, borderRadius: "50%", background: i.color, display: "inline-block" }} />
                        {i.name}
                      </span>
                    ))}
                  </td>
                  <td><span className={`st ${e.status === "SCHEDULED" ? "sched" : ""}`} style={{ display: "inline-block" }}>{e.status}</span></td>
                  <td className="meta">{formatDate(e.date, "de")}</td>
                  <td className="meta">{formatDate(e.updatedAt, "de")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )
      ) : (
        <div style={{ marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <a className="btn ghost sm" href={`/admin/redaktionsplan?view=kalender&month=${prev}`}>← Monat</a>
            <b>{MONTHS[month0]} {year}</b>
            <a className="btn ghost sm" href={`/admin/redaktionsplan?view=kalender&month=${next}`}>Monat →</a>
            <a className="btn ghost sm" href={`/admin/redaktionsplan?view=kalender&month=${monthStr(defY, defM)}`}>Heute</a>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6 }}>
            {WEEKDAYS.map((w) => <div key={w} className="meta" style={{ textAlign: "center", padding: 4 }}>{w}</div>)}
            {monthGrid(year, month0).map((day, i) => (
              <div key={i} className="card bracket" style={{ minHeight: 86, padding: 6, opacity: day ? 1 : 0.3 }}>
                {day ? <div className="meta" style={{ marginBottom: 4 }}>{day}</div> : null}
                {day && byDay.get(day)
                  ? byDay.get(day)!.slice(0, 3).map((e) => (
                      <Link key={`${e.kind}-${e.id}`} href={e.editHref} style={{ display: "block", fontSize: 11, borderLeft: `3px solid ${e.identities[0]?.color ?? "var(--line)"}`, paddingLeft: 5, marginBottom: 3 }}>
                        <span style={{ opacity: 0.6 }}>{e.kind === "dispatch" ? "D" : "E"} </span>{e.title.slice(0, 22)}
                      </Link>
                    ))
                  : null}
                {day && (byDay.get(day)?.length ?? 0) > 3 ? <span className="meta">+{byDay.get(day)!.length - 3} weitere</span> : null}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}
