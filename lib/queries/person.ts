import { getSocialLinks } from "@/lib/queries/settings";
import { getPublishedIdentities, getIdentityTools } from "@/lib/queries/identities";
import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import type { PersonInput } from "@/lib/seo/jsonld";
import type { Locale } from "@/lib/i18n/config";

// Daten für den Person-Knoten (JSON-LD, Phase 13.3). Nur sichtbare Fakten:
// sameAs aus den gepflegten Social-Profilen, knowsAbout aus den Identitäten,
// award aus MVP/Auszeichnungen. Sessionize-/MVP-Profil-URLs ergänzt Nicole
// (Anhang B) — sie kommen dann automatisch über die Social-Settings dazu.

const NAME = "Nicole Enders";

// Der Markenname als zweiter Name derselben Person. Das ist die einzige Stelle
// im Markup, an der „Nicole Enders“ und „Die Agentin“ als dieselbe Entität
// auftreten — ohne sie stehen beide Namen unverbunden nebeneinander.
const ALTERNATE_NAMES = ["Die Agentin"];

// Wie viele Werkzeuge als Fachgebiete mitgehen. Die Liste ist nach zuletzt
// genutzt sortiert; alles darüber hinaus verwässert die Aussage mehr, als es
// hilft.
const MAX_TOOLS = 12;

async function loadAwards(): Promise<string[]> {
  try {
    const rows = await db.certification.findMany({
      where: { OR: [{ kind: "MVP" }, { kind: "AWARD" }] },
      select: { name: true, series: true },
    });
    const set = new Set<string>();
    for (const r of rows) set.add(r.series ?? r.name);
    return [...set];
  } catch {
    return [];
  }
}

const cachedAwards = cachedQuery(loadAwards, ["person-awards"], [tags.certificationList("de")]);

export async function getPersonInput(locale: Locale): Promise<PersonInput> {
  const [social, identities, tools, awards] = await Promise.all([
    getSocialLinks(),
    getPublishedIdentities(locale),
    getIdentityTools().catch(() => []),
    cachedAwards().catch(() => []),
  ]);

  const sameAs = Object.values(social).filter(Boolean);
  const knowsAbout = new Set<string>();
  for (const i of identities) {
    if (i.role) knowsAbout.add(i.role);
  }
  // Zusätzlich die Werkzeuge. Die Rollen allein ergaben eine sehr kurze Liste
  // von fünf Oberbegriffen — zu wenig, um die Person fachlich einzuordnen.
  // Die Werkzeuge stehen sichtbar auf der Legende und den Identitätsseiten,
  // die Regel „nur sichtbare Daten in JSON-LD" bleibt also gewahrt. Historische
  // Werkzeuge bleiben draußen: sie beschreiben nicht mehr, woran sie arbeitet.
  for (const t of tools.filter((x) => !x.historic).slice(0, MAX_TOOLS)) {
    knowsAbout.add(t.name);
  }

  return {
    name: NAME,
    alternateName: ALTERNATE_NAMES,
    jobTitle: locale === "de" ? "Microsoft MVP · Speakerin & Autorin" : "Microsoft MVP · Speaker & Author",
    description:
      locale === "de"
        ? "Microsoft MVP seit 2020, siebenmal in Folge. Arbeitet an der Grenze zwischen Konfiguration und Entwicklung, von Information Architecture bis zu Agents."
        : "Microsoft MVP since 2020, seven years running. Works on the line between configuration and code, from information architecture to agents.",
    disambiguatingDescription:
      locale === "de"
        ? "„Die Agentin“ ist der Markenname von Nicole Enders, Microsoft MVP für Modern Work und AI — nicht der Titel eines Films oder eine Romanfigur."
        : "“Die Agentin” is the brand name of Nicole Enders, Microsoft MVP for Modern Work and AI — not a film title or a fictional character.",
    sameAs,
    knowsAbout: [...knowsAbout],
    awards,
  };
}
