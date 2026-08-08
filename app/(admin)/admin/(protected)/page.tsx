import Link from "next/link";
import { getSessionUser } from "@/lib/auth/guard";
import { getDashboardStats } from "@/lib/queries/dashboard";

export const metadata = { title: "Einsatzzentrale · Zentrale" };

// Dashboard / Einsatzzentrale. Liest Kennzahlen aus der DB (Admin toleriert
// einen Kaltstart der serverlosen DB, SPEC §2.1). Reiche Kachel-Details der
// Warteschlange und Kanäle folgen in M3/M7.
export default async function DashboardPage() {
  const user = await getSessionUser();
  const stats = await getDashboardStats();
  const greetingName = user?.name?.split(" ")[0] ?? "Nicole";

  return (
    <section>
      <h1>Guten Tag, {greetingName}.</h1>
      {stats.dbUnavailable ? (
        <p className="st sched" style={{ display: "inline-block" }}>
          Datenbank wird geweckt … einen Moment.
        </p>
      ) : (
        <p className="muted">
          {stats.drafts} Entwürfe, {stats.scheduled} eingeplant, {stats.published}{" "}
          veröffentlicht.
        </p>
      )}

      {stats.linkedInWarnDays !== null ? (
        <div className="card bracket" style={{ borderLeft: "2px solid var(--warn)", margin: "16px 0" }}>
          <b>LinkedIn-Verbindung läuft ab</b>
          <div className="meta">
            {stats.linkedInWarnDays <= 0
              ? "Zugriff abgelaufen — neu autorisieren, sonst pausiert die automatische Veröffentlichung."
              : `Läuft in ${stats.linkedInWarnDays} Tagen ab. Neu autorisieren, sonst pausiert die automatische Veröffentlichung.`}
          </div>
          <Link className="btn ghost sm" href="/admin/kanaele" style={{ marginTop: 8 }}>
            Zu den Kanälen
          </Link>
        </div>
      ) : null}

      <div className="grid g4" style={{ margin: "22px 0 26px" }}>
        <div className="card bracket stat">
          <b>{stats.drafts}</b>
          <span>Entwürfe</span>
        </div>
        <div className="card bracket stat">
          <b>{stats.scheduled}</b>
          <span>Eingeplant</span>
        </div>
        <div className="card bracket stat">
          <b>{stats.published}</b>
          <span>Veröffentlicht</span>
        </div>
        <div className="card bracket stat">
          <b>{stats.channelErrors}</b>
          <span>Kanal-Fehler</span>
        </div>
      </div>

      <div className="grid g3">
        <Link className="card bracket" href="/admin/editor" style={{ color: "inherit" }}>
          <p className="eyebrow">Schnell erfassen</p>
          <b>Signal anlegen</b>
          <div className="meta">
            Link einfügen → Titel und Vorschau werden automatisch geholt
          </div>
        </Link>
        <Link className="card bracket" href="/admin/einsaetze/bearbeiten" style={{ color: "inherit" }}>
          <p className="eyebrow">Schnell erfassen</p>
          <b>Einsatz nachtragen</b>
          <div className="meta">Ort auf der Karte setzen, Briefing zuordnen</div>
        </Link>
        <Link className="card bracket" href="/admin/medien" style={{ color: "inherit" }}>
          <p className="eyebrow">Schnell erfassen</p>
          <b>Fotos hochladen</b>
          <div className="meta">Alt-Texte werden beim Upload abgefragt</div>
        </Link>
      </div>
    </section>
  );
}
