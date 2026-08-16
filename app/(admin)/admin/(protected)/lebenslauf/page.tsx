import Flash from "@/components/admin/Flash";
import { getResumeForEdit } from "@/lib/queries/resume";
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
  { key: "SKILL", label: "Fähigkeiten", hint: "Titel = Kategorie, Beschreibung = Liste der Fähigkeiten." },
  { key: "PROJECT", label: "Projektreferenzen", hint: "Kunde als Untertitel, Technologien als Tags (Komma-getrennt)." },
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
          <label className="f">Untertitel {section === "PROJECT" ? "(Kunde)" : section === "CAREER" ? "(Arbeitgeber)" : ""}</label>
          <input className="f" name="subtitle" defaultValue={e?.subtitle ?? ""} />
        </span>
        <span style={{ flex: "0 1 90px" }}>
          <label className="f">Von</label>
          <input className="f" name="periodFrom" defaultValue={e?.periodFrom ?? ""} placeholder="03/2018" />
        </span>
        <span style={{ flex: "0 1 90px" }}>
          <label className="f">Bis</label>
          <input className="f" name="periodTo" defaultValue={e?.periodTo ?? ""} placeholder="heute" />
        </span>
        <span style={{ flex: "0 1 70px" }}>
          <label className="f">Reihenf.</label>
          <input className="f" name="sortOrder" type="number" defaultValue={e?.sortOrder ?? 0} />
        </span>
      </div>
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
        Der klassische Bewerbungs-Lebenslauf. Öffentlich abrufbar über die Legende (Button „CV
        abrufen“) und druckbar als A4.
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
