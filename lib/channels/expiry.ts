// Ablaufwarnung für Kanal-Tokens (SPEC §7.1). Das Dashboard warnt 14 Tage vor
// Ablauf; ohne gültige Verbindung fallen geplante LinkedIn-Tasks auf
// MANUAL_OPEN zurück, statt zu scheitern.

export const WARN_DAYS = 14;

export type ExpiryState = "ok" | "warn" | "expired" | "none";

export function expiryState(
  expiresAt: Date | null | undefined,
  now: Date = new Date(),
  warnDays: number = WARN_DAYS,
): ExpiryState {
  if (!expiresAt) return "none";
  const ms = expiresAt.getTime() - now.getTime();
  if (ms <= 0) return "expired";
  if (ms <= warnDays * 24 * 3600 * 1000) return "warn";
  return "ok";
}

/** Tage bis zum Ablauf (aufgerundet), oder null. */
export function daysUntil(
  expiresAt: Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!expiresAt) return null;
  return Math.ceil((expiresAt.getTime() - now.getTime()) / (24 * 3600 * 1000));
}
