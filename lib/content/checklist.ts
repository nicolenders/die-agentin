// Veröffentlichungs-Prüfliste (SPEC §6). Veröffentlichung nur, wenn alles grün
// ist: Titel, Summary, alle Bilder mit Alt-Text, mindestens die DE-Fassung.

export interface ChecklistInput {
  deTitle: string;
  deSummary: string;
  hasGermanBody: boolean;
  /** Anzahl referenzierter Bilder ohne (nicht-dekorativen) Alt-Text. */
  imagesWithoutAlt: number;
  enPresent: boolean;
}

export type ChecklistLevel = "ok" | "error" | "warn";

export interface ChecklistItem {
  key: string;
  label: string;
  level: ChecklistLevel;
}

export interface ChecklistResult {
  items: ChecklistItem[];
  canPublish: boolean;
}

export function buildChecklist(input: ChecklistInput): ChecklistResult {
  const items: ChecklistItem[] = [];

  const titleOk = input.deTitle.trim().length > 0;
  const summaryOk = input.deSummary.trim().length > 0;
  items.push({
    key: "titleSummary",
    label: "Titel und Beschreibung gesetzt",
    level: titleOk && summaryOk ? "ok" : "error",
  });

  items.push({
    key: "germanBody",
    label: "Deutsche Fassung vorhanden",
    level: input.hasGermanBody ? "ok" : "error",
  });

  items.push({
    key: "altText",
    label:
      input.imagesWithoutAlt === 0
        ? "Alle Bilder mit Alt-Text"
        : `${input.imagesWithoutAlt} Bild(er) ohne Alt-Text`,
    level: input.imagesWithoutAlt === 0 ? "ok" : "error",
  });

  // EN fehlend ist eine Warnung, kein Blocker (SPEC §8: EN ist optional).
  items.push({
    key: "english",
    label: input.enPresent ? "Englische Fassung vorhanden" : "Englische Fassung fehlt",
    level: input.enPresent ? "ok" : "warn",
  });

  const canPublish = items.every((i) => i.level !== "error");
  return { items, canPublish };
}
