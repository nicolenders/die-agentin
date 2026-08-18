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
import { SPEAKER_FORMATS_TAG } from "@/lib/queries/speaker-formats";
import { locales } from "@/lib/i18n/config";
import { serializeRichValue } from "@/lib/content/rich";

/** Zurück auf das Register, aus dem gespeichert wurde — nicht auf das erste. */
function tabPath(tab: string): string {
  return `/admin/einstellungen?tab=${tab}`;
}

// Pflege der Rechtstexte (SPEC §12). Nur Struktur/Felder — der Inhalt kommt von
// Nicole. Erste Zeile: Rollenprüfung.
export async function saveLegalDoc(formData: FormData): Promise<void> {
  await requireAdmin();
  const back = tabPath("recht");
  const docKey = String(formData.get("docKey") ?? "");
  const locale = String(formData.get("locale") ?? "de") === "en" ? "en" : "de";
  const title = String(formData.get("title") ?? "").trim();
  const body = serializeRichValue(String(formData.get("body") ?? ""));
  if (!(LEGAL_KEYS as readonly string[]).includes(docKey) || !title) {
    redirect(`${back}&err=missing-fields`);
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
  if (failed) redirect(`${back}&err=failed`);
  redirect(`${back}&ok=saved`);
}

// Kontaktangaben (Phase 7.1): E-Mail + ladungsfähige Anschrift. Werden auch vom
// Impressum gelesen. Rollenprüfung zuerst.
export async function saveContactInfo(formData: FormData): Promise<void> {
  await requireAdmin();
  const back = tabPath("kontakt");
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
  if (failed) redirect(`${back}&err=failed`);
  redirect(`${back}&ok=contact`);
}

// Speaker-Kit-Bios (Anhang A): drei Längen je Sprache, als SiteSettings gepflegt
// (Schlüssel bio.<länge>.<locale>). Die „Akte" liest sie aus. Rollenprüfung zuerst.
export async function saveBios(formData: FormData): Promise<void> {
  await requireAdmin();
  const back = tabPath("bios");
  const locale = String(formData.get("locale") ?? "de") === "en" ? "en" : "de";
  let failed = false;
  try {
    for (const length of ["short", "medium", "long"] as const) {
      const key = `bio.${length}.${locale}`;
      const value = String(formData.get(length) ?? "").trim();
      await db.siteSetting.upsert({ where: { key }, create: { key, value }, update: { value } });
    }
    invalidateTags([SITE_SETTINGS_TAG]);
    revalidatePath("/de");
    revalidatePath("/en");
  } catch {
    failed = true;
  }
  if (failed) redirect(`${back}&err=failed`);
  redirect(`${back}&ok=bios`);
}

// ------------------------------------------------- Speaker-Kit-Formate

// Die Vortragsformate der Akte. Dauer als Minutenbereich, damit sie in beiden
// Sprachen richtig formatiert wird, ohne doppelt gepflegt zu werden.

function optionalInt(value: FormDataEntryValue | null): number | null {
  const n = Number.parseInt(String(value ?? "").trim(), 10);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function formatFields(formData: FormData) {
  return {
    titleDe: String(formData.get("titleDe") ?? "").trim(),
    titleEn: String(formData.get("titleEn") ?? "").trim() || null,
    noteDe: String(formData.get("noteDe") ?? "").trim() || null,
    noteEn: String(formData.get("noteEn") ?? "").trim() || null,
    minutesMin: optionalInt(formData.get("minutesMin")),
    minutesMax: optionalInt(formData.get("minutesMax")),
    // Je Sprache eine Checkbox; ohne Auswahl bleibt die Spalte in der Akte leer.
    languages: locales.filter((l) => formData.get(`lang-${l}`) === "on").join(","),
    active: formData.get("active") === "on",
  };
}

function afterFormatChange() {
  invalidateTags([SPEAKER_FORMATS_TAG]);
  revalidatePath("/de/akte");
  revalidatePath("/en/akte");
}

export async function createSpeakerFormat(formData: FormData): Promise<void> {
  await requireAdmin();
  const back = tabPath("formate");
  const fields = formatFields(formData);
  if (!fields.titleDe) redirect(`${back}&err=missing-fields`);

  let failed = false;
  try {
    const last = await db.speakerFormat.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    await db.speakerFormat.create({
      data: { ...fields, sortOrder: (last?.sortOrder ?? 0) + 10 },
    });
    afterFormatChange();
  } catch {
    failed = true;
  }
  if (failed) redirect(`${back}&err=failed`);
  redirect(`${back}&ok=created`);
}

export async function saveSpeakerFormat(formData: FormData): Promise<void> {
  await requireAdmin();
  const back = tabPath("formate");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect(`${back}&err=not-found`);
  const fields = formatFields(formData);
  if (!fields.titleDe) redirect(`${back}&err=missing-fields`);
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? ""), 10);

  let failed = false;
  try {
    await db.speakerFormat.update({
      where: { id },
      data: { ...fields, ...(Number.isFinite(sortOrder) ? { sortOrder } : {}) },
    });
    afterFormatChange();
  } catch {
    failed = true;
  }
  if (failed) redirect(`${back}&err=failed`);
  redirect(`${back}&ok=saved`);
}

export async function deleteSpeakerFormat(formData: FormData): Promise<void> {
  await requireAdmin();
  const back = tabPath("formate");
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect(`${back}&err=not-found`);

  let failed = false;
  try {
    await db.speakerFormat.delete({ where: { id } });
    afterFormatChange();
  } catch {
    failed = true;
  }
  if (failed) redirect(`${back}&err=failed`);
  redirect(`${back}&ok=deleted`);
}
