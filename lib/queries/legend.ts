import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { assetUrl } from "@/lib/media/url";
import type { Locale } from "@/lib/i18n/config";

// Inhalte der „Legende"-Seite (SPEC §5). Im Admin pflegbar; solange nichts
// gepflegt ist, greifen die unten definierten Standardtexte (das bisherige
// Mockup), damit die Seite nie leer ist.

export interface LegendPillar {
  title: string;
  text: string;
}

export interface LegendData {
  eyebrow: string;
  name: string;
  lead: string;
  missionEyebrow: string;
  missionText: string;
  pillars: LegendPillar[];
  tools: string[];
  contactEyebrow: string;
  contactHeading: string;
  contactText: string;
  contactButton: string;
  contactUrl: string;
  portrait: { url: string; alt: string; ai: boolean } | null;
}

export const LEGEND_DEFAULTS: Record<Locale, LegendData> = {
  de: {
    eyebrow: "Die Legende · über mich",
    name: "Nicole Enders",
    lead: "Microsoft MVP seit 2020. Ich arbeite an der Schnittstelle zwischen dem, was technisch geht, und dem, was Menschen im Arbeitsalltag hilft.",
    missionEyebrow: "Meine Mission",
    missionText: "Menschen und Organisationen mit intelligenten Lösungen verbinden, um zukunftssicher, produktiv und smarter zu arbeiten.",
    pillars: [
      { title: "Strategie", text: "Klar. Zielgerichtet." },
      { title: "Architektur", text: "Sicher. Skalierbar." },
      { title: "Umsetzung", text: "Pragmatisch. Effizient." },
      { title: "Adoption", text: "Veränderung. Akzeptanz." },
      { title: "Enablement", text: "Wissen. Fähigkeiten." },
      { title: "Impact", text: "Erfolge. Mehrwert." },
    ],
    tools: ["MICROSOFT FOUNDRY", "COPILOT STUDIO", "MICROSOFT 365", "MICROSOFT AZURE", "MICROSOFT TEAMS", "POWER PLATFORM"],
    contactEyebrow: "Kontakt aufnehmen",
    contactHeading: "Zwei Kanäle",
    // ENTWURF — von Nicole zu prüfen (Phase 7.2).
    contactText: "Für Anfragen zu Vorträgen, Workshops und Beratung erreichst du mich am schnellsten über LinkedIn. Wenn dir E-Mail lieber ist, geht das genauso.",
    contactButton: "Nachricht auf LinkedIn",
    // Leer statt "#": die Legende-Seite fällt dann auf das hinterlegte
    // LinkedIn-Profil aus den Einstellungen zurück (Phase 1.2c, vollständig in
    // Phase 7).
    contactUrl: "",
    portrait: null,
  },
  en: {
    eyebrow: "The legend · about me",
    name: "Nicole Enders",
    lead: "Microsoft MVP since 2020. I work at the intersection of what is technically possible and what actually helps people at work.",
    missionEyebrow: "My mission",
    missionText: "Connecting people and organisations with intelligent solutions to work future-proof, productive and smarter.",
    pillars: [
      { title: "Strategy", text: "Clear. Focused." },
      { title: "Architecture", text: "Secure. Scalable." },
      { title: "Delivery", text: "Pragmatic. Efficient." },
      { title: "Adoption", text: "Change. Acceptance." },
      { title: "Enablement", text: "Knowledge. Skills." },
      { title: "Impact", text: "Results. Value." },
    ],
    tools: ["MICROSOFT FOUNDRY", "COPILOT STUDIO", "MICROSOFT 365", "MICROSOFT AZURE", "MICROSOFT TEAMS", "POWER PLATFORM"],
    contactEyebrow: "Get in touch",
    contactHeading: "Two channels",
    // ENTWURF — von Nicole zu prüfen (Phase 7.2).
    contactText: "For talks, workshops and consulting, LinkedIn is the fastest way to reach me. If you prefer email, that works just as well.",
    contactButton: "Message on LinkedIn",
    contactUrl: "",
    portrait: null,
  },
};

function parseJson<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

async function loadLegend(locale: Locale): Promise<LegendData> {
  const row = await db.legendContent.findUnique({
    where: { locale },
    include: { portrait: true },
  });
  const defaults = LEGEND_DEFAULTS[locale];
  if (!row) return defaults;
  return {
    eyebrow: row.eyebrow,
    name: row.name,
    lead: row.lead,
    missionEyebrow: row.missionEyebrow,
    missionText: row.missionText,
    pillars: parseJson<LegendPillar[]>(row.pillarsJson, defaults.pillars),
    tools: parseJson<string[]>(row.toolsJson, defaults.tools),
    contactEyebrow: row.contactEyebrow,
    contactHeading: row.contactHeading,
    contactText: row.contactText,
    contactButton: row.contactButton,
    contactUrl: row.contactUrl,
    portrait: row.portrait
      ? {
          url: assetUrl(row.portrait.blobPath),
          alt: (locale === "en" ? row.portrait.altEn : row.portrait.altDe) || row.name,
          ai: row.portrait.source === "AI",
        }
      : null,
  };
}

export async function getLegend(locale: Locale): Promise<LegendData> {
  const run = cachedQuery(loadLegend, ["legend", locale], [tags.legend(locale)]);
  try {
    return await run(locale);
  } catch {
    return LEGEND_DEFAULTS[locale];
  }
}
