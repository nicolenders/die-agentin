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

      {/* Alles, was zum Erfassen von Inhalten gebraucht wird — direkt griffbereit. */}
      <p className="eyebrow" style={{ marginTop: 26 }}>Neuen Inhalt erfassen</p>
      <div className="grid g3" style={{ marginTop: 12 }}>
        {[
          { href: "/admin/depeschen/bearbeiten", title: "Depesche", meta: "Kurzmeldung oder Fund — Link einfügen, Vorschau wird geholt" },
          { href: "/admin/einsaetze/bearbeiten", title: "Einsatz", meta: "Vor Ort oder online — Ort, Datum und Briefing zuordnen" },
          { href: "/admin/briefings/bearbeiten", title: "Briefing", meta: "Vortrag ins Repertoire aufnehmen" },
          { href: "/admin/publikationen/bearbeiten", title: "Publikation", meta: "Buch, Artikel, Kurs oder Repository" },
          { href: "/admin/identitaeten/bearbeiten", title: "Identität", meta: "Deckname mit Fokus und Werkzeugen" },
          { href: "/admin/ausbildung/bearbeiten", title: "Auszeichnung / Zertifizierung", meta: "MVP, Zertifikat oder aktuelles Lernthema" },
          { href: "/admin/medien", title: "Fotos", meta: "Bilder hochladen — Alt-Texte werden abgefragt" },
        ].map((q) => (
          <Link key={q.href + q.title} className="card bracket" href={q.href} style={{ color: "inherit" }}>
            <p className="eyebrow">Neu anlegen</p>
            <b>{q.title}</b>
            <div className="meta">{q.meta}</div>
          </Link>
        ))}
      </div>

      <p className="eyebrow" style={{ marginTop: 26 }}>Überblick</p>
      <div className="grid g3" style={{ marginTop: 12 }}>
        <Link className="card bracket" href="/admin/redaktionsplan" style={{ color: "inherit" }}>
          <b>Redaktionsplan</b>
          <div className="meta">Was ist geplant, was ist eingetaktet</div>
        </Link>
        <Link className="card bracket" href="/admin/statistik" style={{ color: "inherit" }}>
          <b>Auswertung</b>
          <div className="meta">Seitenaufrufe und Besucher nach Zeitraum und Land</div>
        </Link>
        <Link className="card bracket" href="/admin/einstellungen?tab=kanaele" style={{ color: "inherit" }}>
          <b>Kanäle</b>
          <div className="meta">Social-Media-Profile und Teilen-Vorlagen</div>
        </Link>
      </div>

      {/* Lebenslauf-Export: öffnet einen druckfertigen A4-Auszug in einem neuen
          Tab (Browser → Drucken → Als PDF speichern). Auswahl nach Datenart und
          Zeitraum; per GET direkt an die /cv-Seite. */}
      <p className="eyebrow" style={{ marginTop: 26 }}>Lebenslauf exportieren</p>
      <div className="card bracket" style={{ marginTop: 12, maxWidth: 620 }}>
        <p className="meta" style={{ marginTop: 0 }}>
          Erzeugt einen druckfertigen Lebenslauf im A4-Format (zum Ausdrucken oder als
          PDF für eine Bewerbung). Öffnet in einem neuen Tab.
        </p>
        <form action="/de/cv" method="get" target="_blank">
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <label className="f" style={{ margin: 0 }}>
              Datenart
              <select className="f" name="art" defaultValue="alle">
                <option value="alle">Alles</option>
                <option value="publikationen">Nur Publikationen</option>
                <option value="ausbildung">Nur Ausbildung & Auszeichnungen</option>
              </select>
            </label>
            <label className="f" style={{ margin: 0 }}>
              Von Jahr
              <input className="f" name="von" type="number" placeholder="z. B. 2018" style={{ maxWidth: 130 }} />
            </label>
            <label className="f" style={{ margin: 0 }}>
              Bis Jahr
              <input className="f" name="bis" type="number" placeholder="z. B. 2026" style={{ maxWidth: 130 }} />
            </label>
            <button className="btn solid sm" type="submit">Lebenslauf öffnen</button>
          </div>
        </form>
        <p className="meta" style={{ marginTop: 8, marginBottom: 0 }}>
          Leere Jahresfelder = kein Zeitfilter. Englische Fassung:{" "}
          <a href="/en/cv" target="_blank" rel="noopener noreferrer">/en/cv</a>.
        </p>
      </div>
    </section>
  );
}
