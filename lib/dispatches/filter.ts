import { berlinDay } from "@/lib/time";
import { matchesAny, normalizeQuery } from "@/lib/admin/search";

// Filter der Depeschenübersicht: Freitext und Jahr. Reine Funktionen — die
// Seite reicht nur die Liste durch. Die Normalisierung des Suchbegriffs ist
// dieselbe wie in der Adminsuche; zwei Fassungen desselben Vergleichs im Code
// laufen sonst auseinander.

export interface DispatchFilterable {
  format: string;
  title: string;
  summary: string | null;
  topics: string[];
  identities: { name: string }[];
  publishedAt: Date | null;
  reviewedAt: Date | null;
}

/**
 * Das Datum, das an der Depesche steht. Bei Nachschlagewerken ist das die
 * letzte Prüfung („Aktualisiert am"), sonst die Veröffentlichung — sonst filtert
 * ein Jahres-Blib nach einem Datum, das nirgends zu sehen ist.
 */
export function dispatchDate(d: DispatchFilterable): Date | null {
  return d.format === "REFERENCE" && d.reviewedAt ? d.reviewedAt : d.publishedAt;
}

/**
 * Das Jahr in Berliner Zeit. In der Datenbank steht UTC; eine Depesche vom
 * 1. Januar 00:30 Uhr Berliner Zeit gehört ins neue Jahr, nicht ins alte.
 */
export function dispatchYear(d: DispatchFilterable): number | null {
  const date = dispatchDate(d);
  return date ? Number(berlinDay(date).slice(0, 4)) : null;
}

/** Jahre, zu denen es Depeschen gibt — neueste zuerst, ohne Lücken-Jahre. */
export function dispatchYears(list: DispatchFilterable[]): number[] {
  const years = new Set<number>();
  for (const d of list) {
    const year = dispatchYear(d);
    if (year !== null) years.add(year);
  }
  return [...years].sort((a, b) => b - a);
}

/** Gehört die Depesche in das gewählte Jahr? Ohne Auswahl: ja. */
export function matchesDispatchYear(d: DispatchFilterable, year: number | null): boolean {
  if (year === null) return true;
  return dispatchYear(d) === year;
}

/**
 * Freitextsuche über Titel, Zusammenfassung, Themen und Identitäten. Ein leerer
 * Suchbegriff schränkt nicht ein.
 */
export function matchesDispatchSearch(d: DispatchFilterable, query: string): boolean {
  const needle = normalizeQuery(query);
  if (!needle) return true;
  return matchesAny(needle, [d.title, d.summary, ...d.topics, ...d.identities.map((i) => i.name)]);
}

/** Liest eine Jahresangabe aus der Adresse. Unfug ergibt „kein Filter". */
export function parseDispatchYear(raw: string | null | undefined): number | null {
  const value = Number((raw ?? "").trim());
  return Number.isInteger(value) && value >= 1900 && value <= 2999 ? value : null;
}
