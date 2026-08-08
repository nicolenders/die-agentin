"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { POST_TYPES, isOneOf } from "@/lib/domain";

const PAGE = "/admin/mobil";

// Schnellerfassung für unterwegs: legt einen DRAFT-Beitrag an, den man später am
// Rechner im Editor verfeinert. Bewusst minimal (Titel + optional Link/Text).
export async function quickCapture(formData: FormData): Promise<void> {
  await requireAdmin();
  const title = String(formData.get("title") ?? "").trim();
  if (!title) redirect(`${PAGE}?err=missing-fields`);

  const typeRaw = String(formData.get("type") ?? "NOTE");
  const type = isOneOf(POST_TYPES, typeRaw) ? typeRaw : "NOTE";
  const sourceUrl = String(formData.get("sourceUrl") ?? "").trim() || null;
  const text = String(formData.get("text") ?? "").trim();

  const doc = text
    ? { type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] }
    : { type: "doc", content: [] };
  const slug = `${slugify(title) || "notiz"}-${randomUUID().slice(0, 5)}`;

  let failed = false;
  try {
    await db.post.create({
      data: {
        type,
        status: "DRAFT",
        sourceUrl,
        translations: {
          create: [{ locale: "de", slug, title, bodyJson: JSON.stringify(doc), state: "REVIEWED" }],
        },
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${PAGE}?err=failed`);
  redirect(`${PAGE}?ok=created`);
}
