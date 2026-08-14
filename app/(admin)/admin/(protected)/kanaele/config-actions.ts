"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags } from "@/lib/cache";
import {
  SOCIAL_PLATFORMS,
  SITE_SETTINGS_TAG,
  socialSettingKey,
  normalizeSocialUrl,
} from "@/lib/queries/settings";
import { SHARE_TYPES, shareTemplateKey } from "@/lib/share";
import type { Locale } from "@/lib/i18n/config";

// Aktionen der Seite „Kanäle": Social-Media-Profile und die Teilen-Vorlagen.
// Rollenprüfung als erste Zeile.

const PAGE = "/admin/kanaele";

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
    // Footer der statisch gerenderten Startseiten neu erzeugen.
    revalidatePath("/de");
    revalidatePath("/en");
  } catch {
    failed = true;
  }
  if (failed) redirect(`${PAGE}?err=failed`);
  redirect(`${PAGE}?ok=social`);
}

export async function saveShareTemplates(formData: FormData): Promise<void> {
  await requireAdmin();
  let failed = false;
  try {
    for (const type of SHARE_TYPES) {
      for (const locale of ["de", "en"] as Locale[]) {
        const key = shareTemplateKey(type, locale);
        const value = String(formData.get(key) ?? "").trim();
        await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
      }
    }
    invalidateTags([SITE_SETTINGS_TAG]);
  } catch {
    failed = true;
  }
  if (failed) redirect(`${PAGE}?err=failed`);
  redirect(`${PAGE}?ok=templates`);
}
