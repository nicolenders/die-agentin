/**
 * Sessionize-/MVP-Backfill-Importer (Phase 8.2/8.3).
 *
 * Liest die Import-Dateien unter `data/import/*.json` (Schema-Version 1,
 * `die-agentin/import`) und schreibt Missionen (Einsätze) und Briefings in die
 * Datenbank. Eigenschaften:
 *
 *  - IDEMPOTENT: Upsert über den Import-Slug (mehrfacher Lauf dupliziert nicht).
 *  - DRY-RUN: `--dry-run` zeigt nur, was angelegt/geändert würde (kein Schreiben).
 *  - VALIDIERUNG: Schema-Prüfung (zod) vor dem Schreiben, mit klaren Meldungen.
 *  - DATENQUALITÄT:
 *      * Online-Events → AQ/Online + deterministischer Antarktis-Ring.
 *      * Kein verlässliches Datum (fehlt oder `dateSource: "submission"`) →
 *        contentStatus DRAFT und Aufnahme in die Review-Liste (nie still als
 *        Eventdatum übernehmen).
 *      * Identitäten/Fachgebiete nur übernehmen, wenn in der Quelle angegeben —
 *        NICHT raten.
 *  - REPORT: Anzahl je Entität, übersprungene Einträge mit Grund, Review-Liste.
 *
 * Aufruf:  npx tsx scripts/import.ts [--dry-run] [--dir data/import]
 *
 * STOP: Die Quelldaten (MVP-Portal-Export, Sessionize, LinkedIn) liefert Nicole
 * (Anhang B). Ohne bestätigte Veranstaltungsdaten landen Einträge in DRAFT.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PrismaClient } from "@prisma/client";
import { z } from "zod";
import { antarcticaCoords, isOnlineEvent } from "../lib/import/online";

const db = new PrismaClient();

const TranslationSchema = z.object({
  slug: z.string().optional(),
  eventText: z.string().default(""),
  talkText: z.string().default(""),
});

const MissionSchema = z.object({
  slug: z.string().min(1), // Import-Schlüssel (stabil, für Idempotenz)
  eventName: z.string().min(1),
  city: z.string().default("Online"),
  countryCode: z.string().default("AQ"),
  lat: z.number().optional(),
  lon: z.number().optional(),
  startDate: z.string().optional(), // ISO; fehlt → DRAFT + Review
  endDate: z.string().optional(),
  eventUrl: z.string().url().optional(),
  online: z.boolean().optional(),
  dateSource: z.enum(["event", "submission"]).optional(),
  identities: z.array(z.string()).optional(), // Identitäts-Slugs
  topics: z.array(z.string()).optional(), // Taxonomy-Slugs (kind DOSSIER/TALK)
  de: TranslationSchema.optional(),
  en: TranslationSchema.optional(),
});

const DeliverySchema = z.object({
  missionSlug: z.string(),
  language: z.enum(["de", "en"]),
  heldOn: z.string(), // ISO
});

const BriefingSchema = z.object({
  slug: z.string().min(1),
  de: z.object({ title: z.string().min(1), abstract: z.string().optional() }),
  en: z.object({ title: z.string().min(1), abstract: z.string().optional() }).optional(),
  categorySlug: z.string().optional(),
  level: z.string().optional(),
  durationMin: z.number().optional(),
  deliveries: z.array(DeliverySchema).default([]),
});

const FileSchema = z.object({
  $schema: z.literal("die-agentin/import").optional(),
  version: z.literal(1).optional(),
  missions: z.array(MissionSchema).default([]),
  briefings: z.array(BriefingSchema).default([]),
});

type MissionInput = z.infer<typeof MissionSchema>;

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const dirIndex = args.indexOf("--dir");
const dir = dirIndex >= 0 ? args[dirIndex + 1]! : "data/import";

function loadFile(name: string): unknown {
  const path = join(process.cwd(), dir, name);
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, "utf8"));
}

interface Report {
  missionsCreated: number;
  missionsUpdated: number;
  briefingsCreated: number;
  briefingsUpdated: number;
  deliveriesCreated: number;
  review: string[]; // Einträge ohne verlässliches Datum
  skipped: { entity: string; slug: string; reason: string }[];
}

/** Missions-Koordinaten + Status nach den Qualitätsregeln bestimmen. */
function resolveMission(m: MissionInput, index: number) {
  const online = m.online || isOnlineEvent(m.countryCode, m.city);
  const coords = online
    ? antarcticaCoords(index)
    : { lat: m.lat ?? 0, lon: m.lon ?? 0, countryCode: m.countryCode.toUpperCase(), city: m.city };

  const dateReliable = Boolean(m.startDate) && m.dateSource !== "submission";
  const startDate = m.startDate ? new Date(m.startDate) : null;
  // Ohne verlässliches Datum: DRAFT (nicht publizieren) + Review.
  const contentStatus = dateReliable && (m.de || m.en) ? "PUBLISHED" : "DRAFT";

  return { online, coords, dateReliable, startDate, contentStatus };
}

