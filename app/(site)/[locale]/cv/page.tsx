import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { alternatesFor } from "@/lib/seo/alternates";
import { getCertifications, getPublications } from "@/lib/queries/records";
import { getLegend } from "@/lib/queries/legend";
import { getContactInfo, getSocialLinks } from "@/lib/queries/settings";
import { getResume } from "@/lib/queries/resume";
import { filterSelected, selectionFromParams, SELECT_EXCEPT_PARAM, SELECT_ONLY_PARAM } from "@/lib/resume/selection";
import { publicationsForCv, splitRecordsForCv } from "@/lib/resume/records";
import CvHead, { type CvContactLine } from "@/components/cv/CvHead";
import CvTimeline from "@/components/cv/CvTimeline";
import CvProjects from "@/components/cv/CvProjects";
import CvSkills from "@/components/cv/CvSkills";
import CvRecordList from "@/components/cv/CvRecordList";
import CvPublicationList from "@/components/cv/CvPublicationList";
import CvPrintFlow from "@/components/cv/CvPrintFlow";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";


export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  // Nicht indexieren: der Lebenslauf ist ein Auszug zum Drucken, keine SEO-Seite.
  // Eine eigene Description braucht er trotzdem — sie erscheint beim Teilen des
  // Links (Audit 1.2).
  return {
    title: dict.cv.documentTitle,
    description: dict.meta.cv,
    alternates: alternatesFor(locale, "cv"),
    robots: { index: false, follow: true },
  };
}

/**
 * Der Bewerbungs-Lebenslauf. Ein Dokument, kein Website-Kapitel: weißes
 * A4-Blatt, Foto oben rechts, links die Zeitspalte, darunter Werdegang,
 * Ausbildung, Fähigkeiten, Projekte und Nachweise. Was auf dem Bildschirm zu
 * sehen ist, kommt so auch aus dem Drucker (Drucken → Als PDF speichern).
 *
 * Welche Einträge darin stehen, entscheidet der Auswahldialog im
 * Adminbereich; er hängt die Auswahl als Query-Parameter an die Adresse
 * (`nur=` / `aus=`, siehe lib/resume/selection.ts). Ohne Parameter steht alles
 * darin, was gepflegt ist.
 */
export default async function CvPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ [SELECT_ONLY_PARAM]?: string; [SELECT_EXCEPT_PARAM]?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const labels = dict.cv;
  const selection = selectionFromParams(await searchParams);

  const [certsAll, pubsAll, legend, contact, social, resume] = await Promise.all([
    getCertifications(locale),
    getPublications(locale),
    getLegend(locale),
    getContactInfo(),
    getSocialLinks(),
    getResume(locale),
  ]);

  const career = filterSelected(selection, resume.career);
  const education = filterSelected(selection, resume.education);
  const skills = filterSelected(selection, resume.skills);
  const projects = filterSelected(selection, resume.projects);
  const legacyProjects = filterSelected(selection, resume.legacyProjects);
  const records = splitRecordsForCv(certsAll);
  const certifications = filterSelected(selection, records.certifications);
  const trainings = filterSelected(selection, records.trainings);
  const awards = filterSelected(selection, records.awards);
  const publications = filterSelected(selection, publicationsForCv(pubsAll));

  const isEmpty =
    career.length === 0 &&
    education.length === 0 &&
    skills.length === 0 &&
    projects.length === 0 &&
    legacyProjects.length === 0 &&
    certifications.length === 0 &&
    trainings.length === 0 &&
    awards.length === 0 &&
    publications.length === 0;

  // Das Bewerbungsfoto: eigenes Bild, sonst das Porträt der Legende.
  const portrait = resume.profile?.portrait ?? legend.portrait;
  const photo = portrait ? { url: portrait.url, alt: portrait.alt || labels.photoAlt } : null;

  const contactLines: CvContactLine[] = [
    resume.profile?.location ? { label: resume.profile.location } : null,
    contact.email ? { label: contact.email, href: `mailto:${contact.email}` } : null,
    social.linkedin ? { label: "LinkedIn", href: social.linkedin } : null,
    legend.employer
      ? { label: legend.employer.name, href: legend.employer.url || undefined }
      : null,
  ].filter((x): x is CvContactLine => x !== null);

  return (
    <div className="cv-page">
      <div className="cv-toolbar no-print">
        <PrintButton label={labels.print} />
      </div>

      <article className="cv-sheet" lang={locale}>
        {/* Sorgt beim Drucken auf jeder Seite für Rand oben und unten. */}
        <CvPrintFlow>
        <CvHead
          name={legend.name}
          headline={resume.profile?.headline || null}
          photo={photo}
          contact={contactLines}
        />

        {resume.profile?.summary ? (
          <section className="cv-section">
            <h2 className="cv-h2">{labels.summary}</h2>
            <p className="cv-summary">{resume.profile.summary}</p>
          </section>
        ) : null}

        <CvTimeline title={labels.career} items={career} />
        <CvTimeline title={labels.education} items={education} />
        <CvSkills title={labels.skills} items={skills} locale={locale} />
        <CvProjects
          title={labels.projects}
          items={projects}
          locale={locale}
          labels={{ projectPeriod: labels.projectPeriod }}
        />
        {/* Frühere Projekte, von denen nur die Dauer überliefert ist. Sie
            stehen in einer eigenen Rubrik, damit die Zeitspalte der
            Projektreferenzen nicht zwischen Datum und Dauer wechselt. */}
        <CvProjects
          title={labels.projectsLegacy}
          items={legacyProjects}
          locale={locale}
          labels={{ projectPeriod: labels.projectPeriod }}
        />
        <CvRecordList
          title={labels.certifications}
          items={certifications}
          locale={locale}
          validUntilLabel={labels.validUntil}
        />
        <CvRecordList
          title={labels.trainings}
          items={trainings}
          locale={locale}
          validUntilLabel={labels.validUntil}
        />
        <CvRecordList
          title={labels.awards}
          items={awards}
          locale={locale}
          validUntilLabel={labels.validUntil}
        />
        <CvPublicationList title={labels.publications} items={publications} locale={locale} />

        {isEmpty ? (
          <section className="cv-section">
            <p className="cv-row-text">{labels.empty}</p>
            <p className="cv-row-place">{labels.emptyHint}</p>
          </section>
        ) : null}
        </CvPrintFlow>
      </article>
    </div>
  );
}
