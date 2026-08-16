import Link from "next/link";
import type { Locale } from "@/lib/i18n/config";

export interface RadarChip {
  id: string;
  title: string;
  note: string | null;
  color?: string | null;
  dispatchCount: number;
}

// Themen auf dem Radar als Chips. Gibt es zu einem Thema veröffentlichte
// Depeschen, führt der Chip auf die darauf gefilterte Depeschenliste; sonst
// bleibt er ein reines Etikett — ein Link ins Leere wäre ein Versprechen, das
// die Seite nicht hält.
export default function RadarTopics({
  topics,
  locale,
  className,
}: {
  topics: RadarChip[];
  locale: Locale;
  className?: string;
}) {
  if (topics.length === 0) return null;
  const isDe = locale === "de";

  return (
    <div className={`radar-chips${className ? ` ${className}` : ""}`}>
      {topics.map((t) => {
        const style = t.color ? { color: t.color, borderColor: t.color } : undefined;
        if (t.dispatchCount === 0) {
          return (
            <span key={t.id} className="radar-chip" title={t.note ?? undefined} style={style}>
              {t.title}
            </span>
          );
        }
        const label = isDe
          ? `${t.dispatchCount} ${t.dispatchCount === 1 ? "Depesche" : "Depeschen"} zu „${t.title}“`
          : `${t.dispatchCount} ${t.dispatchCount === 1 ? "dispatch" : "dispatches"} on “${t.title}”`;
        return (
          <Link
            key={t.id}
            className="radar-chip on"
            href={`/${locale}/depeschen?thema=${t.id}`}
            title={t.note ? `${t.note} · ${label}` : label}
            aria-label={label}
            style={style}
          >
            {t.title}
            <span className="radar-count" aria-hidden>{t.dispatchCount}</span>
          </Link>
        );
      })}
    </div>
  );
}
