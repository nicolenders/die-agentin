// Navigation der Redaktionsoberfläche (aus dem Admin-Mockup). `icon` ist ein
// dekoratives Mono-Zeichen, `href` die Route, `label` die deutsche Bezeichnung
// (Admin ist deutschsprachig).

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  section?: string;
}

// Vier Gruppen: die Einsatzzentrale (Dashboard), alles Redaktionelle unter
// „Inhalte", die überblickenden Werkzeuge unter „Planung & Reichweite" und die
// technischen Grundlagen unter „System".
export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Einsatzzentrale", icon: "◈" },

  // Inhalte — alles, was redaktionell gepflegt und veröffentlicht wird.
  { href: "/admin/startseite", label: "Startseite", icon: "⌂", section: "Inhalte" },
  { href: "/admin/identitaeten", label: "Identitäten", icon: "⬡" },
  { href: "/admin/einsaetze", label: "Einsätze", icon: "◎" },
  { href: "/admin/briefings", label: "Briefings", icon: "▶" },
  { href: "/admin/depeschen", label: "Depeschen", icon: "≡" },
  { href: "/admin/publikationen", label: "Publikationen", icon: "★" },
  { href: "/admin/ausbildung", label: "Ausbildung & Auszeichnungen", icon: "✦" },
  { href: "/admin/lebenslauf", label: "Lebenslauf", icon: "⊞" },
  { href: "/admin/aufklaerung", label: "Aufklärung (Radar)", icon: "⌖" },
  { href: "/admin/legende", label: "Legende (Über mich)", icon: "◆" },

  // Planung & Reichweite — Überblick über Geplantes, Reichweite und Archiv.
  { href: "/admin/redaktionsplan", label: "Redaktionsplan", icon: "▦", section: "Planung & Reichweite" },
  { href: "/admin/statistik", label: "Auswertung", icon: "▤" },
  { href: "/admin/archiv", label: "Archiv", icon: "⊟" },

  // System — technische Grundlagen. „Kanäle" bündelt die Social-Media-Verbindungen
  // und den LinkedIn-OAuth-Rücksprung.
  { href: "/admin/kanaele", label: "Kanäle", icon: "⤳", section: "System" },
  { href: "/admin/medien", label: "Medien", icon: "▣" },
  { href: "/admin/struktur", label: "Stammdaten", icon: "⧉" },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: "⚙" },
];
