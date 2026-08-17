"use client";

import ConfirmButton from "@/components/admin/ConfirmButton";
import PptxUploadSlot from "@/components/admin/PptxUploadSlot";
import { uploadTalkSlides } from "@/lib/admin/upload-template";
import { formatMb, slideTemplateUrl, type SlideTemplateSet } from "@/lib/slide-templates";
import { assetUrl } from "@/lib/media/url";
import type { Locale } from "@/lib/i18n/config";

// Der Foliensatz eines Briefings, je Sprache eine Datei — und daneben die
// Vorlage, mit der er entsteht. Beides gehört an dieselbe Stelle: Vorlage
// herunterladen, Folien bauen, Folien hier hinterlegen. Beim Einsatz wird
// daraus der Download in der dort gewählten Vortragssprache.

const LABEL: Record<Locale, string> = { de: "Deutsch", en: "Englisch" };

export interface TalkDeck {
  locale: string;
  fileName: string;
  bytes: number;
  blobPath: string;
}

/** Download-URL eines Foliensatzes (mit sprechendem Dateinamen). */
export function deckUrl(deck: { blobPath: string; fileName: string }): string {
  return `${assetUrl(deck.blobPath)}?dl=${encodeURIComponent(deck.fileName)}`;
}

export default function TalkSlidesManager({
  talkId,
  decks,
  templates,
  onRemove,
}: {
  /** Leer, solange das Briefing noch nicht angelegt ist. */
  talkId: string | null;
  decks: TalkDeck[];
  templates: SlideTemplateSet;
  /** Server Action: entfernt den Foliensatz einer Sprache. */
  onRemove: (formData: FormData) => void;
}) {
  return (
    <>
      <div className="form-2col">
        {(["de", "en"] as Locale[]).map((locale) => {
          const deck = decks.find((d) => d.locale === locale) ?? null;
          const template = templates[locale];
          return (
            <PptxUploadSlot
              key={locale}
              title={`Foliensatz ${LABEL[locale]}`}
              file={deck ? { fileName: deck.fileName, bytes: deck.bytes, url: deckUrl(deck) } : null}
              description={`Wird bei jedem Einsatz mit Vortragssprache ${LABEL[locale]} zum Download angeboten.`}
              emptyHint={
                template ? (
                  <>
                    Noch keine Folien auf {LABEL[locale]}. Mit der Vorlage anfangen:{" "}
                    <a href={slideTemplateUrl(template)} download={template.fileName}>
                      ⬇ {template.fileName}
                    </a>{" "}
                    <span className="meta">({formatMb(template.bytes)})</span>
                  </>
                ) : (
                  <>
                    Noch keine Folien auf {LABEL[locale]}. Eine Vorlage ist ebenfalls nicht
                    hinterlegt — unter{" "}
                    <a href="/admin/medien?tab=vorlagen" target="_blank" rel="noopener noreferrer">
                      Medien → Vorlagen
                    </a>{" "}
                    lässt sich eine ablegen.
                  </>
                )
              }
              upload={(file, onProgress) => uploadTalkSlides(file, talkId ?? "", locale, onProgress)}
              disabled={!talkId}
              disabledHint="Erst das Briefing anlegen — danach lassen sich hier Folien hinterlegen."
              removeAction={
                <form action={onRemove} style={{ display: "inline" }}>
                  <input type="hidden" name="talkId" value={talkId ?? ""} />
                  <input type="hidden" name="locale" value={locale} />
                  <ConfirmButton
                    confirmText={`Foliensatz (${LABEL[locale]}) entfernen? Bei Einsätzen mit dieser Vortragssprache steht dann kein Download mehr bereit.`}
                  >
                    Entfernen
                  </ConfirmButton>
                </form>
              }
            />
          );
        })}
      </div>
      {templates.de || templates.en ? (
        <p className="meta" style={{ marginTop: 10 }}>
          Vorlagen zum Anfangen:{" "}
          {(["de", "en"] as Locale[]).map((locale, index) => {
            const template = templates[locale];
            if (!template) return null;
            return (
              <span key={locale}>
                {index > 0 && templates.de ? " · " : ""}
                <a href={slideTemplateUrl(template)} download={template.fileName}>
                  {LABEL[locale]} ({formatMb(template.bytes)})
                </a>
              </span>
            );
          })}
          {" · "}
          <a href="/admin/medien?tab=vorlagen" target="_blank" rel="noopener noreferrer">
            Vorlagen verwalten
          </a>
        </p>
      ) : null}
    </>
  );
}
