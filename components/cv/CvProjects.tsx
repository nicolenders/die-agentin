import type { Locale } from "@/lib/i18n/config";
import type { ResumeEntryData } from "@/lib/queries/resume";
import { displayClient, formatPeriod, formatPersonDays } from "@/lib/resume/projects";
import { CvRow, CvRowTitle, CvSection, CvTags } from "@/components/cv/CvSection";

// Projektreferenzen. In der Zeitspalte steht der eigene Einsatz; Laufzeit des
// Projekts und Aufwand stehen als Zusatzzeilen darunter. Anonyme Kunden
// erscheinen ausschließlich mit ihrer Branche — der Name taucht nirgends auf.

export default function CvProjects({
  title,
  items,
  locale,
  labels,
}: {
  title: string;
  items: ResumeEntryData[];
  locale: Locale;
  labels: { projectPeriod: string };
}) {
  if (items.length === 0) return null;
  return (
    <CvSection title={title}>
      {items.map((e) => {
        const projectPeriod = formatPeriod(e.projectFrom, e.projectTo);
        return (
          <CvRow
            key={e.id}
            when={formatPeriod(e.periodFrom, e.periodTo)}
            aside={[
              projectPeriod ? `${labels.projectPeriod}: ${projectPeriod}` : null,
              formatPersonDays(e.personDays, locale),
            ]}
          >
            <CvRowTitle title={e.title} org={displayClient(e, locale)} />
            {e.location ? <p className="cv-row-place">{e.location}</p> : null}
            {e.description ? <p className="cv-row-text">{e.description}</p> : null}
            <CvTags tags={e.tags} />
          </CvRow>
        );
      })}
    </CvSection>
  );
}
