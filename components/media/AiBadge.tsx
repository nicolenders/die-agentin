// Transparenzhinweis für KI-generierte Bilder. Erscheint unten rechts im Bild.
// Server-kompatibel (kein "use client"). Der umgebende Container muss
// `position: relative` sein (z. B. `.asset-image` oder ein eigener Wrapper).
// `compact` zeigt nur „KI" für kleine Thumbnails, auf denen der volle Text nicht
// lesbar wäre — der volle Hinweis bleibt über aria-label/title erhalten.
export default function AiBadge({ compact = false }: { compact?: boolean }) {
  return (
    <span
      className={`ai-badge${compact ? " compact" : ""}`}
      aria-label="KI-generiertes Bild"
      title="KI-generiertes Bild"
    >
      {compact ? "KI" : "KI-generiert"}
    </span>
  );
}
