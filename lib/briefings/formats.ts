// Vortragsformate für die Akte (Audit 6.4).
//
// Die Akte versprach „Formate" und lieferte sie nicht. Statt eine zweite,
// separat zu pflegende Liste anzulegen, entstehen die Formate aus den Dauern
// der bereits gepflegten Briefings — dann veralten sie nicht.

export const TALK_FORMATS = ["LIGHTNING", "SESSION", "LONG_SESSION", "WORKSHOP"] as const;
export type TalkFormat = (typeof TALK_FORMATS)[number];

/** Ordnet eine Dauer in Minuten einem Format zu. */
export function talkFormatOf(min: number): TalkFormat {
  if (min <= 30) return "LIGHTNING";
  if (min <= 50) return "SESSION";
  if (min < 180) return "LONG_SESSION";
  return "WORKSHOP";
}

export interface TalkFormatGroup {
  format: TalkFormat;
  /** Tatsächlich vorkommende Dauern, aufsteigend. */
  minutes: number[];
}

/**
 * Gruppiert die vorkommenden Dauern zu Formaten. Formate ohne Briefing tauchen
 * nicht auf — die Akte soll nichts anbieten, was es nicht gibt.
 */
export function talkFormats(durations: (number | null | undefined)[]): TalkFormatGroup[] {
  const byFormat = new Map<TalkFormat, Set<number>>();
  for (const d of durations) {
    if (typeof d !== "number" || d <= 0) continue;
    const format = talkFormatOf(d);
    const set = byFormat.get(format) ?? new Set<number>();
    set.add(d);
    byFormat.set(format, set);
  }
  return TALK_FORMATS.filter((f) => byFormat.has(f)).map((format) => ({
    format,
    minutes: [...(byFormat.get(format) ?? [])].sort((a, b) => a - b),
  }));
}
