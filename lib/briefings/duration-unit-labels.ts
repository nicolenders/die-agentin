import { DURATION_UNITS, type DurationUnit } from "@/lib/briefings/speaker-formats";

// Beschriftungen der Dauer-Einheiten im Auswahlfeld der Redaktion. Nur hier
// deutsch fest verdrahtet: Die Zentrale ist deutschsprachig. Die öffentlichen
// Abkürzungen stehen in `speaker-formats.ts` und sind zweisprachig.
//
// Aus `DURATION_UNITS` gebaut, damit eine neue Einheit ohne Beschriftung beim
// Typecheck auffällt und nicht erst im Formular.
const LABELS: Record<DurationUnit, string> = {
  MINUTES: "Minuten",
  HOURS: "Stunden",
  DAYS: "Tage",
};

export const DURATION_UNIT_LABEL: { value: DurationUnit; label: string }[] =
  DURATION_UNITS.map((value) => ({ value, label: LABELS[value] }));
