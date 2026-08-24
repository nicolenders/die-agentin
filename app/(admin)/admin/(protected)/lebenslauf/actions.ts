"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags } from "@/lib/cache";
import { RESUME_TAG } from "@/lib/queries/resume";
import { RESUME_PROFILE_SEED, RESUME_ENTRIES_SEED } from "@/lib/resume-seed";
import { SKILL_LEVELS, isOneOf } from "@/lib/domain";
import { computeSkillYears } from "@/lib/resume/skills";
import { RESUME_TAB_FOR_SECTION, isResumeSection } from "@/lib/resume/sections";
import { inDisplayOrder } from "@/lib/resume/order";

const PAGE = "/admin/lebenslauf";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function tagsJson(raw: string): string | null {
  const list = raw
    .split(/[\n,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  return list.length ? JSON.stringify(list) : null;
}
function invalidate(): void {
  invalidateTags([RESUME_TAG]);
}

function num(formData: FormData, key: string): number | null {
  const parsed = Number.parseInt(String(formData.get(key) ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

/**
 * Zurück zur Maske — und zwar auf das Register, von dem die Eingabe kam. Ohne
 * das landet Nicole nach jedem Speichern wieder auf „Zur Person" und muss sich
 * durchklicken.
 */
function back(tab: string, result: { ok?: string; err?: string }): never {
  const params = new URLSearchParams({ tab });
  if (result.ok) params.set("ok", result.ok);
  if (result.err) params.set("err", result.err);
  redirect(`${PAGE}?${params.toString()}`);
}

function tabFor(section: string): string {
  return isResumeSection(section) ? RESUME_TAB_FOR_SECTION[section] : "person";
}

/**
 * Die Felder, die nur eine Rubrik betreffen. Sie werden für JEDE Rubrik
 * geschrieben — was nicht im Formular stand, kommt als leer zurück und
 * überschreibt einen alten Wert bewusst, statt Reste stehen zu lassen.
 *
 * Jahre bei Fähigkeiten: Lässt sich der Zeitraum lesen, gilt die Rechnung;
 * sonst die Eingabe. So bleibt „seit 03/2018" ohne Nachpflege richtig.
 */
function sectionFields(formData: FormData, section: string) {
  const periodFrom = str(formData, "periodFrom") || null;
  const periodTo = str(formData, "periodTo") || null;
  if (section === "PROJECT") {
    return {
      projectFrom: str(formData, "projectFrom") || null,
      projectTo: str(formData, "projectTo") || null,
      personDays: num(formData, "personDays"),
      clientAnonymous: formData.get("clientAnonymous") === "on",
      clientSector: str(formData, "clientSector") || null,
      skillYears: null,
      skillLevel: null,
    };
  }
  if (section === "SKILL") {
    const level = str(formData, "skillLevel");
    return {
      projectFrom: null,
      projectTo: null,
      personDays: null,
      clientAnonymous: false,
      clientSector: null,
      skillYears: computeSkillYears(periodFrom, periodTo) ?? num(formData, "skillYears"),
      skillLevel: isOneOf(SKILL_LEVELS, level) ? level : null,
    };
  }
  return {
    projectFrom: null,
    projectTo: null,
    personDays: null,
    clientAnonymous: false,
    clientSector: null,
    skillYears: null,
    skillLevel: null,
  };
}

export async function saveResumeProfile(formData: FormData): Promise<void> {
  await requireAdmin();
  const data = {
    headline: str(formData, "headline"),
    summary: str(formData, "summary"),
    location: str(formData, "location"),
  };
  try {
    await db.resumeProfile.upsert({
      where: { id: "default" },
      create: { id: "default", ...data },
      update: data,
    });
  } catch {
    back("person", { err: "failed" });
  }
  invalidate();
  back("person", { ok: "saved" });
}

/**
 * Das Bewerbungsfoto. Leer heißt: den Lebenslauf mit dem Porträt der Legende
 * ausgeben. Ein Bild hier ändert die Legende nicht — es ist ein zweites Bild,
 * kein anderes.
 */
export async function saveResumePortrait(formData: FormData): Promise<void> {
  await requireAdmin();
  const portraitAssetId = str(formData, "portraitAssetId") || null;
  try {
    await db.resumeProfile.upsert({
      where: { id: "default" },
      create: { id: "default", portraitAssetId },
      update: { portraitAssetId },
    });
  } catch {
    back("bild", { err: "failed" });
  }
  invalidate();
  back("bild", { ok: "saved" });
}

export async function createResumeEntry(formData: FormData): Promise<void> {
  await requireAdmin();
  const section = str(formData, "section");
  const title = str(formData, "title");
  const tab = tabFor(section);
  if (!isResumeSection(section) || !title) back(tab, { err: "missing-fields" });
  try {
    // Neue Einträge hinten anstellen: Die Reihenfolge stellt Nicole in der
    // Tabelle mit den Pfeilen ein, nicht über ein Zahlenfeld im Formular.
    const last = await db.resumeEntry.findFirst({
      where: { section },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    await db.resumeEntry.create({
      data: {
        section,
        title,
        subtitle: str(formData, "subtitle") || null,
        location: str(formData, "location") || null,
        periodFrom: str(formData, "periodFrom") || null,
        periodTo: str(formData, "periodTo") || null,
        description: str(formData, "description") || null,
        tags: tagsJson(str(formData, "tags")),
        sortOrder: (last?.sortOrder ?? -1) + 1,
        ...sectionFields(formData, section),
      },
    });
  } catch {
    back(tab, { err: "failed" });
  }
  invalidate();
  back(tab, { ok: "created" });
}

export async function updateResumeEntry(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const section = str(formData, "section");
  const tab = tabFor(section);
  if (!id) back(tab, { err: "not-found" });
  try {
    await db.resumeEntry.update({
      where: { id },
      data: {
        title: str(formData, "title"),
        subtitle: str(formData, "subtitle") || null,
        location: str(formData, "location") || null,
        periodFrom: str(formData, "periodFrom") || null,
        periodTo: str(formData, "periodTo") || null,
        description: str(formData, "description") || null,
        tags: tagsJson(str(formData, "tags")),
        ...sectionFields(formData, section),
      },
    });
  } catch {
    back(tab, { err: "failed" });
  }
  invalidate();
  back(tab, { ok: "saved" });
}

export async function deleteResumeEntry(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const tab = tabFor(str(formData, "section"));
  try {
    await db.resumeEntry.delete({ where: { id } });
  } catch {
    // bereits entfernt
  }
  invalidate();
  back(tab, { ok: "deleted" });
}

/**
 * Einen Eintrag innerhalb seiner Rubrik um eine Position verschieben. Die
 * Werte der Rubrik werden dabei auf fortlaufende Indizes normalisiert und die
 * Nachbarn getauscht — so ist die Reihenfolge deterministisch, auch wenn
 * bisher alles auf sortOrder = 0 stand.
 *
 * Getauscht werden die Nachbarn in der ANGEZEIGTEN Reihenfolge. Bei Werdegang
 * und Projekten sortiert der Zeitraum; dort bewegen die Pfeile nur die
 * Einträge ohne lesbares Datum, die hinten stehen. Würde hier nach sortOrder
 * getauscht, verschöbe der Pfeil einen anderen Eintrag als den, neben dem er
 * steht.
 */
export async function reorderResumeEntry(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const dir = str(formData, "dir"); // "up" | "down"
  const section = str(formData, "section");
  const tab = tabFor(section);
  if (!id || !isResumeSection(section)) back(tab, { err: "not-found" });

  try {
    const stored = await db.resumeEntry.findMany({
      where: { section },
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, periodFrom: true, periodTo: true },
    });
    const group = inDisplayOrder(section, stored);
    const index = group.findIndex((g) => g.id === id);
    const swapWith = dir === "down" ? index + 1 : index - 1;
    const order = group.map((g) => g.id);
    const a = order[index];
    const b = order[swapWith];
    if (a !== undefined && b !== undefined) {
      order[index] = b;
      order[swapWith] = a;
      await db.$transaction(
        order.map((gid, i) => db.resumeEntry.update({ where: { id: gid }, data: { sortOrder: i } })),
      );
    }
  } catch {
    back(tab, { err: "failed" });
  }
  invalidate();
  back(tab, { ok: "reordered" });
}

/** Übernimmt die extrahierten Vorlagedaten — nur, wenn noch nichts erfasst ist. */
export async function seedResume(): Promise<void> {
  await requireAdmin();
  try {
    const count = await db.resumeEntry.count();
    if (count === 0) {
      await db.resumeProfile.upsert({
        where: { id: "default" },
        create: { id: "default", ...RESUME_PROFILE_SEED },
        update: RESUME_PROFILE_SEED,
      });
      for (let i = 0; i < RESUME_ENTRIES_SEED.length; i++) {
        const e = RESUME_ENTRIES_SEED[i]!;
        await db.resumeEntry.create({
          data: {
            section: e.section,
            title: e.title,
            subtitle: e.subtitle ?? null,
            location: e.location ?? null,
            periodFrom: e.periodFrom ?? null,
            periodTo: e.periodTo ?? null,
            description: e.description ?? null,
            tags: e.tags && e.tags.length ? JSON.stringify(e.tags) : null,
            sortOrder: i,
          },
        });
      }
    }
  } catch {
    back("person", { err: "failed" });
  }
  invalidate();
  back("person", { ok: "seeded" });
}
