"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { invalidateTags, tags } from "@/lib/cache";

// Verwaltung der „strukturgebenden" Daten: Kategorien, Schlagworte und
// Weiterleitungen. Briefing-Kategorien werden weiterhin direkt unter
// „Briefings" gepflegt, Radar-Themen unter „Aufklärung".
//
// Zur Benennung: Die Art `DOSSIER` heißt in der Datenbank so, seit Signale und
// Dossiers zu Depeschen zusammengeführt wurden (Phase 3) aber sind es die
// Fachgebiete der Depeschen. Der gespeicherte Wert bleibt, weil ihn eine
// Umbenennung nur in eine Migration verwandeln würde, ohne dass jemand etwas
// davon hätte; sichtbar heißt er überall „Fachgebiete".

const LIST = "/admin/struktur";
const CATEGORY_KINDS = ["DOSSIER", "CERTIFICATION"] as const;
type CategoryKind = (typeof CATEGORY_KINDS)[number];

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

/** Fachgebiete erscheinen an Depeschen und an den Altbestands-Dossiers. */
function invalidateCategoryTags(): void {
  invalidateTags([
    tags.dispatchList("de"),
    tags.dispatchList("en"),
    tags.dossierList("de"),
    tags.dossierList("en"),
  ]);
}

function asKind(value: string): CategoryKind | null {
  return (CATEGORY_KINDS as readonly string[]).includes(value) ? (value as CategoryKind) : null;
}

async function categoryInUse(kind: CategoryKind, id: string): Promise<boolean> {
  if (kind === "DOSSIER") {
    // Die Art heißt in der Datenbank weiterhin DOSSIER; seit der
    // Zusammenführung von Signalen und Dossiers zu Depeschen (Phase 3) hängen
    // diese Kategorien aber an Depeschen. Beides wird gezählt: Altbestand an
    // Dossiers darf beim Löschen genauso wenig stillschweigend die Zuordnung
    // verlieren.
    const [dispatches, dossiers] = await Promise.all([
      db.dispatch.count({ where: { topics: { some: { id } } } }),
      db.dossier.count({ where: { categories: { some: { id } } } }),
    ]);
    return dispatches + dossiers > 0;
  }
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
  invalidateCategoryTags();
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
  invalidateCategoryTags();
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
  // Eine gelöschte Kategorie verschwindet aus den öffentlichen Filterlisten;
  // ohne diese Zeile blieb sie dort bis zum nächsten Cache-Ablauf stehen.
  invalidateCategoryTags();
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
