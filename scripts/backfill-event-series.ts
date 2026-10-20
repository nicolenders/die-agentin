/**
 * Bestehende Einsätze zu Veranstaltungen zusammenfassen (Phase „Veranstaltungen").
 *
 * Die Migration `20260914120000_event_series` legt nur die Tabellen an. Die
 * Zuordnung des Bestands passiert hier, weil sie die Namensregeln aus
 * `lib/events/naming.ts` braucht: Zwei Einsätze gehören zusammen, wenn ihre
 * Veranstaltungsnamen denselben Vergleichsschlüssel ergeben — Jahreszahlen,
 * Ordnungszahlen und Ausgabe-Zusätze zählen dabei nicht mit.
 *
 * Eigenschaften:
 *  - IDEMPOTENT: Einsätze, die schon eine Veranstaltung haben, bleiben unberührt;
 *    ein zweiter Lauf ändert nichts.
 *  - VORSICHTIG: Standardmäßig entstehen nur Veranstaltungen, bei denen Nicole
 *    mehr als einmal war — für einen einmaligen Auftritt braucht es keine
 *    Stammdaten. `--all` legt auch für Einzelauftritte eine an.
 *  - DRY-RUN: `--dry-run` zeigt nur, was passieren würde.
 *  - KEINE AUSGABEN: Der Zeitraum einer Veranstaltung lässt sich aus dem
 *    Einsatztag nicht ableiten (ein Vortragstag ist nicht die Konferenzwoche).
 *    Ausgaben trägt Nicole nach, wo sie sie kennt.
 *
 * Aufruf: npm run db:backfill-events -- [--dry-run] [--all]
 */
import { PrismaClient } from "@prisma/client";
import { eventDisplayName, eventMatchKey, eventSlugBase } from "../lib/events/naming";

const db = new PrismaClient();

interface Group {
  matchKey: string;
  name: string;
  websiteUrl: string | null;
  missionIds: string[];
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const all = process.argv.includes("--all");

  const missions = await db.mission.findMany({
    where: { eventSeriesId: null },
    orderBy: { startDate: "desc" },
    select: { id: true, eventName: true, eventUrl: true, startDate: true },
  });

  // Jüngster Einsatz zuerst: Er bestimmt Name und Adresse der Veranstaltung.
  const groups = new Map<string, Group>();
  for (const mission of missions) {
    const matchKey = eventMatchKey(mission.eventName);
    if (!matchKey) continue; // Name ohne verwertbaren Kern — nichts zu clustern
    const group = groups.get(matchKey);
    if (group) {
      group.missionIds.push(mission.id);
      group.websiteUrl ??= mission.eventUrl;
    } else {
      groups.set(matchKey, {
        matchKey,
        name: eventDisplayName(mission.eventName),
        websiteUrl: mission.eventUrl,
        missionIds: [mission.id],
      });
    }
  }

  let created = 0;
  let reused = 0;
  let linked = 0;
  let skipped = 0;

  for (const group of groups.values()) {
    if (group.missionIds.length < 2 && !all) {
      skipped += group.missionIds.length;
      continue;
    }
    const existing = await db.eventSeries.findUnique({
      where: { matchKey: group.matchKey },
      select: { id: true },
    });

    console.log(
      `${existing ? "→ vorhanden" : "+ neu"}  ${group.name} (${group.missionIds.length} Einsätze)`,
    );
    if (dryRun) {
      if (existing) reused += 1;
      else created += 1;
      linked += group.missionIds.length;
      continue;
    }

    let seriesId = existing?.id;
    if (seriesId) {
      reused += 1;
    } else {
      const series = await db.eventSeries.create({
        data: {
          name: group.name,
          matchKey: group.matchKey,
          slug: await freeSlug(group.name),
          websiteUrl: group.websiteUrl,
        },
        select: { id: true },
      });
      seriesId = series.id;
      created += 1;
    }

    const result = await db.mission.updateMany({
      where: { id: { in: group.missionIds }, eventSeriesId: null },
      data: { eventSeriesId: seriesId },
    });
    linked += result.count;
  }

  console.log(
    `\n${dryRun ? "[Probelauf] " : ""}${created} Veranstaltungen angelegt, ${reused} vorhandene genutzt, ` +
      `${linked} Einsätze zugeordnet, ${skipped} Einzelauftritte übersprungen ` +
      `(mit --all würden auch sie eine Veranstaltung bekommen).`,
  );
}

async function freeSlug(name: string): Promise<string> {
  const base = eventSlugBase(name);
  let candidate = base;
  let n = 1;
  while (await db.eventSeries.findUnique({ where: { slug: candidate }, select: { id: true } })) {
    n += 1;
    candidate = `${base}-${n}`;
  }
  return candidate;
}

main()
  .catch((error) => {
    console.error("Backfill fehlgeschlagen:", error);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
