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
  // TODO(nicole): Phase 5.2 — „Zeitplan & Kanäle" NICHT entfernt (STOP). Anders
  // als im Plan angenommen enthält diese Seite (/admin/kanaele) Funktionen, die
  // es sonst nirgends gibt: LinkedIn-OAuth (Verbinden/Trennen), Kanal-Status und
  // Ablaufwarnung, Wiederholung fehlgeschlagener ChannelTasks. Das ist NICHT das
  // Gleiche wie die Social-Profil-URLs unter Einstellungen. Vorschlag: Menüpunkt
  // in „Kanäle" umbenennen und behalten, oder in die Einstellungen einbetten.
  // Nicole entscheidet, bevor gelöscht wird (siehe docs/PROGRESS.md).
  {
    href: "/admin/kanaele",
    label: "Zeitplan & Kanäle",
    icon: "⧗",
    section: "Ausspielung",
  },
  { href: "/admin/medien", label: "Medien", icon: "▣" },
  { href: "/admin/struktur", label: "Kategorien & Tags", icon: "⧉", section: "System" },
  { href: "/admin/mobil", label: "Mobil erfassen", icon: "▯" },
  { href: "/admin/einstellungen", label: "Einstellungen", icon: "⚙" },
];
