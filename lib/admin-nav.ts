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
// über Nicole selbst, zuletzt die Technik. „Kanäle" und „Stammdaten" sind keine
// eigenen Punkte mehr, sondern Register in den Einstellungen — dort wird ohnehin
// nur gelegentlich etwas nachgetragen.
export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Einsatzzentrale", icon: "dashboard" },

  // Neuigkeiten — was laufend gepflegt wird. Der Terminkalender steht vorn: er
  // ist der Einstieg in die Woche, nicht das Nachschlagewerk.
  { href: "/admin/terminkalender", label: "Terminkalender", icon: "plan", section: "Neuigkeiten" },
  { href: "/admin/einsaetze", label: "Einsätze", icon: "mission" },
  { href: "/admin/briefings", label: "Briefings", icon: "briefing" },
  { href: "/admin/depeschen", label: "Depeschen", icon: "dispatch" },
  { href: "/admin/aufklaerung", label: "Aufklärung (Radar)", icon: "radar" },
  { href: "/admin/prompts", label: "Prompts", icon: "prompt" },

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
  { href: "/admin/einstellungen", label: "Einstellungen", icon: "settings" },
];

export interface AdminNavGroup {
  /** Überschrift der Gruppe; fehlt bei der ersten (die Einsatzzentrale steht allein). */
  section?: string;
  items: AdminNavItem[];
}

/**
 * Fasst die flache Liste in ihre Gruppen. `section` markiert im Datenmodell den
 * ERSTEN Eintrag einer Gruppe; die Navigation braucht aber die Gruppe als
 * Ganzes, um sie als Liste mit Überschrift auszugeben.
 */
export function groupAdminNav(items: AdminNavItem[] = adminNav): AdminNavGroup[] {
  const groups: AdminNavGroup[] = [];
  for (const item of items) {
    if (item.section || groups.length === 0) {
      groups.push({ section: item.section, items: [item] });
    } else {
      groups[groups.length - 1]!.items.push(item);
    }
  }
  return groups;
}
