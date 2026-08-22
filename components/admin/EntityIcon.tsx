// Ein kleines, eigenes Icon-Set für die Zentrale. Keine Icon-Bibliothek: es sind
// eine Handvoll Symbole, sie sollen zur Marke passen (dünne Linien, Zielmarke,
// Funk) und ohne Abhängigkeit auskommen.
//
// Alle Symbole zeichnen in `currentColor` auf einem 24er-Raster, damit sie sich
// wie Text färben und skalieren lassen. Wichtig ist, dass Einsatz, Briefing und
// Depesche auf einen Blick auseinanderzuhalten sind — deshalb bewusst
// unterschiedliche Grundformen: Zielkreuz, Rednerpult, Funkwellen.

export type EntityIconName =
  | "dashboard"
  | "mission"
  | "briefing"
  | "dispatch"
  | "radar"
  | "plan"
  | "home"
  | "legend"
  | "identity"
  | "publication"
  | "award"
  | "resume"
  | "media"
  | "stats"
  | "archive"
  | "structure"
  | "prompt"
  | "settings";

const PATHS: Record<EntityIconName, React.ReactNode> = {
  // Einsatzzentrale — Raute im Rahmen.
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="2" />
      <path d="M12 8.2 15.8 12 12 15.8 8.2 12Z" />
    </>
  ),
  // Einsatz — Zielkreuz (dasselbe Motiv wie die Kartenpins).
  mission: (
    <>
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none" />
      <path d="M12 2.5v3.2M12 18.3v3.2M2.5 12h3.2M18.3 12h3.2" />
    </>
  ),
  // Briefing — Rednerpult mit Mikrofon.
  briefing: (
    <>
      <path d="M6 20.5 8.4 9.5h7.2L18 20.5Z" />
      <path d="M12 9.5V6" />
      <circle cx="12" cy="4.2" r="1.7" />
      <path d="M8.9 14h6.2" />
    </>
  ),
  // Depesche — Funkwellen von einem Punkt aus (Nachricht, die rausgeht).
  dispatch: (
    <>
      <circle cx="6" cy="18" r="1.7" fill="currentColor" stroke="none" />
      <path d="M4.5 12.6a7.4 7.4 0 0 1 6.9 6.9" />
      <path d="M4.5 7.2a12.8 12.8 0 0 1 12.3 12.3" />
      <path d="M4.5 3v1.6" />
    </>
  ),
  // Aufklärung — Radarschirm mit Sweep.
  radar: (
    <>
      <circle cx="12" cy="12" r="8.2" />
      <circle cx="12" cy="12" r="4" />
      <path d="M12 12 17.8 6.2" />
      <circle cx="17.4" cy="7.2" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  // Terminkalender — Kalenderraster.
  plan: (
    <>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.6h17M8.4 3v4M15.6 3v4M9 13.5h6M9 17h4" />
    </>
  ),
  home: (
    <>
      <path d="M4 10.6 12 4l8 6.6" />
      <path d="M6.2 9.6v10.9h11.6V9.6" />
      <path d="M10.2 20.5v-5.4h3.6v5.4" />
    </>
  ),
  // Legende — Kartenlegende: Marke mit Beschriftungslinien.
  legend: (
    <>
      <circle cx="7" cy="8" r="2.6" />
      <path d="M13 8h7.5M13 12.6h7.5M3.5 17.2h17M3.5 20.4h11" />
    </>
  ),
  // Identität — Ausweis mit Porträt.
  identity: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2.2" />
      <circle cx="8.8" cy="11" r="2.2" />
      <path d="M5.6 16.4c.6-1.6 1.9-2.4 3.2-2.4s2.6.8 3.2 2.4" />
      <path d="M15 10h3.6M15 13.4h3.6" />
    </>
  ),
  // Publikation — aufgeschlagenes Buch.
  publication: (
    <>
      <path d="M12 6.6C10.4 5.3 8.3 4.7 5 4.7v13c3.3 0 5.4.6 7 1.9 1.6-1.3 3.7-1.9 7-1.9v-13c-3.3 0-5.4.6-7 1.9Z" />
      <path d="M12 6.6v13.2" />
    </>
  ),
  // Auszeichnung — Rosette.
  award: (
    <>
      <circle cx="12" cy="9.2" r="5.4" />
      <path d="m8.6 13.8-1.4 6.7 4.8-2.6 4.8 2.6-1.4-6.7" />
    </>
  ),
  // Lebenslauf — Dokument mit Zeilen.
  resume: (
    <>
      <path d="M6 3.5h7.6L18 8v12.5H6Z" />
      <path d="M13.4 3.6V8.2H18" />
      <path d="M9 12.4h6M9 15.6h6M9 18.2h3.6" />
    </>
  ),
  // Medien — Bild mit Horizont.
  media: (
    <>
      <rect x="3.5" y="5" width="17" height="14" rx="2" />
      <circle cx="8.6" cy="10" r="1.6" />
      <path d="m4.6 17.4 4.8-4.6 3.4 3.2 2.8-2.4 3.8 3.4" />
    </>
  ),
  // Auswertung — Balken.
  stats: (
    <>
      <path d="M3.6 20.4h16.8" />
      <path d="M7 20.4v-6.6M12 20.4V7.2M17 20.4v-9.4" />
    </>
  ),
  // Archiv — Kiste mit Deckel.
  archive: (
    <>
      <rect x="3.4" y="4.6" width="17.2" height="4.4" rx="1.2" />
      <path d="M5.2 9v10.4h13.6V9" />
      <path d="M10 13h4" />
    </>
  ),
  // Stammdaten — verbundene Knoten.
  structure: (
    <>
      <circle cx="6" cy="6.6" r="2.4" />
      <circle cx="18" cy="6.6" r="2.4" />
      <circle cx="12" cy="17.6" r="2.4" />
      <path d="M8.4 6.6h7.2M7.2 8.8l3.6 6.9M16.8 8.8l-3.6 6.9" />
    </>
  ),
  // Prompt — geschweifte Klammern um einen Platzhalter, die Schreibweise der
  // Vorlagen selbst.
  prompt: (
    <>
      <path d="M9.6 4.4C7.6 4.4 8.6 10 6.1 12c2.5 2 1.5 7.6 3.5 7.6" />
      <path d="M14.4 4.4c2 0 1 5.6 3.5 7.6-2.5 2-1.5 7.6-3.5 7.6" />
      <circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.1" />
      <path d="M12 2.8v2.6M12 18.6v2.6M4.5 12H2M22 12h-2.5M6.7 6.7 4.9 4.9M19.1 19.1l-1.8-1.8M17.3 6.7l1.8-1.8M4.9 19.1l1.8-1.8" />
    </>
  ),
};

export default function EntityIcon({
  name,
  size = 20,
  className,
}: {
  name: EntityIconName;
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[name]}
    </svg>
  );
}
