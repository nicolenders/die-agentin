"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { invalidateTags, tags } from "@/lib/cache";

// Verwaltung der „strukturgebenden" Daten: Kategorien (für Dossiers und
// Zertifizierungen), Schlagworte und Weiterleitungen. Briefing-Kategorien
// werden weiterhin direkt unter „Briefings" gepflegt.

const LIST = "/admin/struktur";
const CATEGORY_KINDS = ["DOSSIER", "CERTIFICATION"] as const;
type CategoryKind = (typeof CATEGORY_KINDS)[number];

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function asKind(value: string): CategoryKind | null {
  return (CATEGORY_KINDS as readonly string[]).includes(value) ? (value as CategoryKind) : null;
}

async function categoryInUse(kind: CategoryKind, id: string): Promise<boolean> {
  if (kind === "DOSSIER") return (await db.dossier.count({ where: { categories: { some: { id } } } })) > 0;
  return (await db.certification.count({ where: { categories: { some: { id } } } })) > 0;
}

// ------------------------------------------------------------- Kategorien

export async function createCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const kind = asKind(str(formData, "kind"));
  const name = str(formData, "name");
  if (!kind || !name) redirect(`${LIST}?err=missing-fields`);

  let failed = false;
  try {
    await db.taxonomy.create({ data: { kind, nameDe: name, nameEn: name, slug: slugify(name) } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidateTags([tags.dossierList("de"), tags.dossierList("en")]);
  redirect(`${LIST}?ok=created`);
}

export async function renameCategory(formData: FormData): Promise<void> {
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
  invalidateTags([tags.dossierList("de"), tags.dossierList("en")]);
  redirect(`${LIST}?ok=updated`);
}

export async function deleteCategory(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const kind = asKind(str(formData, "kind"));
  if (!id || !kind) redirect(`${LIST}?err=not-found`);
  if (await categoryInUse(kind, id)) redirect(`${LIST}?err=category-in-use`);

  let failed = false;
  try {
    await db.taxonomy.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  redirect(`${LIST}?ok=deleted`);
}

// -------------------------------------------------------------- Schlagworte

export async function createTag(formData: FormData): Promise<void> {
  await requireAdmin();
  const nameDe = str(formData, "nameDe");
  const nameEn = str(formData, "nameEn") || nameDe;
  if (!nameDe) redirect(`${LIST}?err=missing-fields`);

  let failed = false;
  try {
    await db.tag.create({ data: { nameDe, nameEn, slug: slugify(nameDe) } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  redirect(`${LIST}?ok=created`);
}

export async function renameTag(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const nameDe = str(formData, "nameDe");
  const nameEn = str(formData, "nameEn") || nameDe;
  if (!id || !nameDe) redirect(`${LIST}?err=missing-fields`);

  let failed = false;
  try {
    await db.tag.update({ where: { id }, data: { nameDe, nameEn } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  redirect(`${LIST}?ok=updated`);
}

export async function deleteTag(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);

  let failed = false;
  try {
    // Verknüpfungen zu Beiträgen (PostTag) hängen per Kaskade dran.
    await db.tag.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  redirect(`${LIST}?ok=deleted`);
}

// ------------------------------------------------------------ Weiterleitungen

export async function createRedirect(formData: FormData): Promise<void> {
  await requireAdmin();
  const locale = str(formData, "locale") === "en" ? "en" : "de";
  const fromSlug = str(formData, "fromSlug").replace(/^\/+/, "");
  const toSlug = str(formData, "toSlug").replace(/^\/+/, "");
  const entity = str(formData, "entity") || "post";
  if (!fromSlug || !toSlug) redirect(`${LIST}?err=missing-fields`);

  let failed = false;
  try {
    await db.redirect.create({ data: { locale, fromSlug, toSlug, entity } });
    // Die Detailseiten lesen die Weiterleitungen gecacht — ohne diese Zeile
    // griffe eine frisch angelegte Weiterleitung bis zu einer Stunde nicht.
    invalidateTags([tags.redirects()]);
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  redirect(`${LIST}?ok=created`);
}

export async function deleteRedirect(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);

  let failed = false;
  try {
    await db.redirect.delete({ where: { id } });
    invalidateTags([tags.redirects()]);
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  redirect(`${LIST}?ok=deleted`);
}
