"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { invalidateTags, tags } from "@/lib/cache";

// Verwaltung des Vortragsrepertoires (SPEC §6/M6). Kategorien und Briefings sind
// vom Nutzer pflegbar (anlegen, bearbeiten, löschen). Formulare nutzen
// FormData-Server-Actions (ohne JS bedienbar) und geben sichtbares Feedback.

const LIST = "/admin/briefings";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
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
  const inUse = await db.talk.count({ where: { categoryId: id } });
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

// --------------------------------------------------------------- Briefings

export async function createTalk(formData: FormData): Promise<void> {
  await requireAdmin();
  const deTitle = str(formData, "deTitle");
  const enTitle = str(formData, "enTitle");
  const categoryId = str(formData, "categoryId");
  const level = str(formData, "level") || null;
  const durationRaw = str(formData, "durationMin");
  const durationMin = durationRaw ? Number(durationRaw) : null;
  if (!deTitle || !categoryId) redirect(`${LIST}?err=missing-fields`);

  let failed = false;
  try {
    await db.talk.create({
      data: {
        categoryId,
        level,
        durationMin: durationMin !== null && Number.isFinite(durationMin) ? durationMin : null,
        translations: {
          create: [
            { locale: "de", title: deTitle },
            ...(enTitle ? [{ locale: "en" as const, title: enTitle }] : []),
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
  const categoryId = str(formData, "categoryId");
  if (!deTitle || !categoryId) redirect(`${LIST}/bearbeiten?id=${id}&err=missing-fields`);
  const enTitle = str(formData, "enTitle");
  const level = str(formData, "level") || null;
  const durationRaw = str(formData, "durationMin");
  const durationMin = durationRaw ? Number(durationRaw) : null;
  const active = formData.get("active") != null;

  let failed = false;
  try {
    await db.talk.update({
      where: { id },
      data: {
        categoryId,
        level,
        durationMin: durationMin !== null && Number.isFinite(durationMin) ? durationMin : null,
        active,
        translations: {
          upsert: {
            where: { talkId_locale: { talkId: id, locale: "de" } },
            create: { locale: "de", title: deTitle },
            update: { title: deTitle },
          },
        },
      },
    });
    if (enTitle) {
      await db.talkTranslation.upsert({
        where: { talkId_locale: { talkId: id, locale: "en" } },
        create: { talkId: id, locale: "en", title: enTitle },
        update: { title: enTitle },
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
