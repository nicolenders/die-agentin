import { getAnalyticsSummary, type Bucket } from "@/lib/queries/analytics";

export const metadata = { title: "Auswertung · Zentrale" };
export const dynamic = "force-dynamic";

const PRESETS: { value: string; label: string }[] = [
  { value: "7", label: "Letzte 7 Tage" },
  { value: "30", label: "Letzte 30 Tage" },
  { value: "90", label: "Letzte 90 Tage" },
  { value: "365", label: "Letzte 12 Monate" },
  { value: "all", label: "Gesamter Zeitraum" },
  { value: "custom", label: "Benutzerdefiniert" },
];

const DAY_MS = 86_400_000;

function regionName(code: string): string {
  if (code === "XX") return "Unbekannt";
  try {
    const dn = new Intl.DisplayNames(["de"], { type: "region" });
    return dn.of(code) ?? code;
  } catch {
    return code;
  }
}

function sectionLabel(key: string): string {
  const map: Record<string, string> = {
    home: "Startseite",
    einsaetze: "Einsätze",
    identitaeten: "Identitäten",
    briefings: "Briefings",
    depeschen: "Depeschen",
    publikationen: "Publikationen",
    ausbildung: "Ausbildung",
    legende: "Legende",
    cv: "Lebenslauf",
  };
  return map[key] ?? key;
}

// Grafische Verlaufsdarstellung (Fläche + Linie) der Aufrufe pro Tag als inline
// SVG — ohne Chart-Bibliothek, theme-fähig über CSS-Variablen.
function DayChart({ data }: { data: Bucket[] }) {
  if (data.length === 0) return <p className="muted">Keine Daten im Zeitraum.</p>;
  const W = 760;
  const H = 200;
  const padL = 6;
  const padR = 6;
  const padT = 14;
  const padB = 26;
  const n = data.length;
  const max = Math.max(...data.map((d) => d.views), 1);
  const x = (i: number) => (n === 1 ? W / 2 : padL + (i / (n - 1)) * (W - padL - padR));
  const y = (v: number) => padT + (1 - v / max) * (H - padT - padB);
  const line = data.map((d, i) => `${x(i).toFixed(1)},${y(d.views).toFixed(1)}`).join(" ");
  const area = `${padL},${H - padB} ${line} ${x(n - 1).toFixed(1)},${H - padB}`;
  const first = data[0]?.key ?? "";
  const last = data[n - 1]?.key ?? "";
  const peak = data.reduce((m, d) => (d.views > m.views ? d : m), data[0] as Bucket);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label={`Aufrufe pro Tag, Höchstwert ${max}`}>
      <defs>
        <linearGradient id="cvArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--violet-bright)" stopOpacity="0.45" />
          <stop offset="100%" stopColor="var(--violet-bright)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Grundlinie */}
      <line x1={padL} y1={H - padB} x2={W - padR} y2={H - padB} stroke="var(--line-soft)" strokeWidth="1" />
      <polygon points={area} fill="url(#cvArea)" />
      <polyline points={line} fill="none" stroke="var(--violet-bright)" strokeWidth="2" strokeLinejoin="round" />
      {n <= 40 ? data.map((d, i) => <circle key={d.key} cx={x(i)} cy={y(d.views)} r={2.4} fill="var(--violet-bright)" />) : null}
      {/* Höchstwert markieren */}
      <text x={padL} y={padT - 2} fill="var(--muted)" fontFamily="var(--mono)" fontSize="10">
        max {max} · {peak?.key}
      </text>
      <text x={padL} y={H - 8} fill="var(--muted)" fontFamily="var(--mono)" fontSize="10">{first}</text>
      <text x={W - padR} y={H - 8} textAnchor="end" fill="var(--muted)" fontFamily="var(--mono)" fontSize="10">{last}</text>
    </svg>
  );
}

