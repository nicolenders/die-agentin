// Rubriken des Lebenslaufs und ihre Register im Adminbereich.
//
// Werdegang und Ausbildung teilen sich ein Register: Beim Pflegen gehören sie
// zusammen („wo war ich, was habe ich gelernt"), im Dokument bleiben es zwei
// Abschnitte.

export const RESUME_SECTIONS = ["CAREER", "EDUCATION", "PROJECT", "SKILL"] as const;
export type ResumeSection = (typeof RESUME_SECTIONS)[number];

export const RESUME_SECTION_LABEL: Record<ResumeSection, string> = {
  CAREER: "Beruflicher Werdegang",
  EDUCATION: "Ausbildung",
  PROJECT: "Projektreferenzen",
  SKILL: "Fähigkeiten",
};

/** Registerkarten der Maske. Die Reihenfolge ist die Reihenfolge im UI. */
export const RESUME_TABS = [
  "person",
  "werdegang",
  "projekte",
  "faehigkeiten",
  "bild",
  "publikationen",
  "zertifizierungen",
  "awards",
] as const;
export type ResumeTab = (typeof RESUME_TABS)[number];

export const RESUME_TAB_FOR_SECTION: Record<ResumeSection, ResumeTab> = {
  CAREER: "werdegang",
  EDUCATION: "werdegang",
  PROJECT: "projekte",
  SKILL: "faehigkeiten",
};

export function isResumeSection(value: unknown): value is ResumeSection {
  return typeof value === "string" && (RESUME_SECTIONS as readonly string[]).includes(value);
}

/** Das Register aus der Adresse; unbekannte Werte landen auf dem ersten. */
export function toResumeTab(value: string | undefined): ResumeTab {
  return value && (RESUME_TABS as readonly string[]).includes(value)
    ? (value as ResumeTab)
    : "person";
}
