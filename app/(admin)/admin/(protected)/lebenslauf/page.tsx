import Flash from "@/components/admin/Flash";
import { getResumeForEdit } from "@/lib/queries/resume";
import { SKILL_LEVELS, SKILL_LEVEL_LABEL } from "@/lib/domain";
import { computeSkillYears } from "@/lib/resume/skills";
import {
  saveResumeProfile,
  createResumeEntry,
  updateResumeEntry,
  deleteResumeEntry,
  seedResume,
} from "./actions";

export const metadata = { title: "Lebenslauf · Zentrale" };
export const dynamic = "force-dynamic";

type Entry = Awaited<ReturnType<typeof getResumeForEdit>>["entries"][number];

const SECTIONS: { key: string; label: string; hint: string }[] = [
  { key: "CAREER", label: "Beruflicher Werdegang", hint: "Neueste Station zuerst (kleinste Reihenfolge oben)." },
  { key: "EDUCATION", label: "Ausbildung", hint: "" },
  { key: "SKILL", label: "Fähigkeiten", hint: "Titel = Kategorie, Beschreibung = Liste der Fähigkeiten. Die Jahre rechnen sich aus „von“/„bis“, wenn beides lesbar ist (z. B. 03/2018 – heute)." },
  { key: "PROJECT", label: "Projektreferenzen", hint: "„Von“/„Bis“ ist DEIN Einsatz im Projekt; die Laufzeit des Projekts steht daneben. Anonyme Kunden erscheinen im Export nur mit ihrer Branche." },
];

function tagsToText(json: string | null): string {
  try {
    const a = json ? JSON.parse(json) : [];
    return Array.isArray(a) ? a.join(", ") : "";
  } catch {
    return "";
  }
}

function EntryFields({ e, section }: { e?: Entry; section: string }) {
  // Bei Fähigkeiten zeigt das Formular die berechneten Jahre an, sobald sich
  // der Zeitraum lesen lässt — sonst bleibt das Feld eine freie Eingabe.
  const derivedYears = section === "SKILL" ? computeSkillYears(e?.periodFrom, e?.periodTo) : null;
  // Je Eintrag eine eigene id: der Hinweis steht in jeder Zeile einmal, und
  // doppelte ids würden aria-describedby auf den falschen Text zeigen lassen.
  const yearsHintId = `skill-years-hint-${e?.id ?? `neu-${section}`}`;
  return (
    <>
      <input type="hidden" name="section" value={section} />
      {e ? <input type="hidden" name="id" value={e.id} /> : null}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span style={{ flex: "2 1 220px" }}>
          <label className="f">Titel {section === "SKILL" ? "(Kategorie)" : ""}</label>
          <input className="f" name="title" defaultValue={e?.title ?? ""} required />
        </span>
        <span style={{ flex: "2 1 220px" }}>
          <label className="f">
            {section === "PROJECT" ? "Kunde" : section === "CAREER" ? "Untertitel (Arbeitgeber)" : "Untertitel"}
          </label>
          <input className="f" name="subtitle" defaultValue={e?.subtitle ?? ""} />
        </span>
        <span style={{ flex: "0 1 110px" }}>
          <label className="f">{section === "PROJECT" ? "Einsatz von" : "Von"}</label>
          <input className="f" name="periodFrom" defaultValue={e?.periodFrom ?? ""} placeholder="03/2018" />
        </span>
        <span style={{ flex: "0 1 110px" }}>
          <label className="f">{section === "PROJECT" ? "Einsatz bis" : "Bis"}</label>
          <input className="f" name="periodTo" defaultValue={e?.periodTo ?? ""} placeholder="heute" />
        </span>
        <span style={{ flex: "0 1 70px" }}>
          <label className="f">Reihenf.</label>
          <input className="f" name="sortOrder" type="number" defaultValue={e?.sortOrder ?? 0} />
        </span>
      </div>

      {section === "PROJECT" ? (
        <>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
            <span style={{ flex: "0 1 130px" }}>
              <label className="f">Projekt von</label>
              <input className="f" name="projectFrom" defaultValue={e?.projectFrom ?? ""} placeholder="01/2018" />
            </span>
            <span style={{ flex: "0 1 130px" }}>
              <label className="f">Projekt bis</label>
              <input className="f" name="projectTo" defaultValue={e?.projectTo ?? ""} placeholder="12/2020" />
            </span>
            <span style={{ flex: "0 1 150px" }}>
              <label className="f">Aufwand (PT, ungefähr)</label>
              <input className="f" name="personDays" type="number" min={0} defaultValue={e?.personDays ?? ""} placeholder="120" />
            </span>
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 10 }}>
            <input type="checkbox" name="clientAnonymous" defaultChecked={e?.clientAnonymous ?? false} />
            Kunde anonym — Name erscheint nicht im Export
          </label>
          <label className="f">Branche statt Kundenname (bei anonym)</label>
          <input className="f" name="clientSector" defaultValue={e?.clientSector ?? ""} placeholder="z. B. Energieversorger" />
        </>
      ) : null}

      {section === "SKILL" ? (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 4 }}>
          <span style={{ flex: "0 1 150px" }}>
            <label className="f">Jahre Erfahrung</label>
            <input
              className="f"
              name="skillYears"
              type="number"
              min={0}
              defaultValue={derivedYears ?? e?.skillYears ?? ""}
              readOnly={derivedYears != null}
              aria-describedby={yearsHintId}
            />
          </span>
          <span style={{ flex: "1 1 200px" }}>
            <label className="f">Können</label>
            <select className="f" name="skillLevel" defaultValue={e?.skillLevel ?? ""}>
              <option value="">— keine Angabe —</option>
              {SKILL_LEVELS.map((level) => (
                <option key={level} value={level}>{SKILL_LEVEL_LABEL[level].de}</option>
              ))}
            </select>
          </span>
          <p className="meta" id={yearsHintId} style={{ flexBasis: "100%", margin: "4px 0 0" }}>
            {derivedYears != null
              ? `Aus „von“/„bis“ berechnet: ${derivedYears} ${derivedYears === 1 ? "Jahr" : "Jahre"}. Zum Ändern den Zeitraum anpassen.`
              : "Ohne lesbaren Zeitraum gilt diese Eingabe. Lesbar sind z. B. 03/2018, 2018-03, 2018 und „heute“."}
          </p>
        </div>
      ) : null}

      {section !== "SKILL" ? (
        <>
          <label className="f">Ort (optional)</label>
          <input className="f" name="location" defaultValue={e?.location ?? ""} />
        </>
      ) : (
        <input type="hidden" name="location" value="" />
      )}
      <label className="f">Beschreibung {section === "SKILL" ? "(Fähigkeiten, Komma-getrennt)" : ""}</label>
      <textarea className="f" name="description" rows={section === "SKILL" ? 2 : 3} defaultValue={e?.description ?? ""} />
      <label className="f">Tags / Technologien (Komma-getrennt, optional)</label>
      <input className="f" name="tags" defaultValue={e ? tagsToText(e.tags) : ""} placeholder="React, Azure, SharePoint" />
    </>
  );
}

