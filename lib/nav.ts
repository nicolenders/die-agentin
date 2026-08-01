import type { Dictionary } from "./i18n";

// Zentrale Definition der Hauptnavigation. `segment` ist der Pfadteil hinter
// dem Locale-Präfix (leer = HQ / Startseite). `labelKey` verweist auf einen
// Schlüssel in dictionary.nav.
export interface NavItem {
  segment: string;
  labelKey: keyof Dictionary["nav"];
}

export const mainNav: NavItem[] = [
  { segment: "", labelKey: "hq" },
  { segment: "signale", labelKey: "signale" },
  { segment: "dossiers", labelKey: "dossiers" },
  { segment: "einsaetze", labelKey: "einsaetze" },
  { segment: "briefings", labelKey: "briefings" },
  { segment: "publikationen", labelKey: "publikationen" },
  { segment: "ausbildung", labelKey: "ausbildung" },
  { segment: "legende", labelKey: "legende" },
];
