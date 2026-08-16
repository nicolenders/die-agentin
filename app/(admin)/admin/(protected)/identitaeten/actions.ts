"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags, tags } from "@/lib/cache";
import { slugify } from "@/lib/slug";
import { serializeStringList, isValidHex } from "@/lib/identities";

const LIST = "/admin/identitaeten";
const EDIT = `${LIST}/bearbeiten`;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function bool(formData: FormData, key: string): boolean {
  return formData.get(key) != null;
}
function ids(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((v) => String(v)).filter(Boolean);
}
/** JSON-Liste aus einem versteckten Feld (StringListField). */
function jsonList(formData: FormData, key: string): string[] {
  try {
    const parsed = JSON.parse(String(formData.get(key) ?? "[]"));
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

interface AttrInput {
  labelDe: string;
  labelEn: string;
  valueDe: string;
  valueEn: string;
  displayPublic: boolean;
}
function parseAttributes(formData: FormData): AttrInput[] {
  try {
    const parsed = JSON.parse(String(formData.get("attributes") ?? "[]"));
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((r) => ({
        labelDe: String(r.labelDe ?? "").trim(),
        labelEn: String(r.labelEn ?? "").trim(),
        valueDe: String(r.valueDe ?? "").trim(),
        valueEn: String(r.valueEn ?? "").trim(),
        displayPublic: Boolean(r.displayPublic),
      }))
      .filter((r) => r.labelDe || r.valueDe);
  } catch {
    return [];
  }
}

function invalidateIdentities(): void {
  invalidateTags([tags.identityList("de"), tags.identityList("en")]);
}

function commonData(formData: FormData) {
  return {
    codenameDe: str(formData, "codenameDe"),
    codenameEn: str(formData, "codenameEn"),
    roleDe: str(formData, "roleDe"),
    roleEn: str(formData, "roleEn"),
    taglineDe: str(formData, "taglineDe"),
    taglineEn: str(formData, "taglineEn"),
    registryCode: str(formData, "registryCode") || null,
    // `since` und `languages` werden nicht mehr gepflegt und deshalb hier auch
    // nicht geschrieben — vorhandene Werte bleiben unberührt, bis die Spalten
    // in einer späteren Migration verschwinden.
    descriptionDe: str(formData, "descriptionDe"),
    descriptionEn: str(formData, "descriptionEn"),
    shortBioDe: str(formData, "shortBioDe"),
    shortBioEn: str(formData, "shortBioEn"),
    focusDe: serializeStringList(jsonList(formData, "focusDe")),
    focusEn: serializeStringList(jsonList(formData, "focusEn")),
    color: str(formData, "color") || "#8B5CF6",
    iconKey: str(formData, "iconKey") || null,
    isPrimary: bool(formData, "isPrimary"),
    metaTitleDe: str(formData, "metaTitleDe") || null,
    metaTitleEn: str(formData, "metaTitleEn") || null,
    metaDescriptionDe: str(formData, "metaDescriptionDe") || null,
    metaDescriptionEn: str(formData, "metaDescriptionEn") || null,
    portraitAssetId: str(formData, "portraitAssetId") || null,
    envelopeAssetId: str(formData, "envelopeAssetId") || null,
    ogAssetId: str(formData, "ogAssetId") || null,
  };
}

function linkConnect(formData: FormData) {
  return {
    tools: ids(formData, "toolIds"),
    missions: ids(formData, "missionIds"),
    talks: ids(formData, "talkIds"),
    publications: ids(formData, "publicationIds"),
    certifications: ids(formData, "certificationIds"),
    focusTopics: ids(formData, "focusTopicIds"),
  };
}

/**
 * Legt ein neues Werkzeug an (wird beim Bearbeiten einer Identität inline
 * erzeugt und dort direkt verknüpft). Werkzeuge werden ausschließlich hier
 * gepflegt; die öffentliche Legende zeigt die Vereinigung aller Identitäts-
 * Werkzeuge. Der slug wird eindeutig gehalten.
 */
export async function createTool(input: {
  name: string;
}): Promise<{ ok: boolean; id?: string; name?: string; error?: string }> {
  await requireAdmin();
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Name fehlt." };
  try {
    // Doppelten Namen (ohne Groß-/Kleinschreibung) wiederverwenden statt duplizieren.
    const existing = await db.tool.findFirst({
      where: { name: { equals: name } },
      select: { id: true, name: true },
    });
    if (existing) return { ok: true, id: existing.id, name: existing.name };

    const base = slugify(name) || "werkzeug";
    let slug = base;
    let n = 1;
    while (await db.tool.findUnique({ where: { slug }, select: { id: true } })) {
      n += 1;
      slug = `${base}-${n}`;
    }
    const tool = await db.tool.create({ data: { name, slug } });
    invalidateIdentities();
    return { ok: true, id: tool.id, name: tool.name };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Anlegen fehlgeschlagen." };
  }
}

export async function createIdentity(formData: FormData): Promise<void> {
  await requireAdmin();
  const roleDe = str(formData, "roleDe");
  if (!roleDe) redirect(`${EDIT}?err=missing-role`);
  const color = str(formData, "color") || "#8B5CF6";
  if (!isValidHex(color)) redirect(`${EDIT}?err=bad-color`);

  const slug = slugify(str(formData, "slug") || roleDe);
  if (!slug) redirect(`${EDIT}?err=missing-slug`);

  const data = commonData(formData);
  const links = linkConnect(formData);
  const attrs = parseAttributes(formData);

  let newId: string | null = null;
  try {
    const created = await db.identity.create({
      data: {
        ...data,
        slug,
        tools: { connect: links.tools.map((id) => ({ id })) },
        missions: { connect: links.missions.map((id) => ({ id })) },
        talks: { connect: links.talks.map((id) => ({ id })) },
        publications: { connect: links.publications.map((id) => ({ id })) },
        certifications: { connect: links.certifications.map((id) => ({ id })) },
        focusTopics: { connect: links.focusTopics.map((id) => ({ id })) },
        attributes: { create: attrs.map((a, i) => ({ ...a, sortOrder: i })) },
      },
    });
    newId = created.id;
  } catch {
    redirect(`${EDIT}?err=failed`);
  }
  invalidateIdentities();
  redirect(`${EDIT}?id=${newId}&ok=created`);
}

export async function updateIdentity(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  const roleDe = str(formData, "roleDe");
  if (!roleDe) redirect(`${EDIT}?id=${id}&err=missing-role`);
  const color = str(formData, "color") || "#8B5CF6";
  if (!isValidHex(color)) redirect(`${EDIT}?id=${id}&err=bad-color`);

  const slug = slugify(str(formData, "slug") || roleDe);
  const data = commonData(formData);
  const links = linkConnect(formData);
  const attrs = parseAttributes(formData);

  try {
    await db.identity.update({
      where: { id },
      data: {
        ...data,
        slug,
        tools: { set: links.tools.map((id) => ({ id })) },
        missions: { set: links.missions.map((id) => ({ id })) },
        talks: { set: links.talks.map((id) => ({ id })) },
        publications: { set: links.publications.map((id) => ({ id })) },
        certifications: { set: links.certifications.map((id) => ({ id })) },
        focusTopics: { set: links.focusTopics.map((id) => ({ id })) },
        // Merkmale komplett ersetzen (einfachste konsistente Strategie).
        attributes: { deleteMany: {}, create: attrs.map((a, i) => ({ ...a, sortOrder: i })) },
      },
    });
  } catch {
    redirect(`${EDIT}?id=${id}&err=failed`);
  }
  invalidateIdentities();
  redirect(`${EDIT}?id=${id}&ok=updated`);
}

export async function togglePublishIdentity(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  let result: "ok" | "cannot-publish" | "failed" = "ok";
  try {
    const current = await db.identity.findUnique({ where: { id }, select: { published: true, roleDe: true, color: true } });
    if (current) {
      // Vor dem Veröffentlichen blockierende Pflichtfelder prüfen (Phase 2.6).
      if (!current.published && (!current.roleDe.trim() || !isValidHex(current.color))) {
        result = "cannot-publish";
      } else {
        await db.identity.update({ where: { id }, data: { published: !current.published } });
      }
    }
  } catch {
    result = "failed";
  }
  if (result === "cannot-publish") redirect(`${EDIT}?id=${id}&err=cannot-publish`);
  if (result === "failed") redirect(`${LIST}?err=failed`);
  invalidateIdentities();
  redirect(`${LIST}?ok=toggled`);
}

// Reihenfolge um eine Position verschieben (sortOrder ist manuell, nie zeitlich).
export async function reorderIdentity(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const dir = str(formData, "dir");
  if (!id) redirect(`${LIST}?err=not-found`);
  try {
    const all = await db.identity.findMany({ orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true } });
    const index = all.findIndex((g) => g.id === id);
    const swapWith = dir === "down" ? index + 1 : index - 1;
    const order = all.map((g) => g.id);
    const a = order[index];
    const b = order[swapWith];
    if (a !== undefined && b !== undefined) {
      order[index] = b;
      order[swapWith] = a;
      await db.$transaction(order.map((gid, i) => db.identity.update({ where: { id: gid }, data: { sortOrder: i } })));
    }
  } catch {
    redirect(`${LIST}?err=failed`);
  }
  invalidateIdentities();
  redirect(`${LIST}?ok=reordered`);
}

export async function deleteIdentity(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  let result: "ok" | "has-links" | "failed" = "ok";
  try {
    // Löschen nur ohne verknüpfte Einträge (Phase 2.6). Sonst zurückziehen.
    const linked = await db.identity.findUnique({
      where: { id },
      select: { _count: { select: { missions: true, talks: true, publications: true, certifications: true } } },
    });
    const total =
      (linked?._count.missions ?? 0) +
      (linked?._count.talks ?? 0) +
      (linked?._count.publications ?? 0) +
      (linked?._count.certifications ?? 0);
    if (total > 0) {
      result = "has-links";
    } else {
      await db.identity.delete({ where: { id } });
    }
  } catch {
    result = "failed";
  }
  if (result === "has-links") redirect(`${LIST}?err=has-links`);
  if (result === "failed") redirect(`${LIST}?err=failed`);
  invalidateIdentities();
  redirect(`${LIST}?ok=deleted`);
}
