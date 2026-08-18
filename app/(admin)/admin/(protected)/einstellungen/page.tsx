import { db } from "@/lib/db";
import { LEGAL_KEYS, type LegalKey } from "@/lib/queries/legal";
import {
  SOCIAL_PLATFORMS,
  getContactInfo,
  getBios,
  getSocialLinks,
  getShareTemplates,
} from "@/lib/queries/settings";
import { SHARE_TYPES, SHARE_TYPE_LABEL, shareTemplateKey } from "@/lib/share";
import Flash from "@/components/admin/Flash";
import RichTextField from "@/components/admin/editor/RichTextField";
import InfoPopover from "@/components/admin/InfoPopover";
import {
  saveLegalDoc,
  saveContactInfo,
  saveBios,
  createSpeakerFormat,
  saveSpeakerFormat,
  deleteSpeakerFormat,
} from "./actions";
import { getSpeakerFormatsRaw } from "@/lib/queries/speaker-formats";
import { parseFormatLanguages } from "@/lib/briefings/speaker-formats";
import ConfirmButton from "@/components/admin/ConfirmButton";
import { saveSocialLinks, saveShareTemplates } from "./channel-actions";

export const metadata = { title: "Einstellungen · Zentrale" };

// Rein informative Abschnitte (kein Formular) — hinter dem Info-Icon oben rechts.
const INFO_SECTIONS = [
  {
    heading: "Zugang",
    text: "Anmeldung ausschließlich über Microsoft Entra ID mit MFA. Keine Passwörter in der Anwendung, keine öffentliche Registrierung.",
  },
  {
    heading: "Sprachen",
    text: "Deutsch (Standard) und Englisch. Fehlt eine Übersetzung, wird auf Deutsch zurückgefallen, mit sichtbarem Hinweis.",
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

// Register statt einer endlos langen Seite: der aktive Tab steht in der URL
// (?tab=…), damit er Reload und die Rückkehr nach dem Speichern übersteht.
const TABS = [
  { id: "kontakt", label: "Kontakt" },
  { id: "kanaele", label: "Kanäle" },
  { id: "bios", label: "Speaker-Kit-Bios" },
  { id: "formate", label: "Speaker-Kit-Formate" },
  { id: "recht", label: "Rechtliche Seiten" },
] as const;

export default async function EinstellungenPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; tab?: string }>;
}) {
  const { ok, err, tab } = await searchParams;
  const active = TABS.find((t) => t.id === tab)?.id ?? "kontakt";

  let docs: { docKey: string; locale: string; title: string; body: string }[] = [];
  let dbError = false;
  try {
    docs = await db.legalDoc.findMany({ select: { docKey: true, locale: true, title: true, body: true } });
  } catch {
    dbError = true;
  }
  const find = (key: string, locale: string) => docs.find((d) => d.docKey === key && d.locale === locale);

  const contact = await getContactInfo();
  const [biosDe, biosEn, social, templates, speakerFormats] = await Promise.all([
    getBios("de"),
    getBios("en"),
    getSocialLinks(),
    getShareTemplates(),
    getSpeakerFormatsRaw(),
  ]);

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

      <div className="tab-bar" role="tablist" style={{ marginTop: 16 }}>
        {TABS.map((t) => (
          <a
            key={t.id}
            role="tab"
            aria-selected={t.id === active}
            className={`tab${t.id === active ? " active" : ""}`}
            href={`/admin/einstellungen?tab=${t.id}`}
          >
            {t.label}
          </a>
        ))}
      </div>

      {active === "kontakt" ? (
      <div className="card bracket" style={{ marginTop: 20 }}>
        <p className="eyebrow">Kontaktinformationen</p>
        <p className="meta" style={{ marginTop: 0 }}>
          E-Mail und Anschrift werden hier an EINER Stelle gepflegt: die Legende und das Impressum lesen sie aus.
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
      ) : null}

      {active === "kanaele" ? (
      <>
      <p className="muted" style={{ marginTop: 20 }}>
        Deine Social-Media-Profile und die Vorlagetexte fürs Teilen. Alle Kanäle laufen gleich:
        im Eintrag auf „Teilen“ klicken, Text kopieren und dein Profil öffnen.
      </p>

      <p className="eyebrow" style={{ marginTop: 20 }}>Social-Media-Profile</p>
      <p className="meta">
        Erscheinen als anklickbare Icons im Footer und auf der Legende. Leeres Feld = Link ausgeblendet.
        Ohne vollständige Adresse wird <code>https://</code> ergänzt. GitHub und YouTube werden beim Teilen
        nicht angeboten.
      </p>
      <form action={saveSocialLinks} className="card bracket">
        <div className="grid g2">
          {SOCIAL_PLATFORMS.map((p) => (
            <div key={p.key}>
              <label className="f" htmlFor={`social-${p.key}`}>{p.label}</label>
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
        <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>Profile speichern</button>
      </form>

      <p className="eyebrow" style={{ marginTop: 28 }}>Teilen-Vorlagen</p>
      <p className="meta">
        Ein wiedererkennbarer Text je Typ, auf Deutsch und Englisch. Platzhalter:{" "}
        <code>{"{title}"}</code>, <code>{"{url}"}</code>, <code>{"{identities}"}</code>,{" "}
        <code>{"{city}"}</code> (Einsatz), <code>{"{date}"}</code> (Einsatz). Sind keine Identitäten
        verknüpft, wird <code>{"{identities}"}</code> zu „die Agentin“ / „the Agent“.
      </p>
      <form action={saveShareTemplates}>
        {SHARE_TYPES.map((type) => (
          <div className="card bracket" key={type} style={{ marginBottom: 14 }}>
            <p className="eyebrow" style={{ margin: 0 }}>{SHARE_TYPE_LABEL[type]}</p>
            <div className="grid g2" style={{ marginTop: 10 }}>
              <div>
                <label className="f" htmlFor={`${type}-de`}>Deutsch</label>
                <textarea id={`${type}-de`} className="f" name={shareTemplateKey(type, "de")} rows={4} defaultValue={templates[type].de} />
              </div>
              <div>
                <label className="f" htmlFor={`${type}-en`}>Englisch</label>
                <textarea id={`${type}-en`} className="f" name={shareTemplateKey(type, "en")} rows={4} defaultValue={templates[type].en} />
              </div>
            </div>
          </div>
        ))}
        <button className="btn solid sm" type="submit">Vorlagen speichern</button>
      </form>
      </>
      ) : null}

      {active === "bios" ? (
      <>
      <p className="eyebrow" style={{ marginTop: 20 }}>Speaker-Kit-Bios</p>
      <p className="meta">
        Drei Längen je Sprache für die Akte / das Speaker-Kit (Kurz ~50, Mittel ~150, Lang ~400 Wörter).
        Solange ein Feld leer ist, zeigt die öffentliche Seite dafür einen Platzhalter. Absätze mit einer
        Leerzeile trennen.
      </p>
      <div className="card bracket" style={{ marginBottom: 16 }}>
        <div className="grid g2">
          {LOCALES.map(({ code, label }) => {
            const bios = code === "en" ? biosEn : biosDe;
            const filled = Boolean(bios.short.trim() || bios.medium.trim() || bios.long.trim());
            return (
              <form action={saveBios} key={code}>
                <input type="hidden" name="locale" value={code} />
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <label className="f" style={{ margin: 0 }}>{label}</label>
                  <span className={`st ${filled ? "live" : "draft"}`}>{filled ? "Gepflegt" : "Fehlt"}</span>
                </div>
                <label className="f">Kurz (ca. 50 Wörter)</label>
                <textarea className="f" name="short" rows={3} defaultValue={bios.short} />
                <label className="f">Mittel (ca. 150 Wörter)</label>
                <textarea className="f" name="medium" rows={5} defaultValue={bios.medium} />
                <label className="f">Lang (ca. 400 Wörter)</label>
                <textarea className="f" name="long" rows={9} defaultValue={bios.long} />
                <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>
                  Bios speichern ({label})
                </button>
              </form>
            );
          })}
        </div>
      </div>
      </>
      ) : null}

      {active === "formate" ? (
      <>
      <p className="eyebrow" style={{ marginTop: 20 }}>Speaker-Kit-Formate</p>
      <p className="meta">
        Was du Veranstaltern anbietest. Diese Liste steht in der Akte unter „Formate“.
        Solange sie leer ist, leitet die Akte die Formate aus den Dauern deiner Briefings
        ab. Die Dauer wird als Minutenbereich gepflegt und in beiden Sprachen richtig
        geschrieben; nur die Untergrenze auszufüllen ergibt eine feste Dauer.
      </p>

      {speakerFormats.map((f) => {
        const langs = parseFormatLanguages(f.languages);
        return (
          <div className="card bracket" key={f.id} style={{ marginBottom: 14 }}>
            <form action={saveSpeakerFormat}>
              <input type="hidden" name="id" value={f.id} />
              <div className="grid g2" style={{ alignItems: "start" }}>
                <div>
                  <label className="f" htmlFor={`fmt-titleDe-${f.id}`}>Format (DE)</label>
                  <input className="f" id={`fmt-titleDe-${f.id}`} name="titleDe" defaultValue={f.titleDe} required />
                  <label className="f" htmlFor={`fmt-noteDe-${f.id}`}>Beschreibung (DE, optional)</label>
                  <textarea className="f" id={`fmt-noteDe-${f.id}`} name="noteDe" rows={2} defaultValue={f.noteDe ?? ""} />
                </div>
                <div>
                  <label className="f" htmlFor={`fmt-titleEn-${f.id}`}>Format (EN, optional)</label>
                  <input className="f" id={`fmt-titleEn-${f.id}`} name="titleEn" defaultValue={f.titleEn ?? ""} />
                  <label className="f" htmlFor={`fmt-noteEn-${f.id}`}>Beschreibung (EN, optional)</label>
                  <textarea className="f" id={`fmt-noteEn-${f.id}`} name="noteEn" rows={2} defaultValue={f.noteEn ?? ""} />
                </div>
              </div>

              <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
                <span>
                  <label className="f" htmlFor={`fmt-min-${f.id}`}>Dauer von (Min.)</label>
                  <input
                    className="f"
                    id={`fmt-min-${f.id}`}
                    name="minutesMin"
                    type="number"
                    min={1}
                    defaultValue={f.minutesMin ?? ""}
                    style={{ width: 120 }}
                  />
                </span>
                <span>
                  <label className="f" htmlFor={`fmt-max-${f.id}`}>bis (Min., optional)</label>
                  <input
                    className="f"
                    id={`fmt-max-${f.id}`}
                    name="minutesMax"
                    type="number"
                    min={1}
                    defaultValue={f.minutesMax ?? ""}
                    style={{ width: 120 }}
                  />
                </span>
                <span>
                  <label className="f" htmlFor={`fmt-sort-${f.id}`}>Reihenfolge</label>
                  <input
                    className="f"
                    id={`fmt-sort-${f.id}`}
                    name="sortOrder"
                    type="number"
                    defaultValue={f.sortOrder}
                    style={{ width: 100 }}
                  />
                </span>
                <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
                  <legend className="f" style={{ padding: 0 }}>Angeboten auf</legend>
                  {LOCALES.map(({ code, label }) => (
                    <label key={code} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginRight: 14 }}>
                      <input type="checkbox" name={`lang-${code}`} defaultChecked={langs.includes(code)} />
                      {label}
                    </label>
                  ))}
                </fieldset>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                  <input type="checkbox" name="active" defaultChecked={f.active} />
                  In der Akte zeigen
                </label>
                <button className="btn solid sm" type="submit" style={{ marginLeft: "auto" }}>
                  Speichern
                </button>
              </div>
            </form>
            <form action={deleteSpeakerFormat} style={{ marginTop: 10 }}>
              <input type="hidden" name="id" value={f.id} />
              <ConfirmButton confirmText={`Format „${f.titleDe}" löschen?`}>Löschen</ConfirmButton>
            </form>
          </div>
        );
      })}

      <div className="card bracket">
        <p className="eyebrow" style={{ marginTop: 0 }}>Neues Format</p>
        <form action={createSpeakerFormat}>
          <div className="grid g2" style={{ alignItems: "start" }}>
            <div>
              <label className="f" htmlFor="fmt-new-titleDe">Format (DE)</label>
              <input className="f" id="fmt-new-titleDe" name="titleDe" placeholder="z. B. Keynote" required />
              <label className="f" htmlFor="fmt-new-noteDe">Beschreibung (DE, optional)</label>
              <textarea className="f" id="fmt-new-noteDe" name="noteDe" rows={2} />
            </div>
            <div>
              <label className="f" htmlFor="fmt-new-titleEn">Format (EN, optional)</label>
              <input className="f" id="fmt-new-titleEn" name="titleEn" />
              <label className="f" htmlFor="fmt-new-noteEn">Beschreibung (EN, optional)</label>
              <textarea className="f" id="fmt-new-noteEn" name="noteEn" rows={2} />
            </div>
          </div>
          <div style={{ display: "flex", gap: 18, flexWrap: "wrap", alignItems: "flex-end", marginTop: 12 }}>
            <span>
              <label className="f" htmlFor="fmt-new-min">Dauer von (Min.)</label>
              <input className="f" id="fmt-new-min" name="minutesMin" type="number" min={1} style={{ width: 120 }} />
            </span>
            <span>
              <label className="f" htmlFor="fmt-new-max">bis (Min., optional)</label>
              <input className="f" id="fmt-new-max" name="minutesMax" type="number" min={1} style={{ width: 120 }} />
            </span>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend className="f" style={{ padding: 0 }}>Angeboten auf</legend>
              {LOCALES.map(({ code, label }) => (
                <label key={code} style={{ display: "inline-flex", alignItems: "center", gap: 6, marginRight: 14 }}>
                  <input type="checkbox" name={`lang-${code}`} defaultChecked />
                  {label}
                </label>
              ))}
            </fieldset>
            <label style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <input type="checkbox" name="active" defaultChecked />
              In der Akte zeigen
            </label>
            <button className="btn solid sm" type="submit" style={{ marginLeft: "auto" }}>
              + Format anlegen
            </button>
          </div>
        </form>
      </div>
      </>
      ) : null}

      {active === "recht" ? (
      <>
      <p className="eyebrow" style={{ marginTop: 20 }}>Rechtliche Seiten</p>
      <p className="meta">Bereits gespeicherter Text wird angezeigt und kann bearbeitet werden, je Sprache getrennt.</p>
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
      </>
      ) : null}
    </section>
  );
}
