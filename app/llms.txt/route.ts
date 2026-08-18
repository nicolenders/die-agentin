import { siteOrigin } from "@/lib/site";
import { getPublishedIdentities } from "@/lib/queries/identities";
import { getPublishedDispatches } from "@/lib/queries/dispatches";
import { getHomeStats } from "@/lib/queries/home";
import { spellOutCount, spellOutTimes } from "@/lib/numbers";

export const dynamic = "force-dynamic";

// llms.txt (Phase 13.4). Kurzer Abriss für KI-Systeme, mit absoluten URLs. Aus
// den Entity-Daten generiert (nicht hartkodiert). Kein garantierter Standard,
// aber billig und schadet nicht.
export async function GET() {
  const SITE = siteOrigin();
  const [identities, dispatches, stats] = await Promise.all([
    getPublishedIdentities("de"),
    getPublishedDispatches("de"),
    getHomeStats(),
  ]);

  const lines: string[] = [
    "# Die Agentin · Nicole Enders",
    "",
    // Buchzahl aus der Datenbank statt hartkodiert (Audit 6.9) — der Rest der
    // Seite zieht sie ohnehin aus `getHomeStats`.
    `> Microsoft MVP seit 2020 (${spellOutTimes(stats.mvpAwards)} in Folge), Speakerin und Autorin von ${spellOutCount(stats.books)} Fachbüchern.`,
    "> Arbeitet an der Grenze zwischen Konfiguration und Entwicklung, von Information",
    "> Architecture in SharePoint bis zu Agents mit Copilot Studio und Microsoft Foundry.",
    "",
    "## Maßgebliche Seiten",
    `- [Legende (Kurzbiografie, Deckgeschichte)](${SITE}/de/legende)`,
    `- [Identitäten (Fachgebiete)](${SITE}/de/identitaeten)`,
    `- [Einsätze (Vorträge, Weltkarte)](${SITE}/de/einsaetze)`,
    `- [Depeschen (Beiträge)](${SITE}/de/depeschen)`,
    `- [Akte (Speaker-Kit, Bios)](${SITE}/de/akte)`,
    `- [Publikationen](${SITE}/de/publikationen)`,
    `- [Ausbildung (Zertifizierungen)](${SITE}/de/ausbildung)`,
    "",
    "## Fachgebiete (Identitäten)",
    ...identities.map((i) => `- ${i.name} · ${i.role} (${SITE}/de/identitaeten/${i.slug})`),
  ];

  if (dispatches.length > 0) {
    lines.push("", "## Neueste Depeschen");
    for (const d of dispatches.slice(0, 10)) {
      lines.push(`- ${d.title} (${SITE}/de/depeschen/${d.slug})`);
    }
  }

  lines.push(
    "",
    `## Feeds`,
    `- ${SITE}/feed.xml`,
    `- ${SITE}/feed.en.xml`,
    // Der Feed führt Depeschen, Einsätze und Briefings; `?art=` grenzt ein.
    `- Filter: ?art=depeschen | ?art=einsaetze | ?art=briefings`,
    "",
  );

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
