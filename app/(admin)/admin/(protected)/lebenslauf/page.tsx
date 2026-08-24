import Link from "next/link";
import Flash from "@/components/admin/Flash";
import Tabs, { type TabDef } from "@/components/admin/Tabs";
import AssetPickerField from "@/components/admin/AssetPickerField";
import ResumeEntryTable, { type ResumeEntryRow } from "@/components/admin/ResumeEntryTable";
import ResumeExportDialog, { type ExportGroup } from "@/components/admin/ResumeExportDialog";
import { getResumeForEdit } from "@/lib/queries/resume";
import { getLegend } from "@/lib/queries/legend";
import { getCertifications, getPublications } from "@/lib/queries/records";
import { publicationTypeLabel } from "@/lib/records/publication-type";
import { formatPeriod } from "@/lib/resume/projects";
import { publicationsForCv, splitRecordsForCv } from "@/lib/resume/records";
import { inDisplayOrder, splitProjects } from "@/lib/resume/order";
import { RESUME_SECTION_LABEL, toResumeTab, type ResumeSection } from "@/lib/resume/sections";
import type { CertificationRecord } from "@/lib/queries/records";
import {
  saveResumeProfile,
  saveResumePortrait,
  createResumeEntry,
  updateResumeEntry,
  deleteResumeEntry,
  reorderResumeEntry,
  seedResume,
} from "./actions";

export const metadata = { title: "Lebenslauf · Zentrale" };
export const dynamic = "force-dynamic";

type DbEntry = Awaited<ReturnType<typeof getResumeForEdit>>["entries"][number];

function tagsToText(json: string | null): string {
  try {
    const a = json ? JSON.parse(json) : [];
    return Array.isArray(a) ? a.join(", ") : "";
  } catch {
    return "";
  }
}

/** DB-Zeile → das, was die Tabelle im Browser braucht (alles serialisierbar). */
function toRow(e: DbEntry): ResumeEntryRow {
  return {
    id: e.id,
    section: e.section as ResumeSection,
    title: e.title,
    subtitle: e.subtitle,
    location: e.location,
    periodFrom: e.periodFrom,
    periodTo: e.periodTo,
    description: e.description,
    tagsText: tagsToText(e.tags),
    projectFrom: e.projectFrom,
    projectTo: e.projectTo,
    personDays: e.personDays,
    clientAnonymous: e.clientAnonymous,
    clientSector: e.clientSector,
    skillYears: e.skillYears,
    skillLevel: e.skillLevel,
  };
}

function certYear(cert: CertificationRecord): string {
  return String(cert.acquiredOn.getUTCFullYear());
}

