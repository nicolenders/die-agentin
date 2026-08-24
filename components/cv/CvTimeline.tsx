import type { ResumeEntryData } from "@/lib/queries/resume";
import { formatPeriod } from "@/lib/resume/projects";
import { CvRow, CvRowTitle, CvSection, CvTags } from "@/components/cv/CvSection";

// Werdegang und Ausbildung: die klassische tabellarische Form. Links der
// Zeitraum, rechts Position, Arbeitgeber, Ort und eine kurze Beschreibung.

export default function CvTimeline({
  title,
  items,
}: {
  title: string;
  items: ResumeEntryData[];
}) {
  if (items.length === 0) return null;
  return (
    <CvSection title={title}>
      {items.map((e) => (
        <CvRow key={e.id} when={formatPeriod(e.periodFrom, e.periodTo)}>
          <CvRowTitle title={e.title} org={e.subtitle} />
          {e.location ? <p className="cv-row-place">{e.location}</p> : null}
          {e.description ? <p className="cv-row-text">{e.description}</p> : null}
          <CvTags tags={e.tags} />
        </CvRow>
      ))}
    </CvSection>
  );
}
