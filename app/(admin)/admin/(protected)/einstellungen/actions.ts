"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { LEGAL_KEYS } from "@/lib/queries/legal";

// Pflege der Rechtstexte (SPEC §12). Nur Struktur/Felder — der Inhalt kommt von
// Nicole. Erste Zeile: Rollenprüfung.
export async function saveLegalDoc(formData: FormData): Promise<void> {
  await requireAdmin();
  const docKey = String(formData.get("docKey") ?? "");
  const locale = String(formData.get("locale") ?? "de") === "en" ? "en" : "de";
  const title = String(formData.get("title") ?? "").trim();
  const body = String(formData.get("body") ?? "");
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
