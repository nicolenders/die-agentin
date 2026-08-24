import type { Locale } from "@/lib/i18n/config";
import type { PublicationItem } from "@/lib/queries/records";
import { publicationTypeLabel } from "@/lib/records/publication-type";
import { CvRow, CvSection } from "@/components/cv/CvSection";

// Publikationen im Lebenslauf: Jahr, Titel, Art und Verlag — als Liste, nicht
// als Cover-Raster. Ein Lebenslauf zeigt Werke, keine Auslage.

export default function CvPublicationList({
  title,
  items,
  locale,
}: {
  title: string;
  items: PublicationItem[];
  locale: Locale;
}) {
  if (items.length === 0) return null;
  return (
    <CvSection title={title}>
      {items.map((p) => {
        const facts = [
          publicationTypeLabel(p.type, locale),
          p.publisher,
          p.role,
          p.isbn ? `ISBN ${p.isbn}` : null,
        ].filter(Boolean);
        return (
          <CvRow key={p.id} when={String(p.year)}>
            <p className="cv-row-title">
              <strong>{p.title}</strong>
            </p>
            {facts.length > 0 ? <p className="cv-row-place">{facts.join(" · ")}</p> : null}
          </CvRow>
        );
      })}
    </CvSection>
  );
}
