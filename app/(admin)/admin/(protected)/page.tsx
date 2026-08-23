import Link from "next/link";
import { getSessionUser } from "@/lib/auth/guard";
import { getDashboardStats, type ContentCounts } from "@/lib/queries/dashboard";
import { getAnalyticsSummary, type Bucket } from "@/lib/queries/analytics";
import { getCalendarEntries, planKindLabel, type PlanEntry } from "@/lib/queries/planning";
import { countOverdueTasks, filterPlanEntries, sortPlanEntries } from "@/lib/planning/filter";
import { formatDate } from "@/lib/format";
import EntityIcon, { type EntityIconName } from "@/components/admin/EntityIcon";

export const metadata = { title: "Einsatzzentrale · Zentrale" };

// Kennzahlen je Inhaltsart. Jede Zahl ist ein Link in die passend gefilterte
// Liste — die Zentrale zeigt nicht nur, wo etwas liegt, sondern bringt einen
// auch hin.
const OVERVIEW: {
  key: "missions" | "briefings" | "dispatches";
  label: string;
  icon: EntityIconName;
  list: string;
  filter: { drafts: string; published: string; archived: string };
}[] = [
  {
    key: "missions",
    label: "Einsätze",
    icon: "mission",
    list: "/admin/einsaetze",
    filter: { drafts: "?status=DRAFT", published: "?status=PUBLISHED", archived: "?status=ARCHIVED" },
  },
  {
    key: "briefings",
    label: "Briefings",
    icon: "briefing",
    list: "/admin/briefings?tab=alle",
    filter: { drafts: "&sichtbar=nein", published: "&sichtbar=ja", archived: "&sichtbar=archiv" },
  },
  {
    key: "dispatches",
    label: "Depeschen",
    icon: "dispatch",
    list: "/admin/depeschen",
    filter: { drafts: "?status=DRAFT", published: "?status=PUBLISHED", archived: "?status=ARCHIVED" },
  },
];

// Erfassen und Nachschlagen als Kacheln mit Symbol — Einsatz, Briefing und
// Depesche sind schon an der Form zu unterscheiden.
const CREATE: { href: string; label: string; icon: EntityIconName }[] = [
  { href: "/admin/einsaetze/bearbeiten", label: "Einsatz", icon: "mission" },
  { href: "/admin/briefings/bearbeiten", label: "Briefing", icon: "briefing" },
  { href: "/admin/depeschen/bearbeiten", label: "Depesche", icon: "dispatch" },
  { href: "/admin/publikationen/bearbeiten", label: "Publikation", icon: "publication" },
  { href: "/admin/identitaeten/bearbeiten", label: "Identität", icon: "identity" },
  { href: "/admin/ausbildung/bearbeiten", label: "Auszeichnung", icon: "award" },
  { href: "/admin/medien?tab=hochladen", label: "Medien", icon: "media" },
];

const JUMP: { href: string; label: string; icon: EntityIconName }[] = [
  { href: "/admin/terminkalender", label: "Terminkalender", icon: "plan" },
  { href: "/admin/aufklaerung", label: "Radar", icon: "radar" },
  { href: "/admin/statistik", label: "Auswertung", icon: "stats" },
  { href: "/admin/lebenslauf", label: "Lebenslauf", icon: "resume" },
  { href: "/admin/einstellungen?tab=kanaele", label: "Kanäle", icon: "settings" },
];

