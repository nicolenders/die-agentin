// Entscheidet, ob ein Job-Tick die Datenbank überhaupt anfassen muss.
//
// Der Tick läuft stündlich (infra/main.bicep). Die serverlose Datenbank kostet
// nach Online-Zeit: eine einzige Abfrage hält sie für die Dauer des
// Auto-Pause-Delays wach. Ein Tick, der nichts zu tun hat, darf sie deshalb
// nicht wecken — auch nicht, um nachzusehen, ob es etwas zu tun gibt.
//
// Grundlage ist die Terminnotiz (lib/jobs/schedule-hint.ts), die der letzte
// vollständige Lauf hinterlassen hat. Alles, was hier zu „ich weiß es nicht"
// führt, entscheidet zugunsten des vollständigen Laufs: eine überflüssige
// Weckung kostet Cent, eine verpasste Veröffentlichung kostet Vertrauen.

/** Ab wann gilt die Terminnotiz als zu alt, um ihr noch zu glauben? */
export const HINT_MAX_AGE_MS = 6 * 60 * 60 * 1000;

/** So viele gepufferte Seitenaufrufe lösen einen Lauf aus, egal wann. */
export const PAGEVIEW_FLUSH_THRESHOLD = 200;

/** Feste Sammelfenster (UTC) für die gepufferten Seitenaufrufe. */
export const FLUSH_HOURS_UTC = [0, 6, 12, 18] as const;

export interface TickHint {
  /** Frühester Zeitpunkt, zu dem wieder etwas zu tun ist. `null` = nichts offen. */
  nextDueAt: Date | null;
  /** Wann die Notiz entstanden ist. */
  writtenAt: Date;
}

export interface TickInput {
  now: Date;
  /** `null`, wenn es keine Notiz gibt (erster Lauf, Neustart, Ablage leer). */
  hint: TickHint | null;
  bufferedPageviews: number;
}

export interface TickPlan {
  /** Wird die Datenbank in diesem Tick geweckt? */
  touchDatabase: boolean;
  /** Klartext für Protokoll und Antwort. */
  reason: string;
}

export function planTick({ now, hint, bufferedPageviews }: TickInput): TickPlan {
  if (!hint) {
    return { touchDatabase: true, reason: "Keine Terminnotiz vorhanden." };
  }

  const age = now.getTime() - hint.writtenAt.getTime();
  if (age > HINT_MAX_AGE_MS) {
    return {
      touchDatabase: true,
      reason: `Terminnotiz ist älter als ${Math.round(HINT_MAX_AGE_MS / 3_600_000)} Stunden.`,
    };
  }

  if (hint.nextDueAt && hint.nextDueAt.getTime() <= now.getTime()) {
    return { touchDatabase: true, reason: "Ein Termin ist fällig." };
  }

  if (bufferedPageviews >= PAGEVIEW_FLUSH_THRESHOLD) {
    return {
      touchDatabase: true,
      reason: `${bufferedPageviews} gepufferte Seitenaufrufe warten auf die Ablage.`,
    };
  }

  if (bufferedPageviews > 0 && (FLUSH_HOURS_UTC as readonly number[]).includes(now.getUTCHours())) {
    return { touchDatabase: true, reason: "Sammelfenster für Seitenaufrufe." };
  }

  return { touchDatabase: false, reason: "Nichts fällig — die Datenbank bleibt schlafen." };
}