export default async function ResumeAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string }>;
}) {
  const { ok, err } = await searchParams;
  const { profile, entries } = await getResumeForEdit();

  return (
    <section>
      <h1>Lebenslauf</h1>
      <Flash ok={ok} err={err} />
      <p className="muted">
        Der klassische Bewerbungs-Lebenslauf. Er liegt unter <code>/de/cv</code> bzw.
        <code>/en/cv</code>, wird aber von der Website nicht mehr verlinkt: Du gibst die Adresse
        gezielt weiter. Druckbar als A4.
      </p>

      {/* Export: öffnet einen druckfertigen A4-Auszug in einem neuen Tab
          (Browser → Drucken → Als PDF speichern). Auswahl nach Datenart und
          Zeitraum; per GET direkt an die /cv-Seite. Steht hier statt in der
          Einsatzzentrale — beim Lebenslauf sucht man ihn. */}
      <div className="card bracket" style={{ marginTop: 16, maxWidth: 720 }}>
        <p className="eyebrow" style={{ marginTop: 0 }}>Exportieren</p>
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
                <option value="ausbildung">Nur Ausbildung &amp; Auszeichnungen</option>
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

      {entries.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 16, borderColor: "var(--signal)" }}>
          <p className="eyebrow" style={{ marginTop: 0, color: "var(--signal)" }}>Startpunkt</p>
          <p className="meta" style={{ marginTop: 0 }}>
            Noch keine Einträge. Du kannst die aus deinen Profil-Dokumenten extrahierten
            Vorlagedaten übernehmen und anschließend anpassen.
          </p>
          <form action={seedResume}>
            <button className="btn solid sm" type="submit">Vorlagedaten laden</button>
          </form>
        </div>
      ) : null}

      {/* Kopf / Zusammenfassung */}
      <form action={saveResumeProfile} className="card bracket" style={{ marginTop: 16, maxWidth: 720 }}>
        <p className="eyebrow" style={{ marginTop: 0 }}>Kopf & Zusammenfassung</p>
        <label className="f">Kurztitel (z. B. „Lead Developer · Microsoft 365 & Azure“)</label>
        <input className="f" name="headline" defaultValue={profile?.headline ?? ""} />
        <label className="f">Standort</label>
        <input className="f" name="location" defaultValue={profile?.location ?? ""} />
        <label className="f">Kurzprofil / Zusammenfassung</label>
        <textarea className="f" name="summary" rows={5} defaultValue={profile?.summary ?? ""} />
        <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>Kopf speichern</button>
      </form>

      {SECTIONS.map((sec) => {
        const items = entries.filter((e) => e.section === sec.key);
        return (
          <div key={sec.key} id={sec.key} style={{ marginTop: 28 }}>
            <p className="eyebrow">{sec.label}</p>
            {sec.hint ? <p className="meta" style={{ marginTop: 0 }}>{sec.hint}</p> : null}

            {items.map((e) => (
              <div key={e.id} className="card bracket" style={{ marginTop: 10, maxWidth: 720 }}>
                <form action={updateResumeEntry}>
                  <EntryFields e={e} section={sec.key} />
                  <button className="btn solid sm" type="submit" style={{ marginTop: 10 }}>Speichern</button>
                </form>
                <form action={deleteResumeEntry} style={{ marginTop: 6 }}>
                  <input type="hidden" name="id" value={e.id} />
                  <input type="hidden" name="section" value={sec.key} />
                  <button className="btn ghost sm" type="submit">Eintrag entfernen</button>
                </form>
              </div>
            ))}

            <details className="card bracket" style={{ marginTop: 10, maxWidth: 720 }}>
              <summary style={{ cursor: "pointer" }}>+ Neuen Eintrag ({sec.label})</summary>
              <form action={createResumeEntry} style={{ marginTop: 10 }}>
                <EntryFields section={sec.key} />
                <button className="btn solid sm" type="submit" style={{ marginTop: 10 }}>Hinzufügen</button>
              </form>
            </details>
          </div>
        );
      })}
    </section>
  );
}
