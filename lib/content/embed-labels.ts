import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionarySync } from "@/lib/i18n";

export interface EmbedLabels {
  videoExternal: string;
  videoConsentNotice: string;
  videoLoad: string;
  videoAlternative: string;
  videoWatchOnYoutube: string;
  videoFallbackTitle: string;
  imageGallery: string;
}

/**
 * Texte der eingebetteten Inhalte — Zwei-Klick-Einwilligung für YouTube und die
 * Beschriftung der Bildergalerie.
 *
 * Beide standen fest auf Deutsch im Bauteil und erschienen so auch auf `/en`.
 * Bei einem Einwilligungstext ist das mehr als ein Schönheitsfehler: wer ihn
 * nicht liest, weil er ihn nicht lesen kann, willigt nicht wirksam ein.
 * Gleiches Muster wie `aiImageLabels` — die Client-Komponente bekommt die
 * fertigen Texte als Props.
 */
export function embedLabels(locale: string): EmbedLabels {
  const t = getDictionarySync(isLocale(locale) ? locale : defaultLocale).common;
  return {
    videoExternal: t.videoExternal,
    videoConsentNotice: t.videoConsentNotice,
    videoLoad: t.videoLoad,
    videoAlternative: t.videoAlternative,
    videoWatchOnYoutube: t.videoWatchOnYoutube,
    videoFallbackTitle: t.videoFallbackTitle,
    imageGallery: t.imageGallery,
  };
}