/** Ein Bereich, der hier nur gelesen wird — gepflegt wird er woanders. */
function ReadOnlySection({
  intro,
  href,
  linkLabel,
  rows,
  emptyText,
}: {
  intro: string;
  href: string;
  linkLabel: string;
  rows: { id: string; when: string; title: string; meta: string }[];
  emptyText: string;
}) {
  return (
    <div style={{ marginTop: 18 }}>
      <p className="meta" style={{ marginTop: 0 }}>{intro}</p>
      <p style={{ marginTop: 8 }}>
        <Link className="btn ghost sm" href={href}>{linkLabel}</Link>
      </p>
      {rows.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 12 }}>
          <p className="muted" style={{ margin: 0 }}>{emptyText}</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table className="media-table">
            <thead>
              <tr>
                <th style={{ width: 110 }}>Jahr</th>
                <th>Titel</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="meta" style={{ whiteSpace: "nowrap" }}>{r.when}</td>
                  <td><b>{r.title}</b></td>
                  <td className="meta">{r.meta || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default async function ResumeAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ ok?: string; err?: string; tab?: string }>;
}) {
  const { ok, err, tab } = await searchParams;
  const activeTab = toResumeTab(tab);
  const [{ profile, portraitUrl, entries }, legend, certsAll, pubsAll] = await Promise.all([
    getResumeForEdit(),
    getLegend("de"),
    getCertifications("de"),
    getPublications("de"),
  ]);

  const rows = entries.map(toRow);
  // Dieselbe Reihenfolge, die der Lebenslauf zeigt — Tabelle, Auswahldialog und
  // Dokument müssen sich einig sein, sonst verschiebt ein Pfeil etwas anderes,
  // als er anzeigt (lib/resume/order.ts).
  const bySection = (s: ResumeSection) => inDisplayOrder(s, rows.filter((r) => r.section === s));
  const career = bySection("CAREER");
  const education = bySection("EDUCATION");
  // Projekte zerfallen in zwei Listen: mit Zeitraum und — aus den alten
  // Profil-Dokumenten — nur mit Dauer. Genauso zeigt der Lebenslauf sie.
  const { dated: projects, undated: legacyProjects } = splitProjects(bySection("PROJECT"));
  const skills = bySection("SKILL");

  const records = splitRecordsForCv(certsAll);
  const publications = publicationsForCv(pubsAll);

  // Was der Export-Dialog zur Auswahl stellt — dieselben Einträge, die das
  // Dokument kennt, in derselben Reihenfolge.
  const exportGroups: ExportGroup[] = [
    {
      key: "career",
      label: RESUME_SECTION_LABEL.CAREER,
      items: career.map((r) => ({ id: r.id, label: r.title, meta: formatPeriod(r.periodFrom, r.periodTo) ?? undefined })),
    },
    {
      key: "education",
      label: RESUME_SECTION_LABEL.EDUCATION,
      items: education.map((r) => ({ id: r.id, label: r.title, meta: formatPeriod(r.periodFrom, r.periodTo) ?? undefined })),
    },
    {
      key: "skills",
      label: RESUME_SECTION_LABEL.SKILL,
      items: skills.map((r) => ({ id: r.id, label: r.title })),
    },
    {
      key: "projects",
      label: RESUME_SECTION_LABEL.PROJECT,
      items: projects.map((r) => ({ id: r.id, label: r.title, meta: formatPeriod(r.periodFrom, r.periodTo) ?? undefined })),
    },
    {
      key: "projects-legacy",
      label: "Ältere Projekte",
      items: legacyProjects.map((r) => ({
        id: r.id,
        label: r.title,
        meta: r.periodFrom ?? undefined,
      })),
    },
    {
      key: "certifications",
      label: "Zertifizierungen",
      items: records.certifications.map((c) => ({ id: c.id, label: c.name, meta: certYear(c) })),
    },
    {
      key: "trainings",
      label: "Schulungen & Trainings",
      items: records.trainings.map((c) => ({ id: c.id, label: c.name, meta: certYear(c) })),
    },
    {
      key: "awards",
      label: "Auszeichnungen",
      items: records.awards.map((c) => ({ id: c.id, label: c.name, meta: certYear(c) })),
    },
    {
      key: "publications",
      label: "Publikationen",
      items: publications.map((p) => ({
        id: p.id,
        label: p.title,
        meta: [String(p.year), publicationTypeLabel(p.type, "de")].join(" · "),
      })),
    },
  ];

  const tabs: TabDef[] = [
    {
      id: "person",
      label: "Zur Person",
      content: (
        <div style={{ marginTop: 18 }}>
          {entries.length === 0 ? (
            <div className="card bracket" style={{ borderColor: "var(--signal)", marginBottom: 16 }}>
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

          <form action={saveResumeProfile} className="card bracket" style={{ maxWidth: 760 }}>
            <p className="eyebrow" style={{ marginTop: 0 }}>Kopf &amp; Zusammenfassung</p>
            <label className="f" htmlFor="cv-headline">
              Kurztitel (z. B. „Lead Developer · Microsoft 365 &amp; Azure“)
            </label>
            <input className="f" id="cv-headline" name="headline" defaultValue={profile?.headline ?? ""} />
            <label className="f" htmlFor="cv-location">Standort</label>
            <input className="f" id="cv-location" name="location" defaultValue={profile?.location ?? ""} />
            <label className="f" htmlFor="cv-summary">Kurzprofil / Zusammenfassung</label>
            <textarea className="f" id="cv-summary" name="summary" rows={6} defaultValue={profile?.summary ?? ""} />
            <button className="btn solid sm" type="submit" style={{ marginTop: 12 }}>Speichern</button>
          </form>

          <p className="meta" style={{ marginTop: 12, maxWidth: 760 }}>
            Name, E-Mail-Adresse, LinkedIn-Profil und Arbeitgeber stehen im Lebenslauf, kommen
            aber aus der Legende und den Einstellungen — dort gepflegt, hier verwendet.
          </p>
        </div>
      ),
    },
    {
      id: "werdegang",
      label: "Beruflicher Werdegang & Ausbildung",
      content: (
        <div>
          <ResumeEntryTable
            section="CAREER"
            label={RESUME_SECTION_LABEL.CAREER}
            hint="Alles, was du beruflich gemacht hast — mit Zeitraum, Arbeitgeber und einem Satz dazu."
            rows={career}
            createAction={createResumeEntry}
            updateAction={updateResumeEntry}
            deleteAction={deleteResumeEntry}
            reorderAction={reorderResumeEntry}
            emptyText="Noch keine Station erfasst. Fang mit der aktuellen an — sie steht später oben."
          />
          <ResumeEntryTable
            section="EDUCATION"
            label={RESUME_SECTION_LABEL.EDUCATION}
            hint="Abschlüsse und Ausbildungen. Studium und Berufsausbildung gehören hierhin, Zertifikate nicht — die kommen aus dem Bereich „Ausbildung & Auszeichnungen“."
            rows={education}
            createAction={createResumeEntry}
            updateAction={updateResumeEntry}
            deleteAction={deleteResumeEntry}
            reorderAction={reorderResumeEntry}
            emptyText="Noch keine Ausbildung erfasst."
          />
        </div>
      ),
    },
    {
      id: "projekte",
      label: "Projektreferenzen",
      content: (
        <div>
          <ResumeEntryTable
            section="PROJECT"
            label={RESUME_SECTION_LABEL.PROJECT}
            hint="„Von“/„Bis“ ist DEIN Einsatz im Projekt; die Laufzeit des Projekts steht daneben. Anonyme Kunden erscheinen im Lebenslauf nur mit ihrer Branche."
            rows={projects}
            createAction={createResumeEntry}
            updateAction={updateResumeEntry}
            deleteAction={deleteResumeEntry}
            reorderAction={reorderResumeEntry}
            emptyText="Noch keine Projektreferenz erfasst. Ein Projekt mit Rolle, Zeitraum und Technologien sagt mehr als eine Aufgabenliste."
          />
          <ResumeEntryTable
            section="PROJECT"
            label="Ältere Projekte"
            hint="Projekte, von denen nur noch die Dauer bekannt ist. Sie stehen im Lebenslauf unter einer eigenen Überschrift. Trägst du bei einem davon einen Zeitraum wie „03/2018“ nach, rückt er von selbst nach oben zu den Projektreferenzen."
            rows={legacyProjects}
            createAction={createResumeEntry}
            updateAction={updateResumeEntry}
            deleteAction={deleteResumeEntry}
            reorderAction={reorderResumeEntry}
            ordering="manual"
            emptyText="Nichts hier — alle Projekte haben einen Zeitraum."
          />
        </div>
      ),
    },
    {
      id: "faehigkeiten",
      label: "Fähigkeiten",
      content: (
        <ResumeEntryTable
          section="SKILL"
          label={RESUME_SECTION_LABEL.SKILL}
          hint="Titel = Kategorie, Beschreibung = Liste der Fähigkeiten. Die Jahre rechnen sich aus „von“/„bis“, wenn beides lesbar ist (z. B. 03/2018 – heute)."
          rows={skills}
          createAction={createResumeEntry}
          updateAction={updateResumeEntry}
          deleteAction={deleteResumeEntry}
          reorderAction={reorderResumeEntry}
          emptyText="Noch keine Fähigkeiten erfasst. Wenige Kategorien mit klaren Inhalten lesen sich besser als eine lange Stichwortwolke."
        />
      ),
    },
    {
      id: "bild",
      label: "Profilbild",
      content: (
        <div style={{ marginTop: 18 }}>
          <form action={saveResumePortrait} className="card bracket" style={{ maxWidth: 620 }}>
            <p className="eyebrow" style={{ marginTop: 0 }}>Bewerbungsfoto</p>
            <p className="meta" style={{ marginTop: 0 }}>
              Ohne eigenes Bild nimmt der Lebenslauf das Porträt der Legende. Wählst du hier
              ein anderes, gilt es nur für den Lebenslauf — die Legende bleibt, wie sie ist.
            </p>
            <AssetPickerField
              name="portraitAssetId"
              initialAssetId={profile?.portraitAssetId ?? null}
              initialUrl={portraitUrl}
              aspectRatio="4 / 5"
              width={140}
              emptyHint="Kein eigenes Bild — der Lebenslauf nimmt das Porträt der Legende"
            />
            <button className="btn solid sm" type="submit" style={{ marginTop: 14 }}>Speichern</button>
          </form>

          <div className="card bracket" style={{ marginTop: 16, maxWidth: 620 }}>
            <p className="eyebrow" style={{ marginTop: 0 }}>Zum Vergleich: Porträt der Legende</p>
            {legend.portrait ? (
              <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={legend.portrait.url}
                  alt={legend.portrait.alt || "Porträt der Legende"}
                  style={{ width: 110, aspectRatio: "4 / 5", objectFit: "cover", borderRadius: 4 }}
                />
                <p className="meta" style={{ margin: 0 }}>
                  Dieses Bild erscheint im Lebenslauf, solange oben keins gewählt ist.
                </p>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                In der Legende ist kein Porträt hinterlegt. Ohne Bild hier bleibt der Kopf des
                Lebenslaufs ohne Foto.
              </p>
            )}
            <p style={{ marginTop: 12, marginBottom: 0 }}>
              <Link className="btn ghost sm" href="/admin/legende">Zur Legende</Link>
            </p>
          </div>
        </div>
      ),
    },
    {
      id: "publikationen",
      label: "Publikationen",
      content: (
        <ReadOnlySection
          intro="Bücher, Kurse und Artikel kommen aus dem Bereich „Publikationen“ und werden dort gepflegt. Hier stehen sie, damit du siehst, was im Lebenslauf landen kann. Videos bleiben draußen — ein Lebenslauf ist kein Kanal."
          href="/admin/publikationen"
          linkLabel="Publikationen pflegen"
          rows={publications.map((p) => ({
            id: p.id,
            when: String(p.year),
            title: p.title,
            meta: [publicationTypeLabel(p.type, "de"), p.publisher, p.role].filter(Boolean).join(" · "),
          }))}
          emptyText="Noch keine Publikationen erfasst."
        />
      ),
    },
    {
      id: "zertifizierungen",
      label: "Zertifizierungen",
      content: (
        <ReadOnlySection
          intro="Zertifizierungen und Schulungen kommen aus dem Bereich „Ausbildung & Auszeichnungen“. Geplante Zertifizierungen erscheinen nicht im Lebenslauf."
          href="/admin/ausbildung"
          linkLabel="Zertifizierungen pflegen"
          rows={[...records.certifications, ...records.trainings].map((c) => ({
            id: c.id,
            when: certYear(c),
            title: c.name,
            meta: [c.shortCode, c.status === "EXPIRED" ? "abgelaufen" : null].filter(Boolean).join(" · "),
          }))}
          emptyText="Noch keine Zertifizierungen erfasst."
        />
      ),
    },
    {
      id: "awards",
      label: "Awards",
      content: (
        <ReadOnlySection
          intro="MVP-Awards und andere Auszeichnungen kommen aus dem Bereich „Ausbildung & Auszeichnungen“. Gleichnamige Auszeichnungen fasst der Lebenslauf zu einer Zeile mit Jahresspanne zusammen."
          href="/admin/ausbildung"
          linkLabel="Auszeichnungen pflegen"
          rows={records.awards.map((c) => ({
            id: c.id,
            when: certYear(c),
            title: c.name,
            meta: c.series ?? "",
          }))}
          emptyText="Noch keine Auszeichnungen erfasst."
        />
      ),
    },
  ];

  return (
    <section>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <h1 style={{ marginBottom: 0 }}>Lebenslauf</h1>
        <div style={{ marginLeft: "auto", paddingTop: 6 }}>
          <ResumeExportDialog groups={exportGroups} />
        </div>
      </div>
      <Flash ok={ok} err={err} />
      <p className="muted" style={{ maxWidth: 760 }}>
        Der klassische Bewerbungs-Lebenslauf. Er liegt unter <code>/de/cv</code> bzw.{" "}
        <code>/en/cv</code>, wird aber von der Website nicht verlinkt: Du gibst die Adresse
        gezielt weiter. Über „Lebenslauf erzeugen“ suchst du aus, welche Einträge in einen
        bestimmten Auszug gehören — druckbar als A4.
      </p>

      {/* Der Schlüssel erzwingt ein Neuaufbauen, wenn eine Server-Action mit
          anderem `tab` zurückkommt — sonst zeigte die Maske nach dem Speichern
          wieder das erste Register. */}
      <Tabs key={activeTab} tabs={tabs} initialId={activeTab} />
    </section>
  );
}
