import { defaultLocale, isLocale } from "@/lib/i18n/config";
import { getDictionarySync } from "@/lib/i18n";

/**
 * Hinweistexte für KI-generierte Bilder (Audit 6.9). Der Hinweis stand fest auf
 * Deutsch und erschien so auch auf `/en`, direkt neben Karten, die „(AI-
 * generated)" zeigten. `AssetImage` läuft im Client und nimmt die Texte als
 * Props entgegen; dieser Helfer baut sie serverseitig.
 */
export function aiImageLabels(locale: string): {
  aiGenerated: string;
  /** Kurzform („KI"/„AI") für Vorschaubilder, auf denen der volle Text nicht lesbar ist. */
  aiGeneratedShort: string;
  aiGeneratedImage: string;
} {
  const t = getDictionarySync(isLocale(locale) ? locale : defaultLocale).common;
  return {
    aiGenerated: t.aiGenerated,
    aiGeneratedShort: t.aiGeneratedShort,
    aiGeneratedImage: t.aiGeneratedImage,
  };
}
