"use client";

import ConfirmButton from "@/components/admin/ConfirmButton";
import PptxUploadSlot from "@/components/admin/PptxUploadSlot";
import { uploadSlideTemplate } from "@/lib/admin/upload-template";
import { slideTemplateUrl, type SlideTemplateSet } from "@/lib/slide-templates";
import type { Locale } from "@/lib/i18n/config";

// Foliensvorlagen: je eine PowerPoint-Datei auf Deutsch und auf Englisch — der
// leere Rahmen im Corporate Design. Die fertigen Folien eines Vortrags liegen
// nicht hier, sondern am Briefing; dort wird die Vorlage zum Download angeboten.

const LABEL: Record<Locale, string> = { de: "Deutsch", en: "Englisch" };

export default function SlideTemplateManager({
  templates,
  onRemove,
}: {
  templates: SlideTemplateSet;
  /** Server Action: entfernt die Vorlage einer Sprache (Rollenprüfung dort). */
  onRemove: (formData: FormData) => void;
}) {
  return (
    <div className="form-2col">
      {(["de", "en"] as Locale[]).map((locale) => {
        const template = templates[locale];
        return (
          <PptxUploadSlot
            key={locale}
            title={`Vorlage ${LABEL[locale]}`}
            file={
              template
                ? { fileName: template.fileName, bytes: template.bytes, url: slideTemplateUrl(template) }
                : null
            }
            description="Hinterlegt und im Briefing zum Download verlinkt."
            emptyHint={`Noch keine Vorlage. Ohne sie weist das Briefing für ${LABEL[locale]} darauf hin.`}
            upload={(file, onProgress) => uploadSlideTemplate(file, locale, onProgress)}
            removeAction={
              <form action={onRemove} style={{ display: "inline" }}>
                <input type="hidden" name="locale" value={locale} />
                <ConfirmButton
                  confirmText={`Vorlage (${LABEL[locale]}) entfernen? Im Briefing steht dann keine ${LABEL[locale]}-Vorlage mehr bereit.`}
                >
                  Entfernen
                </ConfirmButton>
              </form>
            }
          />
        );
      })}
    </div>
  );
}
