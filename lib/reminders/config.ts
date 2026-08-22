// Einstellungen aller Erinnerungen an EINER Stelle: die Schlüssel, unter denen
// sie als `SiteSetting` liegen, die Vorgabewerte und die Prüfung der Eingaben.
//
// Zwei Anlässe, eine Adresse: Depeschen melden sich vor ihrem
// Veröffentlichungsdatum, Einsatzberichte vor und nach dem Einsatz. Beide gehen
// an dieselbe Adresse — zwei Postfächer zu pflegen wäre eine Fehlerquelle ohne
// Gegenwert.

/** Empfänger aller Erinnerungen. */
export const REMINDER_EMAIL_KEY = "reminder.email";

/**
 * Bis zum Umbau hieß der Schlüssel nach den Depeschen. Die Migration übernimmt
 * den Wert; gelesen wird er weiterhin als Rückfall, damit eine übersprungene
 * Migration nicht in einer stillen „keine Adresse"-Lage endet.
 */
export const LEGACY_DISPATCH_EMAIL_KEY = "dispatch.reminder.email";

export const DEFAULT_REMINDER_EMAIL = "nicole.enders.de@gmail.com";

// --- Depeschen -------------------------------------------------------------

export const DISPATCH_REMINDER_ENABLED_KEY = "dispatch.reminder.enabled";
export const DISPATCH_REMINDER_LEAD_DAYS_KEY = "dispatch.reminder.leadDays";
export const DEFAULT_DISPATCH_LEAD_DAYS = 3;

// --- Einsatzberichte -------------------------------------------------------

export const MISSION_REMINDER_ENABLED_KEY = "mission.report.reminder.enabled";
export const MISSION_REMINDER_BEFORE_DAYS_KEY = "mission.report.reminder.beforeDays";
export const MISSION_REMINDER_AFTER_DAYS_KEY = "mission.report.reminder.afterDays";

/** Kurz vor dem Auftritt: „denk an Fotos und Notizen." */
export const DEFAULT_MISSION_BEFORE_DAYS = 3;
/** Eine Woche danach ist der Einsatz noch frisch genug, um darüber zu schreiben. */
export const DEFAULT_MISSION_AFTER_DAYS = 7;

/** Grenzen für alle Vorlaufzeiten: 0 wäre keine Erinnerung, 90 Tage kein „bald". */
export const MIN_REMINDER_DAYS = 1;
export const MAX_REMINDER_DAYS = 90;

/** Liest eine gepflegte Tagesangabe; unbrauchbare Werte fallen auf `fallback`. */
export function parseReminderDays(raw: string | null | undefined, fallback: number): number {
  const n = Number.parseInt(String(raw ?? "").trim(), 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(MAX_REMINDER_DAYS, Math.max(MIN_REMINDER_DAYS, n));
}

/** Ist die Angabe eine zulässige Tageszahl? Für die Prüfung in der Server Action. */
export function isValidReminderDays(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_REMINDER_DAYS && value <= MAX_REMINDER_DAYS;
}

export interface ReminderSettings {
  /** Empfänger aller Erinnerungen. */
  email: string;
  /** Depeschen: Erinnerung vor dem Veröffentlichungsdatum. */
  dispatchEnabled: boolean;
  dispatchLeadDays: number;
  /** Einsatzberichte: Erinnerung vor und nach dem Einsatz. */
  missionEnabled: boolean;
  missionBeforeDays: number;
  missionAfterDays: number;
}

export const DEFAULT_REMINDER_SETTINGS: ReminderSettings = {
  email: DEFAULT_REMINDER_EMAIL,
  dispatchEnabled: true,
  dispatchLeadDays: DEFAULT_DISPATCH_LEAD_DAYS,
  missionEnabled: true,
  missionBeforeDays: DEFAULT_MISSION_BEFORE_DAYS,
  missionAfterDays: DEFAULT_MISSION_AFTER_DAYS,
};

/** Alle Schlüssel, die aus `SiteSetting` gelesen werden müssen. */
export const REMINDER_SETTING_KEYS = [
  REMINDER_EMAIL_KEY,
  LEGACY_DISPATCH_EMAIL_KEY,
  DISPATCH_REMINDER_ENABLED_KEY,
  DISPATCH_REMINDER_LEAD_DAYS_KEY,
  MISSION_REMINDER_ENABLED_KEY,
  MISSION_REMINDER_BEFORE_DAYS_KEY,
  MISSION_REMINDER_AFTER_DAYS_KEY,
];

/**
 * Baut die Einstellungen aus den gelesenen Schlüssel/Wert-Paaren. Rein, damit
 * sich die Rückfälle prüfen lassen, ohne eine Datenbank zu brauchen.
 *
 * Fehlt ein „an/aus"-Eintrag, ist die Erinnerung AN: Sie ist der Zweck der
 * Funktion, und wer sie nicht will, schaltet sie einmal ab.
 */
export function buildReminderSettings(values: Map<string, string>): ReminderSettings {
  const bool = (key: string) => {
    const raw = values.get(key);
    return raw == null || raw.trim() === "" ? true : raw.trim() === "true";
  };
  const email =
    values.get(REMINDER_EMAIL_KEY)?.trim() ||
    values.get(LEGACY_DISPATCH_EMAIL_KEY)?.trim() ||
    DEFAULT_REMINDER_EMAIL;

  return {
    email,
    dispatchEnabled: bool(DISPATCH_REMINDER_ENABLED_KEY),
    dispatchLeadDays: parseReminderDays(values.get(DISPATCH_REMINDER_LEAD_DAYS_KEY), DEFAULT_DISPATCH_LEAD_DAYS),
    missionEnabled: bool(MISSION_REMINDER_ENABLED_KEY),
    missionBeforeDays: parseReminderDays(values.get(MISSION_REMINDER_BEFORE_DAYS_KEY), DEFAULT_MISSION_BEFORE_DAYS),
    missionAfterDays: parseReminderDays(values.get(MISSION_REMINDER_AFTER_DAYS_KEY), DEFAULT_MISSION_AFTER_DAYS),
  };
}
