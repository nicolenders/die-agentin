import type { Locale } from "@/lib/i18n/config";
import type { ResumeEntryData } from "@/lib/queries/resume";
import { effectiveSkillYears, skillLevelLabel } from "@/lib/resume/skills";
import { CvRow, CvSection } from "@/components/cv/CvSection";

// Fähigkeiten in derselben zweispaltigen Form wie der Werdegang: links Jahre
// und Selbsteinschätzung, rechts die Kategorie und was dazugehört. So bleibt
// der Blick des Lesers auf einer Kante, statt zwischen zwei Rastern zu wechseln.

function yearsLabel(years: number, locale: Locale): string {
  if (locale === "en") return `${years} ${years === 1 ? "year" : "years"}`;
  return `${years} ${years === 1 ? "Jahr" : "Jahre"}`;
}

export default function CvSkills({
  title,
  items,
  locale,
}: {
  title: string;
  items: ResumeEntryData[];
  locale: Locale;
}) {
  if (items.length === 0) return null;
  return (
    <CvSection title={title}>
      {items.map((e) => {
        const years = effectiveSkillYears(e);
        return (
          <CvRow
            key={e.id}
            when={years != null && years > 0 ? yearsLabel(years, locale) : null}
            aside={[skillLevelLabel(e.skillLevel, locale)]}
          >
            <p className="cv-row-title">
              <strong>{e.title}</strong>
            </p>
            {e.description ? <p className="cv-row-text">{e.description}</p> : null}
            {e.tags.length > 0 ? <p className="cv-row-tags">{e.tags.join(" · ")}</p> : null}
          </CvRow>
        );
      })}
    </CvSection>
  );
}
