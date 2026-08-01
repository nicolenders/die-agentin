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
  { href: "/admin/beitraege", label: "Alle Beiträge", icon: "≡", section: "Inhalte" },
  { href: "/admin/editor", label: "Editor", icon: "✎" },
  { href: "/admin/dossiers", label: "Dossiers", icon: "▤" },
  { href: "/admin/einsaetze", label: "Einsätze", icon: "◎", section: "Struktur" },
  { href: "/admin/briefings", label: "Briefings", icon: "▶" },
  {
    href: "/admin/publikationen",
    label: "Publikationen & Ausbildung",
    icon: "★",
  },
  {
    href: "/admin/kanaele",
    label: "Zeitplan & Kanäle",
    icon: "⧗",
    section: "Ausspielung",
  },
  { href: "/admin/medien", label: "Medien", icon: "▣" },
  { href: "/admin/mobil", label: "Mobil erfassen", icon: "▯", section: "System" },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: "⚙" },
];
