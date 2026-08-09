"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { LEGAL_KEYS } from "@/lib/queries/legal";
import { invalidateTags } from "@/lib/cache";
import {
  SOCIAL_PLATFORMS,
  SITE_SETTINGS_TAG,
  socialSettingKey,
  normalizeSocialUrl,
} from "@/lib/queries/settings";
import { serializeRichValue } from "@/lib/content/rich";

// Pflege der Rechtstexte (SPEC §12). Nur Struktur/Felder — der Inhalt kommt von
// Nicole. Erste Zeile: Rollenprüfung.
export async function saveLegalDoc(formData: FormData): Promise<void> {
  await requireAdmin();
  const docKey = String(formData.get("docKey") ?? "");
  const locale = String(formData.get("locale") ?? "de") === "en" ? "en" : "de";
  const title = String(formData.get("title") ?? "").trim();
  const body = serializeRichValue(String(formData.get("body") ?? ""));
  if (!(LEGAL_KEYS as readonly string[]).includes(docKey) || !title) {
    redirect("/admin/einstellungen?err=missing-fields");
  }

  let failed = false;
  try {
    await db.legalDoc.upsert({
      where: { docKey_locale: { docKey, locale } },
      create: { docKey, locale, title, body },
      update: { title, body },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/einstellungen?err=failed");
  redirect("/admin/einstellungen?ok=saved");
}

// Social-Media-Profile für den Footer pflegen. Leeres Feld entfernt den Link.
// Fehlt das Schema, wird die URL um `https://` ergänzt. Rollenprüfung zuerst.
export async function saveSocialLinks(formData: FormData): Promise<void> {
  await requireAdmin();

  let failed = false;
  try {
    for (const platform of SOCIAL_PLATFORMS) {
      const value = normalizeSocialUrl(String(formData.get(platform.key) ?? ""));
      await db.siteSetting.upsert({
        where: { key: socialSettingKey(platform.key) },
        create: { key: socialSettingKey(platform.key), value },
        update: { value },
      });
    }
    invalidateTags([SITE_SETTINGS_TAG]);
    // Die Startseiten werden statisch gerendert und lesen den Footer beim Build
    // (ohne DB). Damit neue Profile dort erscheinen, gezielt neu erzeugen.
    revalidatePath("/de");
    revalidatePath("/en");
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/einstellungen?err=failed");
  redirect("/admin/einstellungen?ok=social");
}
