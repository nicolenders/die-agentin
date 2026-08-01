"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags, tags } from "@/lib/cache";
import { PUBLICATION_TYPES, isOneOf } from "@/lib/domain";

function monthToDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export async function createPublication(formData: FormData): Promise<void> {
  await requireAdmin();
  const typeRaw = String(formData.get("type") ?? "");
  const type = isOneOf(PUBLICATION_TYPES, typeRaw) ? typeRaw : "ARTICLE";
  const year = Number(formData.get("year") ?? 0) || new Date().getUTCFullYear();
  const deTitle = String(formData.get("deTitle") ?? "").trim();
  if (!deTitle) return;

  await db.publication.create({
    data: {
      type,
      year,
      isbn: String(formData.get("isbn") ?? "").trim() || null,
      publisher: String(formData.get("publisher") ?? "").trim() || null,
      url: String(formData.get("url") ?? "").trim() || null,
      translations: {
        create: [{ locale: "de", title: deTitle, role: String(formData.get("role") ?? "").trim() || null }],
      },
    },
  });
  invalidateTags([tags.publicationList("de"), tags.publicationList("en")]);
  revalidatePath("/admin/publikationen");
}

export async function createCertification(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "").trim();
  const acquiredOn = monthToDate(String(formData.get("acquiredOn") ?? ""));
  if (!name || !acquiredOn) return;

  await db.certification.create({
    data: {
      name,
      shortCode: String(formData.get("shortCode") ?? "").trim() || null,
      categoryId: String(formData.get("categoryId") ?? "") || null,
      acquiredOn,
      validUntil: monthToDate(String(formData.get("validUntil") ?? "")),
      proofUrl: String(formData.get("proofUrl") ?? "").trim() || null,
      series: String(formData.get("series") ?? "").trim() || null,
    },
  });
  invalidateTags([tags.certificationList("de"), tags.certificationList("en")]);
  revalidatePath("/admin/publikationen");
}
