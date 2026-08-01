"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { invalidateTags, tags } from "@/lib/cache";

// Verwaltung des Vortragsrepertoires (SPEC §6/M6). Kategorien sind vom Nutzer
// pflegbar. Formulare nutzen FormData-Server-Actions (ohne JS bedienbar).

export async function createTalkCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return;
  await db.taxonomy.create({
    data: { kind: "TALK", nameDe: name, nameEn: name, slug: slugify(name) },
  });
  invalidateTags([tags.briefingList("de"), tags.briefingList("en")]);
  revalidatePath("/admin/briefings");
}

export async function renameTalkCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const nameDe = String(formData.get("nameDe") ?? "").trim();
  const nameEn = String(formData.get("nameEn") ?? "").trim() || nameDe;
  if (!id || !nameDe) return;
  await db.taxonomy.update({ where: { id }, data: { nameDe, nameEn } });
  invalidateTags([tags.briefingList("de"), tags.briefingList("en")]);
  revalidatePath("/admin/briefings");
}

export async function createTalk(formData: FormData): Promise<void> {
  await requireAdmin();
  const deTitle = String(formData.get("deTitle") ?? "").trim();
  const enTitle = String(formData.get("enTitle") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "");
  const level = String(formData.get("level") ?? "").trim() || null;
  const durationRaw = String(formData.get("durationMin") ?? "").trim();
  const durationMin = durationRaw ? Number(durationRaw) : null;
  if (!deTitle || !categoryId) return;

  await db.talk.create({
    data: {
      categoryId,
      level,
      durationMin: Number.isFinite(durationMin) ? durationMin : null,
      translations: {
        create: [
          { locale: "de", title: deTitle },
          ...(enTitle ? [{ locale: "en" as const, title: enTitle }] : []),
        ],
      },
    },
  });
  invalidateTags([tags.briefingList("de"), tags.briefingList("en")]);
  revalidatePath("/admin/briefings");
}