function BucketTable({
  rows,
  head,
  render,
}: {
  rows: Bucket[];
  head: string;
  render: (key: string) => string;
}) {
  const max = rows.reduce((m, r) => Math.max(m, r.views), 0);
  if (rows.length === 0) return <p className="muted">Keine Daten im Zeitraum.</p>;
  return (
    <table style={{ marginTop: 10 }}>
      <thead>
        <tr>
          <th>{head}</th>
          <th style={{ width: "45%" }}>Aufrufe</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => (
          <tr key={r.key}>
            <td>{render(r.key)}</td>
            <td>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  aria-hidden
                  style={{
                    height: 8,
                    width: `${max > 0 ? Math.round((r.views / max) * 100) : 0}%`,
                    minWidth: 3,
                    background: "var(--violet-bright)",
                    borderRadius: 3,
                  }}
                />
                <b style={{ fontSize: 13 }}>{r.views}</b>
              </div>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export default async function StatistikPage({
  searchParams,
}: {
  searchParams: Promise<{ zeitraum?: string; von?: string; bis?: string; land?: string }>;
}) {
  const sp = await searchParams;
  const zeitraum = sp.zeitraum ?? "30";
  const land = (sp.land ?? "").trim().toUpperCase();

  // Zeitraum bestimmen (UTC-Tagesgrenzen; `day` ist eine Datumsspalte).
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const today = new Date(`${todayStr}T00:00:00.000Z`);
  let from: Date;
  let to: Date = today;
  if (zeitraum === "custom") {
    from = sp.von ? new Date(`${sp.von}T00:00:00.000Z`) : new Date(today.getTime() - 29 * DAY_MS);
    to = sp.bis ? new Date(`${sp.bis}T00:00:00.000Z`) : today;
  } else if (zeitraum === "all") {
    from = new Date("2020-01-01T00:00:00.000Z");
  } else {
    const n = Number(zeitraum);
    const days = Number.isFinite(n) && n > 0 ? n : 30;
    from = new Date(today.getTime() - (days - 1) * DAY_MS);
  }

  const summary = await getAnalyticsSummary({ from, to, country: land || null });

  return (
    <section>
      <h1>Auswertung</h1>
      <p className="muted">
        Eigene, datensparsame Reichweiten-Erfassung — first-party, ohne Cookies, ohne gespeicherte
        IP. Besucherzahlen sind tagesbezogen geschätzt (ungefähr).
      </p>

      {/* Filter: Zeitraum und Besucher-Land. Reines GET-Formular. */}
      <form method="get" className="card bracket" style={{ marginTop: 16 }}>
        <div className="filter-row" style={{ gap: 12, alignItems: "flex-end" }}>
          <label className="f" style={{ margin: 0 }}>
            Zeitraum
            <select className="f" name="zeitraum" defaultValue={zeitraum}>
              {PRESETS.map((p) => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </label>
          <label className="f" style={{ margin: 0 }}>
            Von
            <input className="f" type="date" name="von" defaultValue={sp.von ?? ""} />
          </label>
          <label className="f" style={{ margin: 0 }}>
            Bis
            <input className="f" type="date" name="bis" defaultValue={sp.bis ?? ""} />
          </label>
          <label className="f" style={{ margin: 0 }}>
            Land
            <select className="f" name="land" defaultValue={land}>
              <option value="">Alle Länder</option>
              {summary.countries.map((c) => (
                <option key={c} value={c}>{regionName(c)}</option>
              ))}
            </select>
          </label>
          <button className="btn solid sm" type="submit">Anwenden</button>
        </div>
        <p className="meta" style={{ marginTop: 8, marginBottom: 0 }}>
          Von und Bis wirken nur beim Zeitraum Benutzerdefiniert.
        </p>
      </form>

      {!summary.available ? (
        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="muted" style={{ margin: 0 }}>
            Datenbank nicht erreichbar — bitte in einem Moment erneut versuchen.
          </p>
        </div>
      ) : (
        <>
          <div className="grid g4" style={{ margin: "18px 0 22px" }}>
            <div className="card bracket stat">
              <b>{summary.totalViews}</b>
              <span>Seitenaufrufe</span>
            </div>
            <div className="card bracket stat">
              <b>{summary.uniqueVisitors}</b>
              <span>Besucher (ca.)</span>
            </div>
            <div className="card bracket stat">
              <b>{summary.byCountry.length}</b>
              <span>Länder</span>
            </div>
            <div className="card bracket stat">
              <b>{summary.bySection.length}</b>
              <span>Rubriken</span>
            </div>
          </div>

          {summary.totalViews === 0 ? (
            <div className="card bracket">
              <p className="muted" style={{ margin: 0 }}>
                Für diese Auswahl liegen noch keine Aufrufe vor. Sobald Besucher die öffentliche
                Website aufrufen, erscheinen sie hier.
              </p>
            </div>
          ) : (
            <>
              <div className="card bracket" style={{ marginBottom: 16 }}>
                <p className="eyebrow" style={{ marginTop: 0 }}>Aufrufe pro Tag</p>
                <DayChart data={summary.byDay} />
              </div>

              <div className="grid g2" style={{ alignItems: "start" }}>
                <div className="card bracket">
                  <p className="eyebrow" style={{ marginTop: 0 }}>Nach Rubrik</p>
                  <BucketTable rows={summary.bySection} head="Rubrik" render={sectionLabel} />
                </div>
                <div className="card bracket">
                  <p className="eyebrow" style={{ marginTop: 0 }}>Nach Land</p>
                  <BucketTable rows={summary.byCountry} head="Land" render={regionName} />
                </div>
              </div>

              <div className="card bracket" style={{ marginTop: 16 }}>
                <p className="eyebrow" style={{ marginTop: 0 }}>Meistbesuchte Unterseiten</p>
                <BucketTable rows={summary.byPath} head="Pfad" render={(k) => k} />
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
