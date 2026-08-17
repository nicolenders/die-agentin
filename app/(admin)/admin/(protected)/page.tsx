import Link from "next/link";
import { getSessionUser } from "@/lib/auth/guard";
import { getDashboardStats, type ContentCounts } from "@/lib/queries/dashboard";
import EntityIcon, { type EntityIconName } from "@/components/admin/EntityIcon";

export const metadata = { title: "Einsatzzentrale · Zentrale" };

// Kennzahlen je Inhaltsart. Jede Zahl ist ein Link in die passend gefilterte
// Liste — die Zentrale zeigt nicht nur, wo etwas liegt, sondern bringt einen
// auch hin.
const OVERVIEW: { key: keyof Pick<Awaited<ReturnType<typeof getDashboardStats>>, "missions" | "briefings" | "dispatches">; label: string; icon: EntityIconName; list: string; filter: { drafts: string; published: string; archived: string } }[] = [
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
  { href: "/admin/redaktionsplan", label: "Redaktionsplan", icon: "plan" },
  { href: "/admin/aufklaerung", label: "Radar", icon: "radar" },
  { href: "/admin/statistik", label: "Auswertung", icon: "stats" },
  { href: "/admin/lebenslauf", label: "Lebenslauf", icon: "resume" },
  { href: "/admin/einstellungen?tab=kanaele", label: "Kanäle", icon: "settings" },
];

function CountCell({ href, value, label }: { href: string; value: number; label: string }) {
  return (
    <Link className={`count${value === 0 ? " zero" : ""}`} href={href}>
      <b>{value}</b>
      <span>{label}</span>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await getSessionUser();
  const stats = await getDashboardStats();
  const greetingName = user?.name?.split(" ")[0] ?? "Nicole";
  const counts: Record<(typeof OVERVIEW)[number]["key"], ContentCounts> = {
    missions: stats.missions,
    briefings: stats.briefings,
    dispatches: stats.dispatches,
  };

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

      <p className="eyebrow hq-label">Neu anlegen</p>
      <div className="hq-tiles">
        {CREATE.map((q) => (
          <Link key={q.href} className="tile" href={q.href}>
            <EntityIcon name={q.icon} size={22} />
            <span>{q.label}</span>
          </Link>
        ))}
      </div>

      <p className="eyebrow hq-label">Direkt hin</p>
      <div className="hq-tiles">
        {JUMP.map((q) => (
          <Link key={q.href} className="tile ghost" href={q.href}>
            <EntityIcon name={q.icon} size={20} />
            <span>{q.label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
