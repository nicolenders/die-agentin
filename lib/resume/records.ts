// Nachweise im Lebenslauf: Zertifizierungen, Schulungen und Auszeichnungen.
//
// Ein Lebenslauf ist kein Regal voller Abzeichen. Sieben MVP-Awards in sieben
// Zeilen liest niemand — sie gehören in eine Zeile mit einer Jahresspanne.
// Deshalb werden gleichnamige Nachweise zusammengefasst.

export interface CertLike {
  kind: string;
  status: string;
}

/**
 * Die Nachweise, wie der Lebenslauf sie gliedert: Zertifizierungen,
 * Schulungen, Auszeichnungen (MVP zählt dazu). Geplante Zertifizierungen
 * bleiben draußen — ein Lebenslauf zeigt Erreichtes, keine Vorhaben.
 *
 * Ein Ort für die Regel, weil Auswahldialog und Dokument dieselbe Liste
 * zeigen müssen: Was im Dialog anklickbar ist, muss im Lebenslauf auch
 * ankommen können.
 */
export function splitRecordsForCv<T extends CertLike>(certs: readonly T[]) {
  const achieved = certs.filter((c) => c.status !== "PLANNED");
  return {
    certifications: achieved.filter((c) => c.kind === "CERTIFICATION"),
    trainings: achieved.filter((c) => c.kind === "TRAINING"),
    awards: achieved.filter((c) => c.kind === "MVP" || c.kind === "AWARD"),
  };
}

/**
 * Publikationen für den Lebenslauf. Videos bleiben draußen: Bei dreistelligen
 * Zahlen wäre der Abschnitt eine Liste ohne Aussage, und Aufzeichnungen sind
 * keine Veröffentlichungen im Sinne einer Bewerbung.
 */
export function publicationsForCv<T extends { type: string }>(items: readonly T[]): T[] {
  return items.filter((p) => p.type !== "VIDEO");
}

export interface RecordLike {
  id: string;
  name: string;
  shortCode: string | null;
  acquiredOn: Date;
  validUntil: Date | null;
}

export interface GroupedRecord {
  /** Kennung des jüngsten Nachweises der Gruppe — Reihenfolge und Schlüssel. */
  id: string;
  name: string;
  shortCode: string | null;
  /** Alle Jahre der Gruppe, absteigend. */
  years: number[];
  count: number;
  /** Nur bei einzelnen Nachweisen sinnvoll: Ablauf des Nachweises. */
  validUntil: Date | null;
}

function year(date: Date): number {
  return date.getUTCFullYear();
}

/**
 * Fasst gleichnamige Nachweise zusammen. Die Reihenfolge der Eingabe bleibt
 * erhalten (der Adminbereich sortiert sie), die Gruppe steht an der Stelle
 * ihres ersten Vertreters.
 */
export function groupRecords(items: readonly RecordLike[]): GroupedRecord[] {
  const groups = new Map<string, GroupedRecord>();
  for (const item of items) {
    const key = item.name.trim().toLowerCase();
    const existing = groups.get(key);
    if (existing) {
      existing.years.push(year(item.acquiredOn));
      existing.count += 1;
      // Ein Ablaufdatum steht nur an Einzelnachweisen; bei einer Reihe wäre
      // unklar, welcher der Nachweise gemeint ist.
      existing.validUntil = null;
      continue;
    }
    groups.set(key, {
      id: item.id,
      name: item.name,
      shortCode: item.shortCode,
      years: [year(item.acquiredOn)],
      count: 1,
      validUntil: item.validUntil,
    });
  }
  for (const group of groups.values()) {
    group.years.sort((a, b) => b - a);
  }
  return [...groups.values()];
}

/**
 * Die Jahresangabe einer Gruppe: ein Jahr, eine lückenlose Spanne oder eine
 * Aufzählung. „2020 – 2026“ nur, wenn wirklich jedes Jahr dazwischen belegt
 * ist — sonst behauptet die Spanne mehr, als da ist.
 */
export function formatRecordYears(years: readonly number[]): string {
  if (years.length === 0) return "";
  const sorted = [...new Set(years)].sort((a, b) => b - a);
  if (sorted.length === 1) return String(sorted[0]);
  const newest = sorted[0]!;
  const oldest = sorted[sorted.length - 1]!;
  const gapless = newest - oldest + 1 === sorted.length;
  if (gapless) return `${oldest} – ${newest}`;
  return sorted.join(", ");
}
