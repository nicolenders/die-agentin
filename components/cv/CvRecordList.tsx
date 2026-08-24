import type { Locale } from "@/lib/i18n/config";
import type { CertificationRecord } from "@/lib/queries/records";
import { formatRecordYears, groupRecords } from "@/lib/resume/records";
import { CvRow, CvSection } from "@/components/cv/CvSection";

// Zertifizierungen, Schulungen und Auszeichnungen im Lebenslauf: eine Zeile je
// Nachweis, Jahr links. Bewusst ohne Logos — die Kachelwand der Nachweisseite
// wäre in einem Bewerbungsdokument fehl am Platz.

function monthYear(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "en" ? "en-GB" : "de-DE", {
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(date);
}

export default function CvRecordList({
  title,
  items,
  locale,
  validUntilLabel,
}: {
  title: string;
  items: CertificationRecord[];
  locale: Locale;
  validUntilLabel: string;
}) {
  if (items.length === 0) return null;
  const groups = groupRecords(items);
  return (
    <CvSection title={title}>
      {groups.map((g) => (
        <CvRow key={g.id} when={formatRecordYears(g.years)}>
          <p className="cv-row-title">
            <strong>{g.name}</strong>
            {g.count > 1 ? <span className="cv-row-org"> ({g.count}×)</span> : null}
            {g.shortCode && g.shortCode !== g.name ? (
              <span className="cv-row-org"> · {g.shortCode}</span>
            ) : null}
          </p>
          {g.validUntil ? (
            <p className="cv-row-place">
              {validUntilLabel} {monthYear(g.validUntil, locale)}
            </p>
          ) : null}
        </CvRow>
      ))}
    </CvSection>
  );
}
