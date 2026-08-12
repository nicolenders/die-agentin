"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags, tags } from "@/lib/cache";
import { PUBLICATION_TYPES, CERTIFICATION_STATUSES, isOneOf } from "@/lib/domain";
import { toCertKind, toCertFamily } from "@/lib/records/kind";
import { FOCUS_TAG } from "@/lib/queries/records";

const LIST = "/admin/publikationen";
const CERT_LIST = "/admin/ausbildung";
const FOCUS_LIST = "/admin/aufklaerung";

function monthToDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Mehrfachauswahl: alle gewählten Kategorie-IDs. `categoryId` (Einzelspalte)
// wird zusätzlich mit der ersten gepflegt (Abwärtskompatibilität).
function ids(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((v) => String(v)).filter(Boolean);
}

function invalidatePublications(): void {
  invalidateTags([tags.publicationList("de"), tags.publicationList("en")]);
}
function invalidateCertifications(): void {
  invalidateTags([tags.certificationList("de"), tags.certificationList("en")]);
}

// ---------------------------------------------------------------- Publikationen

export async function createPublication(formData: FormData): Promise<void> {
  await requireAdmin();
  const deTitle = str(formData, "deTitle");
  if (!deTitle) redirect(`${LIST}?err=missing-fields`);

  const type = isOneOf(PUBLICATION_TYPES, str(formData, "type")) ? str(formData, "type") : "ARTICLE";
  const year = Number(formData.get("year") ?? 0) || new Date().getUTCFullYear();

  let failed = false;
  try {
    await db.publication.create({
      data: {
        type,
        year,
        isbn: str(formData, "isbn") || null,
        publisher: str(formData, "publisher") || null,
        url: str(formData, "url") || null,
        repoUrl: str(formData, "repoUrl") || null,
        language: str(formData, "language") || null,
        coverAssetId: str(formData, "coverAssetId") || null,
        translations: { create: [{ locale: "de", title: deTitle, role: str(formData, "role") || null, description: str(formData, "description") || null }] },
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidatePublications();
  redirect(`${LIST}?ok=created`);
}

export async function updatePublication(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  const deTitle = str(formData, "deTitle");
  if (!deTitle) redirect(`${LIST}/bearbeiten?pub=${id}&err=missing-fields`);

  const type = isOneOf(PUBLICATION_TYPES, str(formData, "type")) ? str(formData, "type") : "ARTICLE";
  const year = Number(formData.get("year") ?? 0) || new Date().getUTCFullYear();

  let failed = false;
  try {
    await db.publication.update({
      where: { id },
      data: {
        type,
        year,
        isbn: str(formData, "isbn") || null,
        publisher: str(formData, "publisher") || null,
        url: str(formData, "url") || null,
        repoUrl: str(formData, "repoUrl") || null,
        language: str(formData, "language") || null,
        coverAssetId: str(formData, "coverAssetId") || null,
        translations: {
          upsert: {
            where: { publicationId_locale: { publicationId: id, locale: "de" } },
            create: { locale: "de", title: deTitle, role: str(formData, "role") || null, description: str(formData, "description") || null },
            update: { title: deTitle, role: str(formData, "role") || null, description: str(formData, "description") || null },
          },
        },
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}/bearbeiten?pub=${id}&err=failed`);
  invalidatePublications();
  redirect(`${LIST}?ok=updated`);
}

export async function deletePublication(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);

  let failed = false;
  try {
    await db.publication.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidatePublications();
  redirect(`${LIST}?ok=deleted`);
}

// -------------------------------------------------------- Zertifizierungen

export async function createCertification(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = str(formData, "name");
  const status = isOneOf(CERTIFICATION_STATUSES, str(formData, "status")) ? str(formData, "status") : "ACHIEVED";
  // Geplante Zertifizierungen brauchen kein Erwerbsdatum; als Platzhalter now.
  const acquiredOn = monthToDate(str(formData, "acquiredOn")) ?? (status === "PLANNED" ? new Date() : null);
  if (!name || !acquiredOn) redirect(`${CERT_LIST}?err=missing-fields`);
  const categoryIds = ids(formData, "categoryIds");

  let failed = false;
  try {
    await db.certification.create({
      data: {
        name,
        kind: toCertKind(str(formData, "kind")),
        family: toCertFamily(str(formData, "family")),
        status,
        plannedFor: str(formData, "plannedFor") || null,
        shortCode: str(formData, "shortCode") || null,
        categoryId: categoryIds[0] ?? null,
        categories: { connect: categoryIds.map((id) => ({ id })) },
        acquiredOn,
        validUntil: monthToDate(str(formData, "validUntil")),
        proofUrl: str(formData, "proofUrl") || null,
        series: str(formData, "series") || null,
        logoAssetId: str(formData, "logoAssetId") || null,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${CERT_LIST}?err=failed`);
  invalidateCertifications();
  redirect(`${CERT_LIST}?ok=created`);
}

export async function updateCertification(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${CERT_LIST}?err=not-found`);
  const name = str(formData, "name");
  const status = isOneOf(CERTIFICATION_STATUSES, str(formData, "status")) ? str(formData, "status") : "ACHIEVED";
  const acquiredOn = monthToDate(str(formData, "acquiredOn")) ?? (status === "PLANNED" ? new Date() : null);
  if (!name || !acquiredOn) redirect(`${CERT_LIST}/bearbeiten?cert=${id}&err=missing-fields`);
  const categoryIds = ids(formData, "categoryIds");

  let failed = false;
  try {
    await db.certification.update({
      where: { id },
      data: {
        name,
        kind: toCertKind(str(formData, "kind")),
        family: toCertFamily(str(formData, "family")),
        status,
        plannedFor: str(formData, "plannedFor") || null,
        shortCode: str(formData, "shortCode") || null,
        categoryId: categoryIds[0] ?? null,
        categories: { set: categoryIds.map((id) => ({ id })) },
        acquiredOn,
        validUntil: monthToDate(str(formData, "validUntil")),
        proofUrl: str(formData, "proofUrl") || null,
        series: str(formData, "series") || null,
        logoAssetId: str(formData, "logoAssetId") || null,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${CERT_LIST}/bearbeiten?cert=${id}&err=failed`);
  invalidateCertifications();
  redirect(`${CERT_LIST}?ok=updated`);
}

// Reihenfolge einer Zertifizierung innerhalb ihrer Art um eine Position
// verschieben. sortOrder gilt gruppenweise (je kind): Wir normalisieren die
// Werte der Gruppe auf fortlaufende Indizes und tauschen den Nachbarn — so ist
// die Reihenfolge deterministisch, auch wenn bisher alles sortOrder=0 war.
export async function reorderCertification(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const dir = str(formData, "dir"); // "up" | "down"
  if (!id) redirect(`${CERT_LIST}?err=not-found`);

  let failed = false;
  try {
    const target = await db.certification.findUnique({ where: { id }, select: { kind: true } });
    if (target) {
      const group = await db.certification.findMany({
        where: { kind: target.kind },
        orderBy: [{ sortOrder: "asc" }, { acquiredOn: "desc" }],
        select: { id: true },
      });
      const index = group.findIndex((g) => g.id === id);
      const swapWith = dir === "down" ? index + 1 : index - 1;
      const order = group.map((g) => g.id);
      const a = order[index];
      const b = order[swapWith];
      if (a !== undefined && b !== undefined) {
        order[index] = b;
        order[swapWith] = a;
        await db.$transaction(
          order.map((gid, i) => db.certification.update({ where: { id: gid }, data: { sortOrder: i } })),
        );
      }
    }
  } catch {
    failed = true;
  }
  if (failed) redirect(`${CERT_LIST}?err=failed`);
  invalidateCertifications();
  redirect(`${CERT_LIST}?ok=reordered`);
}

export async function deleteCertification(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${CERT_LIST}?err=not-found`);

  let failed = false;
  try {
    await db.certification.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${CERT_LIST}?err=failed`);
  invalidateCertifications();
  redirect(`${CERT_LIST}?ok=deleted`);
}

// ------------------------------------------------ Aktuelle Lernthemen

export async function createFocusTopic(formData: FormData): Promise<void> {
  await requireAdmin();
  const titleDe = str(formData, "titleDe");
  if (!titleDe) redirect(`${FOCUS_LIST}?err=missing-fields`);
  let failed = false;
  try {
    await db.focusTopic.create({
      data: {
        titleDe,
        titleEn: str(formData, "titleEn") || null,
        note: str(formData, "note") || null,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${FOCUS_LIST}?err=failed`);
  invalidateTags([FOCUS_TAG]);
  redirect(`${FOCUS_LIST}?ok=created`);
}

export async function deleteFocusTopic(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${FOCUS_LIST}?err=not-found`);
  let failed = false;
  try {
    await db.focusTopic.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${FOCUS_LIST}?err=failed`);
  invalidateTags([FOCUS_TAG]);
  redirect(`${FOCUS_LIST}?ok=deleted`);
}
