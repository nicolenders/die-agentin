"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { invalidateTags, tags } from "@/lib/cache";
import { serializeRichValue } from "@/lib/content/rich";

// Verwaltung des Vortragsrepertoires (SPEC §6/M6). Kategorien und Briefings sind
// vom Nutzer pflegbar (anlegen, bearbeiten, löschen). Formulare nutzen
// FormData-Server-Actions (ohne JS bedienbar) und geben sichtbares Feedback.

const LIST = "/admin/briefings";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Mehrfachauswahl der Kategorien; `categoryId` bleibt = erste Auswahl.
function ids(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((v) => String(v)).filter(Boolean);
}

function invalidate(): void {
  invalidateTags([tags.briefingList("de"), tags.briefingList("en")]);
}

// -------------------------------------------------------------- Kategorien

export async function createTalkCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = str(formData, "name");
  if (!name) redirect(`${LIST}?err=missing-fields`);
  let failed = false;
  try {
    await db.taxonomy.create({ data: { kind: "TALK", nameDe: name, nameEn: name, slug: slugify(name) } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidate();
  redirect(`${LIST}?ok=created`);
}

export async function renameTalkCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const nameDe = str(formData, "nameDe");
  const nameEn = str(formData, "nameEn") || nameDe;
  if (!id || !nameDe) redirect(`${LIST}?err=missing-fields`);
  let failed = false;
  try {
    await db.taxonomy.update({ where: { id }, data: { nameDe, nameEn } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidate();
  redirect(`${LIST}?ok=updated`);
}

export async function deleteTalkCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  // Eine Kategorie mit zugeordneten Briefings darf nicht gelöscht werden
  // (sonst verwaiste Vorträge). Erst umhängen oder Briefings löschen.
  const inUse = await db.talk.count({ where: { categories: { some: { id } } } });
  if (inUse > 0) redirect(`${LIST}?err=category-in-use`);
  let failed = false;
  try {
    await db.taxonomy.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidate();
  redirect(`${LIST}?ok=deleted`);
}

// -------------------------------------------------------------- Zielgruppen
// Wiederverwendbare Zielgruppen-Tags (Taxonomy kind "AUDIENCE"), analog zu den
// Kategorien: einmal anlegen, an beliebig vielen Briefings verwenden.

export async function createTalkAudience(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = str(formData, "name");
  if (!name) redirect(`${LIST}?err=missing-fields`);
  let failed = false;
  try {
    await db.taxonomy.create({ data: { kind: "AUDIENCE", nameDe: name, nameEn: name, slug: slugify(name) } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidate();
  redirect(`${LIST}?ok=created`);
}

export async function renameTalkAudience(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const nameDe = str(formData, "nameDe");
  const nameEn = str(formData, "nameEn") || nameDe;
  if (!id || !nameDe) redirect(`${LIST}?err=missing-fields`);
  let failed = false;
  try {
    await db.taxonomy.update({ where: { id }, data: { nameDe, nameEn } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidate();
  redirect(`${LIST}?ok=updated`);
}

export async function deleteTalkAudience(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  const inUse = await db.talk.count({ where: { audiences: { some: { id } } } });
  if (inUse > 0) redirect(`${LIST}?err=audience-in-use`);
  let failed = false;
  try {
    await db.taxonomy.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidate();
  redirect(`${LIST}?ok=deleted`);
}

// --------------------------------------------------------------- Briefings

export async function createTalk(formData: FormData): Promise<void> {
  await requireAdmin();
  const deTitle = str(formData, "deTitle");
  const enTitle = str(formData, "enTitle");
  const deAbstract = serializeRichValue(str(formData, "deAbstract"));
  const enAbstract = serializeRichValue(str(formData, "enAbstract"));
  const categoryIds = ids(formData, "categoryIds");
  const audienceIds = ids(formData, "audienceIds");
  const toolIds = ids(formData, "toolIds");
  const level = str(formData, "level") || null;
  const durationRaw = str(formData, "durationMin");
  const durationMin = durationRaw ? Number(durationRaw) : null;
  if (!deTitle || categoryIds.length === 0) redirect(`${LIST}?err=missing-fields`);

  let failed = false;
  try {
    await db.talk.create({
      data: {
        categoryId: categoryIds[0]!,
        categories: { connect: categoryIds.map((id) => ({ id })) },
        audiences: { connect: audienceIds.map((id) => ({ id })) },
        tools: { connect: toolIds.map((id) => ({ id })) },
        level,
        durationMin: durationMin !== null && Number.isFinite(durationMin) ? durationMin : null,
        translations: {
          create: [
            { locale: "de", title: deTitle, abstract: deAbstract || null },
            ...(enTitle
              ? [{ locale: "en" as const, title: enTitle, abstract: enAbstract || null }]
              : []),
          ],
        },
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidate();
  redirect(`${LIST}?ok=created`);
}

export async function updateTalk(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  const deTitle = str(formData, "deTitle");
  const categoryIds = ids(formData, "categoryIds");
  if (!deTitle || categoryIds.length === 0) redirect(`${LIST}/bearbeiten?id=${id}&err=missing-fields`);
  const enTitle = str(formData, "enTitle");
  const deAbstract = serializeRichValue(str(formData, "deAbstract"));
  const enAbstract = serializeRichValue(str(formData, "enAbstract"));
  const audienceIds = ids(formData, "audienceIds");
  const toolIds = ids(formData, "toolIds");
  const level = str(formData, "level") || null;
  const durationRaw = str(formData, "durationMin");
  const durationMin = durationRaw ? Number(durationRaw) : null;
  const active = formData.get("active") != null;

  let failed = false;
  try {
    await db.talk.update({
      where: { id },
      data: {
        categoryId: categoryIds[0]!,
        categories: { set: categoryIds.map((id) => ({ id })) },
        audiences: { set: audienceIds.map((id) => ({ id })) },
        tools: { set: toolIds.map((id) => ({ id })) },
        level,
        durationMin: durationMin !== null && Number.isFinite(durationMin) ? durationMin : null,
        active,
        translations: {
          upsert: {
            where: { talkId_locale: { talkId: id, locale: "de" } },
            create: { locale: "de", title: deTitle, abstract: deAbstract || null },
            update: { title: deTitle, abstract: deAbstract || null },
          },
        },
      },
    });
    if (enTitle) {
      await db.talkTranslation.upsert({
        where: { talkId_locale: { talkId: id, locale: "en" } },
        create: { talkId: id, locale: "en", title: enTitle, abstract: enAbstract || null },
        update: { title: enTitle, abstract: enAbstract || null },
      });
    } else {
      await db.talkTranslation.deleteMany({ where: { talkId: id, locale: "en" } });
    }
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}/bearbeiten?id=${id}&err=failed`);
  invalidate();
  redirect(`${LIST}?ok=updated`);
}

export interface QuickTalkInput {
  deTitle: string;
  enTitle?: string;
  categoryIds: string[];
  level?: string;
  durationMin?: number | null;
}

export interface QuickTalkResult {
  ok: boolean;
  id?: string;
  name?: string;
  error?: string;
}

/**
 * Legt ein Briefing „nebenbei" an und gibt es strukturiert zurück (id + Name),
 * damit die Einsatz-Maske es sofort auswählen kann, ohne neu zu laden oder die
 * bereits eingegebenen Daten zu verlieren. Wird direkt aus dem Client aufgerufen.
 */
export async function createTalkQuick(input: QuickTalkInput): Promise<QuickTalkResult> {
  try {
    await requireAdmin();
  } catch {
    return { ok: false, error: "Keine Berechtigung." };
  }
  const deTitle = input.deTitle.trim();
  const enTitle = input.enTitle?.trim() ?? "";
  const categoryIds = (input.categoryIds ?? []).filter(Boolean);
  if (!deTitle || categoryIds.length === 0) return { ok: false, error: "Titel und Kategorie sind Pflicht." };
  const durationMin =
    input.durationMin != null && Number.isFinite(input.durationMin) ? input.durationMin : null;

  try {
    const talk = await db.talk.create({
      data: {
        categoryId: categoryIds[0]!,
        categories: { connect: categoryIds.map((id) => ({ id })) },
        level: input.level?.trim() || null,
        durationMin,
        translations: {
          create: [
            { locale: "de", title: deTitle },
            ...(enTitle ? [{ locale: "en" as const, title: enTitle }] : []),
          ],
        },
      },
    });
    invalidate();
    return { ok: true, id: talk.id, name: deTitle };
  } catch {
    return { ok: false, error: "Briefing konnte nicht angelegt werden." };
  }
}

// Öffentliche Sichtbarkeit eines Briefings umschalten (steuert die Anzeige auf
// der Website). `active` ist das Sichtbarkeitsflag.
export async function toggleTalkVisibility(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  let failed = false;
  try {
    const current = await db.talk.findUnique({ where: { id }, select: { active: true } });
    if (current) await db.talk.update({ where: { id }, data: { active: !current.active } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidate();
  redirect(`${LIST}?ok=toggled`);
}

// Reihenfolge eines Briefings auf der öffentlichen Seite um eine Position ändern.
export async function reorderTalk(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const dir = str(formData, "dir");
  if (!id) redirect(`${LIST}?err=not-found`);
  try {
    const all = await db.talk.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      select: { id: true },
    });
    const index = all.findIndex((t) => t.id === id);
    const swapWith = dir === "down" ? index + 1 : index - 1;
    const order = all.map((t) => t.id);
    const a = order[index];
    const b = order[swapWith];
    if (a !== undefined && b !== undefined) {
      order[index] = b;
      order[swapWith] = a;
      await db.$transaction(order.map((tid, i) => db.talk.update({ where: { id: tid }, data: { sortOrder: i } })));
    }
  } catch {
    redirect(`${LIST}?err=failed`);
  }
  invalidate();
  redirect(`${LIST}?ok=reordered`);
}

export async function deleteTalk(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  let failed = false;
  try {
    // Übersetzungen und Vortragszählungen (TalkDelivery) hängen per Kaskade dran.
    await db.talk.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidate();
  redirect(`${LIST}?ok=deleted`);
}
