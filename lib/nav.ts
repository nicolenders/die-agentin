import type { Dictionary } from "./i18n";

// Zentrale Definition der Hauptnavigation. `segment` ist der Pfadteil hinter
// dem Locale-Präfix (leer = HQ / Startseite). `label` zieht den sichtbaren Text
// aus dem Dictionary — für Depeschen aus `dispatch.namePlural` (die EINZIGE
// Quelle des sichtbaren Namens, Phase 3.1).
//
// Phase 3.3: von acht auf fünf Punkte. Einsätze stehen im Fokus. Publikationen
// und Ausbildung wandern in Footer/Legende; Briefings in den Einsätze-Bereich.
export interface NavItem {
  segment: string;
  label: (dict: Dictionary) => string;
}

export const mainNav: NavItem[] = [
  { segment: "", label: (d) => d.nav.hq },
  { segment: "einsaetze", label: (d) => d.nav.einsaetze },
  { segment: "identitaeten", label: (d) => d.nav.identitaeten },
  { segment: "depeschen", label: (d) => d.dispatch.namePlural },
  { segment: "legende", label: (d) => d.nav.legende },
];
