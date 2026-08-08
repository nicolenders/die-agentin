"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags, tags } from "@/lib/cache";
import { PUBLICATION_TYPES, isOneOf } from "@/lib/domain";

const LIST = "/admin/publikationen";

function monthToDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
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
        translations: { create: [{ locale: "de", title: deTitle, role: str(formData, "role") || null }] },
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
        translations: {
          upsert: {
            where: { publicationId_locale: { publicationId: id, locale: "de" } },
            create: { locale: "de", title: deTitle, role: str(formData, "role") || null },
            update: { title: deTitle, role: str(formData, "role") || null },
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
  const acquiredOn = monthToDate(str(formData, "acquiredOn"));
  if (!name || !acquiredOn) redirect(`${LIST}?err=missing-fields`);

  let failed = false;
  try {
    await db.certification.create({
      data: {
        name,
        shortCode: str(formData, "shortCode") || null,
        categoryId: str(formData, "categoryId") || null,
        acquiredOn,
        validUntil: monthToDate(str(formData, "validUntil")),
        proofUrl: str(formData, "proofUrl") || null,
        series: str(formData, "series") || null,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidateCertifications();
  redirect(`${LIST}?ok=created`);
}

export async function updateCertification(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  const name = str(formData, "name");
  const acquiredOn = monthToDate(str(formData, "acquiredOn"));
  if (!name || !acquiredOn) redirect(`${LIST}/bearbeiten?cert=${id}&err=missing-fields`);

  let failed = false;
  try {
    await db.certification.update({
      where: { id },
      data: {
        name,
        shortCode: str(formData, "shortCode") || null,
        categoryId: str(formData, "categoryId") || null,
        acquiredOn,
        validUntil: monthToDate(str(formData, "validUntil")),
        proofUrl: str(formData, "proofUrl") || null,
        series: str(formData, "series") || null,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}/bearbeiten?cert=${id}&err=failed`);
  invalidateCertifications();
  redirect(`${LIST}?ok=updated`);
}

export async function deleteCertification(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);

  let failed = false;
  try {
    await db.certification.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidateCertifications();
  redirect(`${LIST}?ok=deleted`);
}
