// Navigation der Redaktionsoberfläche (aus dem Admin-Mockup). `icon` ist ein
// dekoratives Mono-Zeichen, `href` die Route, `label` die deutsche Bezeichnung
// (Admin ist deutschsprachig).

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  section?: string;
}

// Vier Gruppen, sortiert nach Pflegehäufigkeit: das laufende Geschäft unter
// „Neuigkeiten" ganz oben, die selten geänderten Seiten darunter, dann alles
// über Nicole selbst, zuletzt die Technik. „Kanäle" ist kein eigener Punkt mehr,
// sondern ein Register in den Einstellungen — dort wird ohnehin nur gelegentlich
// etwas nachgetragen.
export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Einsatzzentrale", icon: "◈" },

  // Neuigkeiten — was laufend gepflegt wird. Der Redaktionsplan steht vorn: er
  // ist der Einstieg in die Woche, nicht das Nachschlagewerk.
  { href: "/admin/redaktionsplan", label: "Redaktionsplan", icon: "▦", section: "Neuigkeiten" },
  { href: "/admin/einsaetze", label: "Einsätze", icon: "◎" },
  { href: "/admin/briefings", label: "Briefings", icon: "▶" },
  { href: "/admin/depeschen", label: "Depeschen", icon: "≡" },
  { href: "/admin/aufklaerung", label: "Aufklärung (Radar)", icon: "⌖" },

  // Statische Seiten — Inhalte, die selten wechseln.
  { href: "/admin/startseite", label: "Startseite", icon: "⌂", section: "Statische Seiten" },
  { href: "/admin/legende", label: "Legende (Über mich)", icon: "◆" },

  // Über mich — Werdegang, Werke, Auszeichnungen, Rollen.
  { href: "/admin/identitaeten", label: "Identitäten", icon: "⬡", section: "Über mich" },
  { href: "/admin/publikationen", label: "Publikationen", icon: "★" },
  { href: "/admin/ausbildung", label: "Ausbildung & Auszeichnungen", icon: "✦" },
  { href: "/admin/lebenslauf", label: "Lebenslauf", icon: "⊞" },

  // System — technische Grundlagen und Auswertungen.
  { href: "/admin/medien", label: "Medien", icon: "▣", section: "System" },
  { href: "/admin/statistik", label: "Auswertung", icon: "▤" },
  { href: "/admin/archiv", label: "Archiv", icon: "⊟" },
  { href: "/admin/struktur", label: "Stammdaten", icon: "⧉" },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: "⚙" },
];
