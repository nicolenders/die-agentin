import { defaultLocale, type Locale } from "@/lib/i18n/config";
import { getDictionarySync } from "@/lib/i18n";

// Transparenzhinweis für KI-generierte Bilder. Erscheint unten rechts im Bild.
// Server-kompatibel (kein "use client"). Der umgebende Container muss
// `position: relative` sein (z. B. `.asset-image` oder ein eigener Wrapper).
// `compact` zeigt nur „KI" für kleine Thumbnails, auf denen der volle Text nicht
// lesbar wäre — der volle Hinweis bleibt über aria-label/title erhalten.
export default function AiBadge({
  compact = false,
  locale = defaultLocale,
}: {
  compact?: boolean;
  // Sprache des Hinweises (Audit 6.9) — stand bisher fest auf Deutsch.
  locale?: Locale;
}) {
  const t = getDictionarySync(locale).common;
  return (
    <span
      className={`ai-badge${compact ? " compact" : ""}`}
      aria-label={t.aiGeneratedImage}
      title={t.aiGeneratedImage}
    >
      {compact ? t.aiGeneratedShort : t.aiGenerated}
    </span>
  );
}
