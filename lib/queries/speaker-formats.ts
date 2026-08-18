import { db } from "@/lib/db";
import { cachedQuery } from "@/lib/cache";
import {
  formatDurationRange,
  languagesLabel,
  parseFormatLanguages,
  toDurationUnit,
} from "@/lib/briefings/speaker-formats";
import type { Locale } from "@/lib/i18n/config";

// Vortragsformate der Akte (Speaker-Kit), in der Redaktion gepflegt. Ist die
// Liste leer, fällt die Akte auf die Ableitung aus den Briefing-Dauern zurück
// (`lib/briefings/formats.ts`) — die Seite verspricht dann weiter nur, was es
// tatsächlich gibt.

export const SPEAKER_FORMATS_TAG = "speaker-formats";

export interface SpeakerFormatRow {
  id: string;
  title: string;
  /** Fertig formatierte Dauer, leer wenn keine gepflegt ist. */
  duration: string;
  /** Sprachen als „DE · EN", leer wenn keine ausgewählt ist. */
  languages: string;
  note: string;
}

async function loadSpeakerFormats(locale: Locale): Promise<SpeakerFormatRow[]> {
  const rows = await db.speakerFormat.findMany({
    where: { active: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
  const en = locale === "en";
  return rows.map((r) => ({
    id: r.id,
    title: (en ? r.titleEn?.trim() : "") || r.titleDe,
    duration: formatDurationRange(
      r.durationFrom,
      r.durationTo,
      toDurationUnit(r.durationUnit),
      locale,
    ),
    languages: languagesLabel(parseFormatLanguages(r.languages)),
    note: ((en ? r.noteEn?.trim() : "") || r.noteDe || "").trim(),
  }));
}

export async function getSpeakerFormats(locale: Locale): Promise<SpeakerFormatRow[]> {
  const run = cachedQuery(loadSpeakerFormats, ["speaker-formats", locale], [SPEAKER_FORMATS_TAG]);
  try {
    return await run(locale);
  } catch {
    return [];
  }
}

/** Rohdaten für die Redaktion, inklusive der ausgeblendeten Formate. */
export async function getSpeakerFormatsRaw() {
  try {
    return await db.speakerFormat.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    });
  } catch {
    return [];
  }
}
