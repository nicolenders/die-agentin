// Vortrags-Ranking (SPEC §6 Ziel, §17 Testziel). Reine Funktion: zählt
// TalkDeliveries je Vortrag in einem optionalen Zeitraum und teilt nach Sprache
// auf. Getrennt von der DB, damit die Logik unit-getestet werden kann.

export interface DeliveryRow {
  talkId: string;
  language: string;
  heldOn: Date;
}

export interface TalkMeta {
  id: string;
  title: string;
  level?: string | null;
  categoryName?: string | null;
}

export interface RankRow {
  talkId: string;
  title: string;
  total: number;
  de: number;
  en: number;
  level: string | null;
  categoryName: string | null;
  lastHeld: Date | null;
}

export interface DateRange {
  from?: Date;
  to?: Date;
}

function inRange(date: Date, range?: DateRange): boolean {
  if (!range) return true;
  if (range.from && date < range.from) return false;
  if (range.to && date > range.to) return false;
  return true;
}

/**
 * Erzeugt das nach Häufigkeit sortierte Ranking. Nur Vorträge mit mindestens
 * einer Durchführung im Zeitraum erscheinen. Sortierung: Gesamtzahl absteigend,
 * bei Gleichstand alphabetisch.
 */
export function computeRanking(
  talks: TalkMeta[],
  deliveries: DeliveryRow[],
  range?: DateRange,
): RankRow[] {
  const byTalk = new Map<string, { de: number; en: number; last: Date | null }>();

  for (const d of deliveries) {
    if (!inRange(d.heldOn, range)) continue;
    const entry = byTalk.get(d.talkId) ?? { de: 0, en: 0, last: null };
    if (d.language === "en") entry.en += 1;
    else entry.de += 1;
    if (!entry.last || d.heldOn > entry.last) entry.last = d.heldOn;
    byTalk.set(d.talkId, entry);
  }

  const talkById = new Map(talks.map((t) => [t.id, t]));
  const rows: RankRow[] = [];
  for (const [talkId, counts] of byTalk) {
    const meta = talkById.get(talkId);
    rows.push({
      talkId,
      title: meta?.title ?? talkId,
      total: counts.de + counts.en,
      de: counts.de,
      en: counts.en,
      level: meta?.level ?? null,
      categoryName: meta?.categoryName ?? null,
      lastHeld: counts.last,
    });
  }

  rows.sort((a, b) => b.total - a.total || a.title.localeCompare(b.title));
  return rows;
}