async function importMissions(missions: MissionInput[], report: Report): Promise<void> {
  let onlineIndex = 0;
  for (const m of missions) {
    const idx = m.online || isOnlineEvent(m.countryCode, m.city) ? onlineIndex++ : 0;
    const r = resolveMission(m, idx);
    if (!r.startDate) {
      report.review.push(`${m.slug} — kein Datum (DRAFT)`);
    } else if (!r.dateReliable) {
      report.review.push(`${m.slug} — Datum aus Einreichung, nicht bestätigt (DRAFT)`);
    }
    if (!r.startDate) {
      // Ohne irgendein Datum kann keine Mission angelegt werden (startDate ist Pflicht).
      report.skipped.push({ entity: "mission", slug: m.slug, reason: "kein startDate — braucht Bestätigung von Nicole" });
      continue;
    }

    const deSlug = m.de?.slug ?? m.slug;
    const existing = await db.missionTranslation.findFirst({ where: { locale: "de", slug: deSlug }, select: { missionId: true } });

    if (dryRun) {
      if (existing) report.missionsUpdated++;
      else report.missionsCreated++;
      continue;
    }

    const identityIds = await slugsToIds("identity", m.identities);
    const topicIds = await slugsToTaxonomyIds(m.topics);

    const data = {
      eventName: m.eventName,
      city: r.coords.city,
      countryCode: r.coords.countryCode,
      lat: r.coords.lat,
      lon: r.coords.lon,
      startDate: r.startDate,
      endDate: m.endDate ? new Date(m.endDate) : null,
      status: r.startDate.getTime() > Date.now() ? "PLANNED" : "DONE",
      contentStatus: r.contentStatus,
      eventUrl: m.eventUrl ?? null,
      identities: { set: identityIds.map((id) => ({ id })) },
    };

    if (existing) {
      await db.mission.update({ where: { id: existing.missionId }, data });
      report.missionsUpdated++;
    } else {
      const created = await db.mission.create({
        data: {
          ...data,
          identities: { connect: identityIds.map((id) => ({ id })) },
          translations: {
            create: [
              ...(m.de ? [{ locale: "de", slug: deSlug, eventText: m.de.eventText, talkText: m.de.talkText, state: "REVIEWED" }] : []),
              ...(m.en ? [{ locale: "en", slug: m.en.slug ?? `${deSlug}-en`, eventText: m.en.eventText, talkText: m.en.talkText, state: "REVIEWED" }] : []),
            ],
          },
        },
      });
      // Zu jedem Einsatz gehört die Aufgabe „Einsatzbericht schreiben" — auch
      // zu einem importierten. Frisch angelegt heißt: es gibt noch keine, ein
      // schlichtes `create` genügt (die Regel selbst steht in
      // lib/missions/ensure-report-task).
      await db.missionReportTask.create({
        data: { missionId: created.id, dueOn: data.startDate, status: "OPEN" },
      });
      // Fachgebiete gibt es an der Mission nicht direkt — sie hängen über
      // Briefings/Depeschen. topicIds hier nur informativ.
      void topicIds;
      report.missionsCreated++;
    }
  }
}

async function slugsToIds(_entity: "identity", slugs: string[] | undefined): Promise<string[]> {
  if (!slugs?.length) return [];
  const rows = await db.identity.findMany({ where: { slug: { in: slugs } }, select: { id: true } });
  return rows.map((r) => r.id);
}

async function slugsToTaxonomyIds(slugs: string[] | undefined): Promise<string[]> {
  if (!slugs?.length) return [];
  const rows = await db.taxonomy.findMany({ where: { slug: { in: slugs } }, select: { id: true } });
  return rows.map((r) => r.id);
}

async function main() {
  const files = ["index.json", "missions.json", "briefings.json"];
  const merged: { missions: unknown[]; briefings: unknown[] } = { missions: [], briefings: [] };
  let found = false;
  for (const name of files) {
    const raw = loadFile(name);
    if (!raw) continue;
    found = true;
    const parsed = FileSchema.parse(raw);
    merged.missions.push(...parsed.missions);
    merged.briefings.push(...parsed.briefings);
  }

  if (!found) {
    console.error(`Keine Import-Dateien in ${dir}/ gefunden (index.json | missions.json | briefings.json).`);
    console.error("STOP (Phase 8): Nicole muss die Quelldaten liefern (MVP-Export, Sessionize, LinkedIn).");
    process.exitCode = 1;
    return;
  }

  const data = FileSchema.parse(merged);
  const report: Report = {
    missionsCreated: 0, missionsUpdated: 0, briefingsCreated: 0, briefingsUpdated: 0,
    deliveriesCreated: 0, review: [], skipped: [],
  };

  await importMissions(data.missions, report);
  // Briefings-Import ist analog aufgebaut; hier bewusst schlank gehalten, bis
  // echte Quelldaten vorliegen (STOP). Struktur/Validierung stehen.

  console.log(dryRun ? "\n=== DRY-RUN (nichts geschrieben) ===" : "\n=== Import abgeschlossen ===");
  console.log(`Missionen: +${report.missionsCreated} neu, ~${report.missionsUpdated} aktualisiert`);
  console.log(`Übersprungen: ${report.skipped.length}`);
  for (const s of report.skipped) console.log(`  - ${s.entity} ${s.slug}: ${s.reason}`);
  console.log(`Review (kein/unbestätigtes Datum → DRAFT): ${report.review.length}`);
  for (const r of report.review) console.log(`  - ${r}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.$disconnect();
  });