const SECTION_LABEL: Record<string, string> = {
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

const DAY_MS = 86_400_000;
const ANALYTICS_DAYS = 30;

function CountCell({ href, value, label }: { href: string; value: number; label: string }) {
  return (
    <Link className={`count${value === 0 ? " zero" : ""}`} href={href}>
      <b>{value}</b>
      <span>{label}</span>
    </Link>
  );
}

/**
 * Verlauf der letzten Tage als kleine Fläche. Bewusst ohne Achsen: Sie ist ein
 * Stimmungsbild und ein Link, die genaue Auswertung liegt eine Seite weiter.
 */
function Sparkline({ data }: { data: Bucket[] }) {
  if (data.length < 2) return null;
  const W = 300;
  const H = 46;
  const max = Math.max(...data.map((d) => d.views), 1);
  const x = (i: number) => (i / (data.length - 1)) * W;
  const y = (v: number) => H - 2 - (v / max) * (H - 6);
  const line = data.map((d, i) => `${x(i).toFixed(1)},${y(d.views).toFixed(1)}`).join(" ");
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height={H}
      preserveAspectRatio="none"
      role="img"
      aria-label={`Verlauf der Aufrufe, Höchstwert ${max} an einem Tag`}
      style={{ display: "block", marginTop: 10 }}
    >
      <polygon points={`0,${H} ${line} ${W},${H}`} fill="rgba(139, 92, 246, 0.22)" />
      <polyline points={line} fill="none" stroke="var(--violet-bright)" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

export default async function DashboardPage() {
  const now = new Date();
  const user = await getSessionUser();
  const from = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) - (ANALYTICS_DAYS - 1) * DAY_MS);
  const to = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  const [stats, reach] = await Promise.all([
    getDashboardStats(),
    getAnalyticsSummary({ from, to, country: null }),
  ]);

  let calendar: PlanEntry[] = [];
  try {
    calendar = await getCalendarEntries(now);
  } catch {
    // Ohne Termine bleibt die Spalte leer — die Zentrale soll trotzdem stehen.
  }
  // Acht Termine: Der Kasten steht jetzt unten und darf wachsen, also muss die
  // Liste nicht mehr auf eine Fensterhöhe zurechtgestutzt werden. Ein Ausschnitt
  // bleibt es trotzdem — alles steht im Terminkalender, hier oben rechts verlinkt.
  const upcoming = sortPlanEntries(
    filterPlanEntries(calendar, { type: "alle", time: "kommend", status: "" }, now),
    "date",
  ).slice(0, 8);
  const overdue = countOverdueTasks(calendar);

  const greetingName = user?.name?.split(" ")[0] ?? "Nicole";
  const counts: Record<(typeof OVERVIEW)[number]["key"], ContentCounts> = {
    missions: stats.missions,
    briefings: stats.briefings,
    dispatches: stats.dispatches,
  };
  const topSections = reach.bySection.slice(0, 4);

  return (
    <section className="hq">
      <div className="hq-head">
        <h1>Guten Tag, {greetingName}.</h1>
        {stats.dbUnavailable ? (
          <p className="st sched" style={{ display: "inline-block", margin: 0 }}>
            Datenbank wird geweckt … einen Moment.
          </p>
        ) : null}
      </div>

      <div className="hq-overview">
        {OVERVIEW.map((row) => {
          const c = counts[row.key];
          return (
            <div className="card bracket hq-card" key={row.key}>
              <Link className="hq-card-head" href={row.list}>
                <EntityIcon name={row.icon} size={22} />
                <b>{row.label}</b>
              </Link>
              <div className="hq-counts">
                <CountCell href={`${row.list}${row.filter.drafts}`} value={c.drafts} label="Entwurf" />
                <CountCell href={`${row.list}${row.filter.published}`} value={c.published} label="Veröffentlicht" />
                <CountCell href={`${row.list}${row.filter.archived}`} value={c.archived} label="Archiv" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Die Kachelreihen stehen VOR den Listen — und das ist der ganze Trick
          gegen die Scrollbalken. Sie haben eine feste Größe, die Listen nicht.
          Oben steht damit, was immer gleich viel Platz braucht; unten das, was
          wachsen darf, und dort scrollt dann die Seite statt eines Kastens. */}
      <div className="hq-grid">
        <div className="card bracket hq-panel">
          <p className="eyebrow" style={{ margin: "0 0 10px" }}>Neu anlegen</p>
          <div className="hq-tiles">
            {CREATE.map((q) => (
              <Link key={q.href} className="tile" href={q.href}>
                <EntityIcon name={q.icon} size={22} />
                <span>{q.label}</span>
              </Link>
            ))}
          </div>
        </div>

        <div className="card bracket hq-panel">
          <p className="eyebrow" style={{ margin: "0 0 10px" }}>Direkt hin</p>
          <div className="hq-tiles">
            {JUMP.map((q) => (
              <Link key={q.href} className="tile ghost" href={q.href}>
                <EntityIcon name={q.icon} size={20} />
                <span>{q.label}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Zwei Spalten: links das laufende Geschäft, rechts Reichweite und Wege.
          Zuunterst, weil beide beliebig lang werden dürfen. Auf schmalen
          Fenstern fällt es untereinander. */}
      <div className="hq-grid">
        <div className="card bracket hq-panel">
          <div className="hq-panel-head">
            <p className="eyebrow" style={{ margin: 0 }}>Als Nächstes</p>
            <Link className="btn ghost sm" href="/admin/terminkalender">Terminkalender</Link>
          </div>
          {overdue > 0 ? (
            <p className="meta" style={{ marginTop: 6 }}>
              <b style={{ color: "var(--warn)" }}>
                {overdue} {overdue === 1 ? "Einsatzbericht ist" : "Einsatzberichte sind"} überfällig.
              </b>{" "}
              <Link href="/admin/terminkalender?typ=task&zeit=alle">Nachliefern</Link>
            </p>
          ) : null}
          {upcoming.length === 0 ? (
            <p className="muted" style={{ marginTop: 8 }}>
              Nichts steht an. Guter Moment für eine{" "}
              <Link href="/admin/depeschen/bearbeiten">neue Depesche</Link>.
            </p>
          ) : (
            <ul className="hq-next">
              {upcoming.map((e) => (
                <li key={`${e.kind}-${e.id}`}>
                  <span
                    aria-hidden
                    className="hq-next-dot"
                    style={{ background: e.identities[0]?.color ?? "var(--violet-bright)" }}
                  />
                  <Link href={e.editHref}>{e.title}</Link>
                  <span className="meta">
                    {planKindLabel(e.kind)}
                    {e.date ? ` · ${formatDate(e.date, "de")}` : " · ohne Termin"}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="card bracket hq-panel">
          <div className="hq-panel-head">
            <p className="eyebrow" style={{ margin: 0 }}>Reichweite · {ANALYTICS_DAYS} Tage</p>
            <Link className="btn ghost sm" href="/admin/statistik">Auswertung</Link>
          </div>
          {!reach.available ? (
            <p className="muted" style={{ marginTop: 8 }}>Zahlen sind gerade nicht abrufbar.</p>
          ) : reach.totalViews === 0 ? (
            <p className="muted" style={{ marginTop: 8 }}>
              Noch keine Aufrufe im Zeitraum. Sobald jemand vorbeikommt, steht es hier.
            </p>
          ) : (
            <>
              <div className="hq-counts" style={{ gridTemplateColumns: "repeat(2, 1fr)", marginTop: 8 }}>
                <Link className="count" href="/admin/statistik?zeitraum=30">
                  <b>{reach.totalViews}</b>
                  <span>Aufrufe</span>
                </Link>
                <Link className="count" href="/admin/statistik?zeitraum=30">
                  <b>{reach.uniqueVisitors}</b>
                  <span>Besuche</span>
                </Link>
              </div>
              <Sparkline data={reach.byDay} />
              {topSections.length > 0 ? (
                <ul className="hq-sections">
                  {topSections.map((s) => (
                    <li key={s.key}>
                      <span>{SECTION_LABEL[s.key] ?? s.key}</span>
                      <b>{s.views}</b>
                    </li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
        </div>
      </div>

    </section>
  );
}
