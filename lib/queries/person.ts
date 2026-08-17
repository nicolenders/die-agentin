import { getSocialLinks } from "@/lib/queries/settings";
import { getPublishedIdentities } from "@/lib/queries/identities";
import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import type { PersonInput } from "@/lib/seo/jsonld";
import type { Locale } from "@/lib/i18n/config";

// Daten für den Person-Knoten (JSON-LD, Phase 13.3). Nur sichtbare Fakten:
// sameAs aus den gepflegten Social-Profilen, knowsAbout aus den Identitäten,
// award aus MVP/Auszeichnungen. Sessionize-/MVP-Profil-URLs ergänzt Nicole
// (Anhang B) — sie kommen dann automatisch über die Social-Settings dazu.

const NAME = "Nicole Enders";

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
  const [social, identities, awards] = await Promise.all([
    getSocialLinks(),
    getPublishedIdentities(locale),
    cachedAwards().catch(() => []),
  ]);

  const sameAs = Object.values(social).filter(Boolean);
  const knowsAbout = new Set<string>();
  for (const i of identities) {
    if (i.role) knowsAbout.add(i.role);
  }
  // Fachgebiete aus den Rollen genügen als knowsAbout; Detail-Fokus liegt auf den
  // Identitätsseiten (nur sichtbare Daten in JSON-LD).

  return {
    name: NAME,
    jobTitle: locale === "de" ? "Microsoft MVP · Speakerin & Autorin" : "Microsoft MVP · Speaker & Author",
    description:
      locale === "de"
        ? "Microsoft MVP seit 2020, siebenmal in Folge. Arbeitet an der Grenze zwischen Konfiguration und Entwicklung, von Information Architecture bis zu Agents."
        : "Microsoft MVP since 2020, seven years running. Works on the line between configuration and code, from information architecture to agents.",
    sameAs,
    knowsAbout: [...knowsAbout],
    awards,
  };
}
