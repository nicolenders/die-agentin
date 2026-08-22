"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags } from "@/lib/cache";
import { RESUME_TAG } from "@/lib/queries/resume";
import { RESUME_PROFILE_SEED, RESUME_ENTRIES_SEED } from "@/lib/resume-seed";
import { SKILL_LEVELS, isOneOf } from "@/lib/domain";
import { computeSkillYears } from "@/lib/resume/skills";

const PAGE = "/admin/lebenslauf";
const SECTIONS = new Set(["CAREER", "EDUCATION", "SKILL", "PROJECT"]);

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
    redirect(`${PAGE}?err=failed`);
  }
  invalidate();
  redirect(`${PAGE}?ok=profile`);
}

export async function createResumeEntry(formData: FormData): Promise<void> {
  await requireAdmin();
  const section = str(formData, "section");
  const title = str(formData, "title");
  if (!SECTIONS.has(section) || !title) redirect(`${PAGE}?err=missing-fields`);
  const sortRaw = Number(formData.get("sortOrder") ?? 0);
  try {
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
        sortOrder: Number.isFinite(sortRaw) ? Math.trunc(sortRaw) : 0,
        ...sectionFields(formData, section),
      },
    });
  } catch {
    redirect(`${PAGE}?err=failed`);
  }
  invalidate();
  redirect(`${PAGE}?ok=added#${section}`);
}

export async function updateResumeEntry(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${PAGE}?err=not-found`);
  const section = str(formData, "section");
  const sortRaw = Number(formData.get("sortOrder") ?? 0);
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
        sortOrder: Number.isFinite(sortRaw) ? Math.trunc(sortRaw) : 0,
        ...sectionFields(formData, section),
      },
    });
  } catch {
    redirect(`${PAGE}?err=failed`);
  }
  invalidate();
  redirect(`${PAGE}?ok=saved#${section}`);
}

export async function deleteResumeEntry(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  try {
    await db.resumeEntry.delete({ where: { id } });
  } catch {
    // bereits entfernt
  }
  invalidate();
  redirect(`${PAGE}?ok=deleted#${str(formData, "section")}`);
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
    redirect(`${PAGE}?err=failed`);
  }
  invalidate();
  redirect(`${PAGE}?ok=seeded`);
}
