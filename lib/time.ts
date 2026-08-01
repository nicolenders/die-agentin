// Zeit-Umrechnung (SPEC §6). In der DB immer UTC; die Redaktion arbeitet in
// Europe/Berlin. Der Editor liefert eine `datetime-local`-Zeichenkette
// (Wanduhrzeit in Berlin), die hier in einen UTC-Zeitpunkt umgerechnet wird.

const TZ = "Europe/Berlin";

/** Offset (Minuten) von Europe/Berlin gegenüber UTC zum gegebenen Zeitpunkt. */
export function berlinOffsetMinutes(instant: Date): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts = dtf.formatToParts(instant);
  const get = (type: string) => Number(parts.find((p) => p.type === type)?.value ?? "0");
  const asUtc = Date.UTC(
    get("year"),
    get("month") - 1,
    get("day"),
    get("hour"),
    get("minute"),
    get("second"),
  );
  return Math.round((asUtc - instant.getTime()) / 60000);
}

/**
 * Interpretiert eine `datetime-local`-Zeichenkette als Berliner Wanduhrzeit und
 * gibt den entsprechenden UTC-Zeitpunkt zurück. Null bei leerer/ungültiger
 * Eingabe.
 */
export function berlinLocalToUtc(local: string | null | undefined): Date | null {
  if (!local) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(local);
  if (!match) return null;
  const [, y, mo, d, h, mi] = match;
  const naiveUtc = new Date(`${y}-${mo}-${d}T${h}:${mi}:00Z`);
  const offset = berlinOffsetMinutes(naiveUtc);
  return new Date(naiveUtc.getTime() - offset * 60000);
}

/** Wandelt einen UTC-Zeitpunkt in eine `datetime-local`-Zeichenkette (Berlin). */
export function utcToBerlinLocal(date: Date | null | undefined): string {
  if (!date) return "";
  const offset = berlinOffsetMinutes(date);
  const shifted = new Date(date.getTime() + offset * 60000);
  return shifted.toISOString().slice(0, 16);
}
