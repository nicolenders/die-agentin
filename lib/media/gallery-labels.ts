import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionarySync } from "@/lib/i18n";
import type { GalleryLabels } from "@/components/content/Gallery";

/**
 * Texte der Bildergalerie — Beschriftung, Blättern in der Großansicht und der
 * KI-Hinweis. Gleiches Muster wie `embedLabels` und `aiImageLabels`: die
 * Galerie läuft im Client und bekommt die fertigen Texte als Props, damit das
 * Wörterbuch nicht ins Bundle wandert und `/en` keine deutschen Knöpfe zeigt.
 *
 * `region` benennt die konkrete Galerie („Fotos vom Einsatz"); ohne Angabe
 * steht dort der allgemeine Name aus dem Wörterbuch.
 */
export function galleryLabels(locale: string, region?: string): GalleryLabels {
  const t = getDictionarySync(isLocale(locale) ? locale : defaultLocale).common;
  return {
    region: region ?? t.imageGallery,
    open: t.galleryOpen,
    prev: t.galleryPrev,
    next: t.galleryNext,
    close: t.galleryClose,
    position: t.galleryPosition,
    aiLabel: t.aiGenerated,
    aiTitle: t.aiGeneratedImage,
  };
}
