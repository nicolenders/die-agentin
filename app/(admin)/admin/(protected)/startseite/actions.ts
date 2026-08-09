"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags } from "@/lib/cache";
import { HOME_TAG } from "@/lib/queries/home";
import { serializeRichValue } from "@/lib/content/rich";
import { withDbRetry } from "@/lib/db-retry";

// Pflege des Startseiten-Hero (SPEC §5). Headline und Lead sind Rich-Text-Felder
// (werden bereinigt/serialisiert), `roles` wird aus einer Komma-/Zeilenliste in
// ein JSON-Array überführt. Rollenprüfung zuerst.
export async function saveHomeHero(formData: FormData): Promise<void> {
  await requireAdmin();
  const locale = String(formData.get("locale") ?? "de") === "en" ? "en" : "de";
  const eyebrow = String(formData.get("eyebrow") ?? "").trim();
  const headline = serializeRichValue(String(formData.get("headline") ?? ""));
  const lead = serializeRichValue(String(formData.get("lead") ?? ""));
  const rolesRaw = String(formData.get("roles") ?? "");
  const roles = rolesRaw
    .split(/[\n,]/)
    .map((r) => r.trim())
    .filter(Boolean);
  const heroAssetId = String(formData.get("heroAssetId") ?? "").trim() || null;

  let failed = false;
  try {
    const data = {
      eyebrow: eyebrow || null,
      headline: headline || null,
      lead: lead || null,
      roles: roles.length > 0 ? JSON.stringify(roles) : null,
      heroAssetId,
    };
    // Auf eine ggf. pausierte serverlose DB warten, statt sofort zu scheitern.
    await withDbRetry(() =>
      db.homeContent.upsert({
        where: { locale },
        create: { locale, ...data },
        update: data,
      }),
    );
    invalidateTags([HOME_TAG]);
    // Startseiten werden gecacht gerendert → gezielt neu erzeugen.
    revalidatePath(`/${locale}`);
  } catch {
    failed = true;
  }
  if (failed) redirect(`/admin/startseite?err=failed`);
  redirect(`/admin/startseite?ok=saved`);
}
