// Navigation der Redaktionsoberfläche. `icon` benennt ein Symbol aus
// `components/admin/EntityIcon`, `href` die Route, `label` die deutsche
// Bezeichnung (Admin ist deutschsprachig).

import type { EntityIconName } from "@/components/admin/EntityIcon";

export interface AdminNavItem {
  href: string;
  label: string;
  icon: EntityIconName;
  section?: string;
}

// Vier Gruppen, sortiert nach Pflegehäufigkeit: das laufende Geschäft unter
// „Neuigkeiten" ganz oben, die selten geänderten Seiten darunter, dann alles
// über Nicole selbst, zuletzt die Technik. „Kanäle" ist kein eigener Punkt mehr,
// sondern ein Register in den Einstellungen — dort wird ohnehin nur gelegentlich
// etwas nachgetragen.
export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Einsatzzentrale", icon: "dashboard" },

  // Neuigkeiten — was laufend gepflegt wird. Der Redaktionsplan steht vorn: er
  // ist der Einstieg in die Woche, nicht das Nachschlagewerk.
  { href: "/admin/redaktionsplan", label: "Redaktionsplan", icon: "plan", section: "Neuigkeiten" },
  { href: "/admin/einsaetze", label: "Einsätze", icon: "mission" },
  { href: "/admin/briefings", label: "Briefings", icon: "briefing" },
  { href: "/admin/depeschen", label: "Depeschen", icon: "dispatch" },
  { href: "/admin/aufklaerung", label: "Aufklärung (Radar)", icon: "radar" },

  // Statische Seiten — Inhalte, die selten wechseln.
  { href: "/admin/startseite", label: "Startseite", icon: "home", section: "Statische Seiten" },
  { href: "/admin/legende", label: "Legende (Über mich)", icon: "legend" },

  // Über mich — Werdegang, Werke, Auszeichnungen, Rollen.
  { href: "/admin/identitaeten", label: "Identitäten", icon: "identity", section: "Über mich" },
  { href: "/admin/publikationen", label: "Publikationen", icon: "publication" },
  { href: "/admin/ausbildung", label: "Ausbildung & Auszeichnungen", icon: "award" },
  { href: "/admin/lebenslauf", label: "Lebenslauf", icon: "resume" },

  // System — Auswertung zuerst (der häufigste Blick), dann die Grundlagen.
  { href: "/admin/statistik", label: "Auswertung", icon: "stats", section: "System" },
  { href: "/admin/medien", label: "Medien", icon: "media" },
  { href: "/admin/archiv", label: "Archiv", icon: "archive" },
  { href: "/admin/struktur", label: "Stammdaten", icon: "structure" },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: "settings" },
];
