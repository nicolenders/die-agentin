"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { LEGAL_KEYS } from "@/lib/queries/legal";
import { invalidateTags } from "@/lib/cache";
import {
  SITE_SETTINGS_TAG,
  CONTACT_EMAIL_KEY,
  CONTACT_ADDRESS_KEY,
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

// Kontaktangaben (Phase 7.1): E-Mail + ladungsfähige Anschrift. Werden auch vom
// Impressum gelesen. Rollenprüfung zuerst.
export async function saveContactInfo(formData: FormData): Promise<void> {
  await requireAdmin();
  const email = String(formData.get("contactEmail") ?? "").trim();
  const postalAddress = String(formData.get("postalAddress") ?? "").trim();
  let failed = false;
  try {
    for (const [key, value] of [
      [CONTACT_EMAIL_KEY, email],
      [CONTACT_ADDRESS_KEY, postalAddress],
    ] as const) {
      await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    invalidateTags([SITE_SETTINGS_TAG]);
    revalidatePath("/de");
    revalidatePath("/en");
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/einstellungen?err=failed");
  redirect("/admin/einstellungen?ok=contact");
}
