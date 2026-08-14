// Navigation der Redaktionsoberfläche (aus dem Admin-Mockup). `icon` ist ein
// dekoratives Mono-Zeichen, `href` die Route, `label` die deutsche Bezeichnung
// (Admin ist deutschsprachig).

export interface AdminNavItem {
  href: string;
  label: string;
  icon: string;
  section?: string;
}

export const adminNav: AdminNavItem[] = [
  { href: "/admin", label: "Einsatzzentrale", icon: "◈" },
  { href: "/admin/startseite", label: "Startseite", icon: "⌂", section: "Inhalte" },
  { href: "/admin/depeschen", label: "Depeschen", icon: "≡" },
  { href: "/admin/redaktionsplan", label: "Redaktionsplan", icon: "▦" },
  { href: "/admin/archiv", label: "Archiv", icon: "⊟" },
  { href: "/admin/legende", label: "Legende (Über mich)", icon: "◆" },
  { href: "/admin/identitaeten", label: "Identitäten", icon: "⬡", section: "Struktur" },
  { href: "/admin/einsaetze", label: "Einsätze", icon: "◎" },
  { href: "/admin/briefings", label: "Briefings", icon: "▶" },
  { href: "/admin/publikationen", label: "Publikationen", icon: "★" },
  { href: "/admin/ausbildung", label: "Ausbildung & Auszeichnungen", icon: "✦" },
  { href: "/admin/aufklaerung", label: "Aufklärung (Radar)", icon: "⌖" },
  // „Stammdaten" (früher „Kategorien & Tags"), „Medien" und „Einstellungen" bilden
  // den System-Bereich. Der frühere Bereich „Ausspielung" (Zeitplan & Kanäle) ist
  // entfernt; die Seite /admin/kanaele existiert nur noch verdeckt für den
  // LinkedIn-OAuth-Rücksprung und die manuelle Teilen-Karte (siehe PR-Hinweis).
  { href: "/admin/struktur", label: "Stammdaten", icon: "⧉", section: "System" },
  { href: "/admin/medien", label: "Medien", icon: "▣" },
  { href: "/admin/kanaele", label: "Kanäle", icon: "⤳" },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: "⚙" },
];
