"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags, tags } from "@/lib/cache";
import { slugify } from "@/lib/slug";
import { berlinLocalToUtc } from "@/lib/time";
import { DISPATCH_FORMATS, CONTENT_STATUSES, isOneOf } from "@/lib/domain";

const LIST = "/admin/depeschen";
const EDIT = `${LIST}/bearbeiten`;

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function ids(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((v) => String(v)).filter(Boolean);
}

function invalidate(): void {
  invalidateTags([tags.dispatchList("de"), tags.dispatchList("en")]);
}

interface Common {
  format: string;
  status: string;
  publishedAt: Date | null;
  reviewedAt: Date | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceSite: string | null;
  heroAssetId: string | null;
}
function commonData(formData: FormData): Common {
  const format = isOneOf(DISPATCH_FORMATS, str(formData, "format")) ? str(formData, "format") : "NOTE";
  const status = isOneOf(CONTENT_STATUSES, str(formData, "status")) ? str(formData, "status") : "DRAFT";
  const publishedAt = berlinLocalToUtc(str(formData, "publishedAt")) ?? (status === "PUBLISHED" ? new Date() : null);
  return {
    format,
    status,
    publishedAt,
    reviewedAt: berlinLocalToUtc(str(formData, "reviewedAt")),
    sourceUrl: str(formData, "sourceUrl") || null,
    sourceTitle: str(formData, "sourceTitle") || null,
    sourceSite: str(formData, "sourceSite") || null,
    heroAssetId: str(formData, "heroAssetId") || null,
  };
}

interface TransInput {
  locale: "de" | "en";
  slug: string;
  title: string;
  summary: string | null;
  bodyJson: string;
  tocEnabled: boolean;
}
function translations(formData: FormData, format: string): TransInput[] {
  const out: TransInput[] = [];
  const toc = format === "REFERENCE";
  const deTitle = str(formData, "deTitle");
  if (deTitle) {
    out.push({
      locale: "de",
      slug: slugify(str(formData, "deSlug") || deTitle),
      title: deTitle,
      summary: str(formData, "deSummary") || null,
      bodyJson: str(formData, "deBody") || '{"type":"doc","content":[]}',
      tocEnabled: toc,
    });
  }
  const enTitle = str(formData, "enTitle");
  if (enTitle) {
    out.push({
      locale: "en",
      slug: slugify(str(formData, "enSlug") || enTitle),
      title: enTitle,
      summary: str(formData, "enSummary") || null,
      bodyJson: str(formData, "enBody") || '{"type":"doc","content":[]}',
      tocEnabled: toc,
    });
  }
  return out;
}

export async function createDispatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const c = commonData(formData);
  const trans = translations(formData, c.format);
  if (trans.length === 0 || trans[0]!.locale !== "de") redirect(`${EDIT}?err=missing-fields`);

  let newId: string | null = null;
  try {
    const created = await db.dispatch.create({
      data: {
        ...c,
        publishAt: c.publishedAt,
        identities: { connect: ids(formData, "identityIds").map((id) => ({ id })) },
        topics: { connect: ids(formData, "topicIds").map((id) => ({ id })) },
        // Admin-verfasste Übersetzungen gelten als geprüft (öffentlich sichtbar).
        translations: { create: trans.map((t) => ({ ...t, state: "REVIEWED" })) },
      },
    });
    newId = created.id;
  } catch {
    redirect(`${EDIT}?err=failed`);
  }
  invalidate();
  redirect(`${EDIT}?id=${newId}&ok=created`);
}

export async function updateDispatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  const c = commonData(formData);
  const trans = translations(formData, c.format);
  if (trans.length === 0 || trans[0]!.locale !== "de") redirect(`${EDIT}?id=${id}&err=missing-fields`);

  try {
    await db.$transaction([
      db.dispatch.update({
        where: { id },
        data: {
          ...c,
          publishAt: c.publishedAt,
          identities: { set: ids(formData, "identityIds").map((x) => ({ id: x })) },
          topics: { set: ids(formData, "topicIds").map((x) => ({ id: x })) },
        },
      }),
      db.dispatchTranslation.deleteMany({ where: { dispatchId: id } }),
      db.dispatchTranslation.createMany({ data: trans.map((t) => ({ ...t, dispatchId: id, state: "REVIEWED" })) }),
    ]);
  } catch {
    redirect(`${EDIT}?id=${id}&err=failed`);
  }
  invalidate();
  redirect(`${EDIT}?id=${id}&ok=updated`);
}

export async function deleteDispatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  let failed = false;
  try {
    await db.dispatch.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidate();
  redirect(`${LIST}?ok=deleted`);
}
