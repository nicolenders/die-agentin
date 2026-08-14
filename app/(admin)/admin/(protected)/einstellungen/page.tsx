import { db } from "@/lib/db";
import { LEGAL_KEYS, type LegalKey } from "@/lib/queries/legal";
import { SOCIAL_PLATFORMS, socialSettingKey, getContactInfo } from "@/lib/queries/settings";
import Flash from "@/components/admin/Flash";
import RichTextField from "@/components/admin/editor/RichTextField";
import InfoPopover from "@/components/admin/InfoPopover";
import { saveLegalDoc, saveSocialLinks, saveContactInfo } from "./actions";

export const metadata = { title: "Einstellungen · Zentrale" };

// Rein informative Abschnitte (kein Formular) — hinter dem Info-Icon oben rechts.
const INFO_SECTIONS = [
  {
    heading: "Zugang",
    text: "Anmeldung ausschließlich über Microsoft Entra ID mit MFA. Keine Passwörter in der Anwendung, keine öffentliche Registrierung.",
  },
  {
    heading: "Sprachen",
    text: "Deutsch (Standard) und Englisch. Fehlt eine Übersetzung, wird auf Deutsch zurückgefallen — mit sichtbarem Hinweis.",
  },
  {
    heading: "Consent",
    text: "Consent wird nur für YouTube-Einbindungen benötigt (Zwei-Klick). Ohne Video-Block erscheint kein Banner.",
  },
  {
    heading: "Betrieb",
    text: "Deployment automatisch über GitHub Actions (Push auf main → Build → Deploy). Datenbank-Backup gemäß Azure-SQL-Konfiguration; Rollback per Traffic-Switch auf eine ältere Revision.",
  },
];

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

const LOCALES = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "Englisch" },
] as const;

export default async function EinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;

  let docs: { docKey: string; locale: string; title: string; body: string }[] = [];
  let dbError = false;
  try {
    docs = await db.legalDoc.findMany({ select: { docKey: true, locale: true, title: true, body: true } });
  } catch {
    dbError = true;
  }
  const find = (key: string, locale: string) => docs.find((d) => d.docKey === key && d.locale === locale);

  const contact = await getContactInfo();

  const social: Record<string, string> = {};
  try {
    const rows = await db.siteSetting.findMany({
      where: { key: { in: SOCIAL_PLATFORMS.map((p) => socialSettingKey(p.key)) } },
      select: { key: true, value: true },
    });
    for (const row of rows) social[row.key.replace(/^social\./, "")] = row.value;
  } catch {
    dbError = true;
  }

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Einstellungen</h1>
        <div style={{ marginLeft: "auto" }}>
          <InfoPopover title="Betrieb & Rahmen" sections={INFO_SECTIONS} />
        </div>
      </div>
      <Flash ok={ok} err={err} />
      {dbError ? <p className="st sched" style={{ display: "inline-block" }}>Datenbank wird geweckt …</p> : null}

      <div className="card bracket" style={{ marginTop: 20 }}>
        <p className="eyebrow">Kontaktinformationen</p>
        <p className="meta" style={{ marginTop: 0 }}>
          E-Mail und Anschrift werden hier an EINER Stelle gepflegt — die Legende und das Impressum lesen sie aus.
          {!contact.email || !contact.postalAddress ? (
            <span style={{ color: "var(--warn)" }}> ⚠ Ohne E-Mail und Anschrift darf das Impressum nicht öffentlich gehen.</span>
          ) : null}
        </p>
        <form action={saveContactInfo} style={{ maxWidth: 520 }}>
          <label className="f">Kontakt-E-Mail</label>
          <input className="f" name="contactEmail" type="email" defaultValue={contact.email} placeholder="name@example.com" />
          <label className="f">Ladungsfähige Anschrift (mehrzeilig)</label>
          <textarea className="f" name="postalAddress" rows={4} defaultValue={contact.postalAddress} placeholder={"Vorname Nachname\nStraße Hausnr.\nPLZ Ort"} />
          <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>Kontaktangaben speichern</button>
        </form>
      </div>

      <p className="eyebrow" style={{ marginTop: 28 }}>Social-Media-Profile</p>
      <p className="meta">
        Erscheinen als anklickbare Icons im Footer und auf der Legende-Seite.
        Leeres Feld = Link wird ausgeblendet. Ohne vollständige Adresse wird{" "}
        <code>https://</code> ergänzt.
      </p>
      <form action={saveSocialLinks} className="card bracket" style={{ marginBottom: 16 }}>
        <div className="grid g2">
          {SOCIAL_PLATFORMS.map((p) => (
            <div key={p.key}>
              <label className="f" htmlFor={`social-${p.key}`}>
                {p.label}
              </label>
              <input
                id={`social-${p.key}`}
                className="f"
                name={p.key}
                type="url"
                inputMode="url"
                defaultValue={social[p.key] ?? ""}
                placeholder={p.placeholder}
              />
            </div>
          ))}
        </div>
        <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>
          Profile speichern
        </button>
      </form>

      <p className="eyebrow" style={{ marginTop: 28 }}>Rechtliche Seiten</p>
      <p className="meta">Bereits gespeicherter Text wird angezeigt und kann bearbeitet werden — je Sprache getrennt.</p>
      {LEGAL_KEYS.map((key) => (
        <div className="card bracket" key={key} style={{ marginBottom: 16 }}>
          <p className="eyebrow" style={{ margin: 0 }}>{LEGAL_LABEL[key]}</p>
          <p className="meta" style={{ marginTop: 6 }}>{HINTS[key]}</p>
          <div className="grid g2" style={{ marginTop: 12 }}>
            {LOCALES.map(({ code, label }) => {
              const doc = find(key, code);
              return (
                <form action={saveLegalDoc} key={code}>
                  <input type="hidden" name="docKey" value={key} />
                  <input type="hidden" name="locale" value={code} />
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <label className="f" style={{ margin: 0 }}>{label}</label>
                    <span className={`st ${doc ? "live" : "draft"}`}>{doc ? "Gepflegt" : "Fehlt"}</span>
                  </div>
                  <label className="f">Titel</label>
                  <input className="f" name="title" defaultValue={doc?.title ?? LEGAL_LABEL[key]} />
                  <label className="f">Inhalt (wird rechtlich geprüft)</label>
                  <RichTextField name="body" defaultValue={doc?.body ?? ""} ariaLabel={`${LEGAL_LABEL[key]} ${label}`} />
                  <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>
                    {doc ? "Aktualisieren" : "Speichern"}
                  </button>
                </form>
              );
            })}
          </div>
        </div>
      ))}
    </section>
  );
}
