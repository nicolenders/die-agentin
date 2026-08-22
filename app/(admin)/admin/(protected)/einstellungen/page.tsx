import { LEGAL_KEYS, type LegalKey } from "@/lib/queries/legal";
import {
  SOCIAL_PLATFORMS,
  getContactInfo,
  getBios,
  getSocialLinks,
  getShareTemplates,
  getReminderSettings,
} from "@/lib/queries/settings";
import { db } from "@/lib/db";
import {
  MAX_REMINDER_LEAD_DAYS,
  MIN_REMINDER_LEAD_DAYS,
  DEFAULT_REMINDER_EMAIL,
} from "@/lib/dispatches/reminder";
import { isMailConfigured } from "@/lib/mail/send";
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
  createCategory,
  renameCategory,
  deleteCategory,
  saveReminderSettings,
} from "./actions";
import { getSpeakerFormatsRaw } from "@/lib/queries/speaker-formats";
import { parseFormatLanguages, toDurationUnit } from "@/lib/briefings/speaker-formats";
import { DURATION_UNIT_LABEL } from "@/lib/briefings/duration-unit-labels";
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
  { id: "fachgebiete", label: "Fachgebiete" },
  { id: "erinnerungen", label: "Erinnerungen" },
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
  const mailReady = isMailConfigured();

  let docs: { docKey: string; locale: string; title: string; body: string }[] = [];
  let dbError = false;
  try {
    docs = await db.legalDoc.findMany({ select: { docKey: true, locale: true, title: true, body: true } });
  } catch {
    dbError = true;
  }
  const find = (key: string, locale: string) => docs.find((d) => d.docKey === key && d.locale === locale);

  const contact = await getContactInfo();
  const [biosDe, biosEn, social, templates, speakerFormats, reminders] = await Promise.all([
    getBios("de"),
    getBios("en"),
    getSocialLinks(),
    getShareTemplates(),
    getSpeakerFormatsRaw(),
    getReminderSettings(),
  ]);

  // Fachgebiete der Depeschen (früher unter „Stammdaten"). Mit Zählung, damit
  // sichtbar ist, was in Gebrauch ist — und was sich gefahrlos löschen lässt.
  let topicCats: { id: string; nameDe: string; nameEn: string; count: number }[] = [];
  try {
    const rows = await db.taxonomy.findMany({
      where: { kind: "DOSSIER" },
      orderBy: { sortOrder: "asc" },
      include: { _count: { select: { dispatchTopics: true } } },
    });
    topicCats = rows.map((c) => ({ id: c.id, nameDe: c.nameDe, nameEn: c.nameEn, count: c._count.dispatchTopics }));
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

      {active === "fachgebiete" ? (
      <>
      <p className="eyebrow" style={{ marginTop: 20 }}>Fachgebiete</p>
      <p className="meta">
        Werkzeuge und Produkte, die du Depeschen zuordnest — Copilot Studio, Purview, Governance.
        Anlegen geht auch direkt in der Depeschen-Maske. Briefing-Kategorien pflegst du unter
        „Briefings“, Radar-Themen unter „Aufklärung (Radar)“.
      </p>
      <div className="card bracket">
        {topicCats.length === 0 ? (
          <p className="muted" style={{ marginTop: 0 }}>
            Noch kein Fachgebiet. Leg das erste an — danach steht es in jeder Depeschen-Maske bereit.
          </p>
        ) : (
          <table>
            <tbody>
              {topicCats.map((c) => (
                <tr key={c.id}>
                  <td>
                    <form action={renameCategory} style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <input type="hidden" name="id" value={c.id} />
                      <input className="f" name="nameDe" defaultValue={c.nameDe} style={{ maxWidth: 170 }} aria-label="Fachgebiet DE" />
                      <input className="f" name="nameEn" defaultValue={c.nameEn} style={{ maxWidth: 170 }} aria-label="Fachgebiet EN" />
                      <button className="btn ghost sm" type="submit">Umbenennen</button>
                    </form>
                  </td>
                  <td className="meta">{c.count} Depeschen</td>
                  <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                    <form action={deleteCategory} style={{ display: "inline" }}>
                      <input type="hidden" name="id" value={c.id} />
                      <ConfirmButton confirmText={`Fachgebiet „${c.nameDe}" löschen?`}>Löschen</ConfirmButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <form action={createCategory} style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <input className="f" name="name" placeholder="Neues Fachgebiet" style={{ maxWidth: 240 }} aria-label="Neues Fachgebiet" />
          <button className="btn ghost sm" type="submit">+ Anlegen</button>
        </form>
      </div>
      </>
      ) : null}

      {active === "erinnerungen" ? (
      <>
      <p className="eyebrow" style={{ marginTop: 20 }}>Erinnerung an Depeschen</p>
      <p className="meta">
        Rückt das Veröffentlichungsdatum einer Depesche näher, kommt eine Mail: Inhalte prüfen,
        Status setzen. Erinnert wird einmal je Termin — wird das Datum verschoben, erinnert die
        Zentrale zum neuen Termin erneut.
      </p>
      {!mailReady ? (
        <p className="meta" style={{ color: "var(--warn)" }}>
          ⚠ Es ist noch kein Mailversand eingerichtet: <code>SMTP_HOST</code> und{" "}
          <code>SMTP_FROM</code> fehlen in der Umgebung. Bis dahin wird nichts verschickt — die
          Einstellungen hier lassen sich trotzdem schon setzen.
        </p>
      ) : null}
      <form action={saveReminderSettings} className="card bracket" style={{ maxWidth: 560 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" name="reminderEnabled" defaultChecked={reminders.enabled} />
          Erinnerungen verschicken
        </label>
        <label className="f" htmlFor="reminderLeadDays" style={{ marginTop: 14 }}>
          Vorlauf in Tagen
        </label>
        <input
          className="f"
          id="reminderLeadDays"
          name="reminderLeadDays"
          type="number"
          min={MIN_REMINDER_LEAD_DAYS}
          max={MAX_REMINDER_LEAD_DAYS}
          defaultValue={reminders.leadDays}
          style={{ maxWidth: 120 }}
        />
        <p className="meta" style={{ marginTop: 4 }}>
          Wie viele Tage vor dem Veröffentlichungsdatum die Mail kommt ({MIN_REMINDER_LEAD_DAYS}–{MAX_REMINDER_LEAD_DAYS}).
        </p>
        <label className="f" htmlFor="reminderEmail">Empfängeradresse</label>
        <input
          className="f"
          id="reminderEmail"
          name="reminderEmail"
          type="email"
          defaultValue={reminders.email}
          placeholder={DEFAULT_REMINDER_EMAIL}
        />
        <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>Erinnerungen speichern</button>
      </form>
      </>
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
        ab. Die Dauer bekommt ihre eigene Einheit: Minuten für einen Vortrag, Stunden oder
        Tage für einen Workshop. Nur die Untergrenze auszufüllen ergibt eine feste Dauer
        („3 Std.“), beide Felder einen Bereich („1 bis 2 Tage“). Die Einheit wird nicht
        umgerechnet: 180 Minuten stehen als „180 Min.“ auf der Seite.
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
                  <label className="f" htmlFor={`fmt-from-${f.id}`}>Dauer von</label>
                  <input
                    className="f"
                    id={`fmt-from-${f.id}`}
                    name="durationFrom"
                    type="number"
                    min={1}
                    defaultValue={f.durationFrom ?? ""}
                    style={{ width: 100 }}
                  />
                </span>
                <span>
                  <label className="f" htmlFor={`fmt-to-${f.id}`}>bis (optional)</label>
                  <input
                    className="f"
                    id={`fmt-to-${f.id}`}
                    name="durationTo"
                    type="number"
                    min={1}
                    defaultValue={f.durationTo ?? ""}
                    style={{ width: 100 }}
                  />
                </span>
                <span>
                  <label className="f" htmlFor={`fmt-unit-${f.id}`}>Einheit</label>
                  <select
                    className="f"
                    id={`fmt-unit-${f.id}`}
                    name="durationUnit"
                    defaultValue={toDurationUnit(f.durationUnit)}
                    style={{ width: 130 }}
                  >
                    {DURATION_UNIT_LABEL.map(({ value, label }) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
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
              <label className="f" htmlFor="fmt-new-from">Dauer von</label>
              <input className="f" id="fmt-new-from" name="durationFrom" type="number" min={1} style={{ width: 100 }} />
            </span>
            <span>
              <label className="f" htmlFor="fmt-new-to">bis (optional)</label>
              <input className="f" id="fmt-new-to" name="durationTo" type="number" min={1} style={{ width: 100 }} />
            </span>
            <span>
              <label className="f" htmlFor="fmt-new-unit">Einheit</label>
              <select className="f" id="fmt-new-unit" name="durationUnit" defaultValue="MINUTES" style={{ width: 130 }}>
                {DURATION_UNIT_LABEL.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
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
