import { db } from "@/lib/db";
import { LEGAL_KEYS, type LegalKey } from "@/lib/queries/legal";
import { saveLegalDoc } from "./actions";

export const metadata = { title: "Einstellungen · Zentrale" };

const LEGAL_LABEL: Record<LegalKey, string> = {
  IMPRINT: "Impressum",
  PRIVACY: "Datenschutzerklärung",
  ACCESSIBILITY: "Erklärung zur Barrierefreiheit",
};

// Pflichtfelder-Hinweise (SPEC §12) — Struktur, kein Inhalt.
const HINTS: Record<LegalKey, string> = {
  IMPRINT:
    "Pflichtfelder: Name und ladungsfähige Anschrift, E-Mail (verpflichtend), Telefon/zweiter Weg, USt-IdNr. falls vorhanden, Verantwortliche/r nach § 18 Abs. 2 MStV, ggf. EU-Streitschlichtung. LinkedIn als bevorzugter Weg zusätzlich nennen.",
  PRIVACY:
    "Inhalte: Verantwortliche, Hosting (Azure-Region nennen), Server-Logs (Zweck/Löschfrist), keine Analyse-Cookies, YouTube-Zwei-Klick, Kontakt über LinkedIn, Betroffenenrechte, Beschwerderecht.",
  ACCESSIBILITY:
    "Inhalte: Stand der Konformität, bekannte Einschränkungen (Karte), Rückmeldeweg.",
};

export default async function EinstellungenPage() {
  let docs: { docKey: string; locale: string }[] = [];
  let dbError = false;
  try {
    docs = await db.legalDoc.findMany({ select: { docKey: true, locale: true } });
  } catch {
    dbError = true;
  }
  const has = (key: string) => docs.some((d) => d.docKey === key);

  return (
    <section>
      <h1>Einstellungen</h1>
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="grid g2" style={{ marginTop: 20 }}>
        <div className="card bracket">
          <p className="eyebrow">Zugang</p>
          <p style={{ fontSize: 14 }}>
            Anmeldung ausschließlich über Microsoft Entra ID mit MFA. Keine
            Passwörter in der Anwendung, keine öffentliche Registrierung.
          </p>
        </div>
        <div className="card bracket">
          <p className="eyebrow">Sprachen</p>
          <p style={{ fontSize: 14 }}>
            Deutsch (Standard) und Englisch. Fehlt eine Übersetzung, wird auf
            Deutsch zurückgefallen — mit sichtbarem Hinweis.
          </p>
        </div>
        <div className="card bracket">
          <p className="eyebrow">Consent</p>
          <p style={{ fontSize: 14 }}>
            Consent wird nur für YouTube-Einbindungen benötigt (Zwei-Klick). Ohne
            Video-Block erscheint kein Banner.
          </p>
        </div>
        <div className="card bracket">
          <p className="eyebrow">Betrieb</p>
          <p style={{ fontSize: 14 }}>
            Deployment über Azure DevOps (main → production, manuelle Freigabe).
            Datenbank-Backup gemäß Azure-SQL-Konfiguration; Rollback per
            Traffic-Switch (siehe pipelines/).
          </p>
        </div>
      </div>

      <p className="eyebrow" style={{ marginTop: 28 }}>Rechtliche Seiten</p>
      {LEGAL_KEYS.map((key) => (
        <div className="card bracket" key={key} style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <p className="eyebrow" style={{ margin: 0 }}>{LEGAL_LABEL[key]}</p>
            <span className={`st ${has(key) ? "live" : "draft"}`}>{has(key) ? "Gepflegt" : "Entwurf"}</span>
          </div>
          <p className="meta" style={{ marginTop: 6 }}>{HINTS[key]}</p>
          <form action={saveLegalDoc}>
            <input type="hidden" name="docKey" value={key} />
            <label className="f">Sprache</label>
            <select className="f" name="locale" style={{ maxWidth: 120 }}>
              <option value="de">Deutsch</option>
              <option value="en">Englisch</option>
            </select>
            <label className="f">Titel</label>
            <input className="f" name="title" defaultValue={LEGAL_LABEL[key]} />
            <label className="f">Inhalt (wird rechtlich geprüft)</label>
            <textarea className="f" name="body" rows={6} placeholder="Von Nicole beizustellen …" />
            <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>Speichern</button>
          </form>
        </div>
      ))}
    </section>
  );
}
