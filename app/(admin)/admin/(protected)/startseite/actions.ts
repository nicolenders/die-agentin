"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags } from "@/lib/cache";
import { HOME_TAG, HOME_FOCUS_TAG } from "@/lib/queries/home";
import { homeFocusFull, nextHomeFocusSortOrder } from "@/lib/home-focus";
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

// --------------------------------------------- Woran ich gerade arbeite

// Werkzeuge und Themen der Startseite. Höchstens `HOME_FOCUS_MAX` aktive
// Einträge; die Grenze wird hier geprüft, nicht nur im Formular ausgeblendet.

function focusFields(formData: FormData) {
  return {
    titleDe: String(formData.get("titleDe") ?? "").trim(),
    titleEn: String(formData.get("titleEn") ?? "").trim() || null,
    textDe: String(formData.get("textDe") ?? "").trim(),
    textEn: String(formData.get("textEn") ?? "").trim() || null,
    iconAssetId: String(formData.get("iconAssetId") ?? "").trim() || null,
    active: formData.get("active") === "on",
  };
}

function afterFocusChange() {
  invalidateTags([HOME_FOCUS_TAG]);
  revalidatePath("/de");
  revalidatePath("/en");
}

export async function createHomeFocus(formData: FormData): Promise<void> {
  await requireAdmin();
  const fields = focusFields(formData);
  if (!fields.titleDe || !fields.textDe) redirect("/admin/startseite?err=missing-fields");

  let error: string | null = null;
  try {
    const rows = await withDbRetry(() =>
      db.homeFocus.findMany({ select: { sortOrder: true, active: true } }),
    );
    if (fields.active && homeFocusFull(rows.filter((r) => r.active).length)) {
      error = "focus-full";
    } else {
      await withDbRetry(() =>
        db.homeFocus.create({
          data: { ...fields, sortOrder: nextHomeFocusSortOrder(rows.map((r) => r.sortOrder)) },
        }),
      );
      afterFocusChange();
    }
  } catch {
    error = "failed";
  }
  if (error) redirect(`/admin/startseite?err=${error}`);
  redirect("/admin/startseite?ok=created");
}

export async function saveHomeFocus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/startseite?err=not-found");
  const fields = focusFields(formData);
  if (!fields.titleDe || !fields.textDe) redirect("/admin/startseite?err=missing-fields");
  const sortOrder = Number.parseInt(String(formData.get("sortOrder") ?? ""), 10);

  let error: string | null = null;
  try {
    const rows = await withDbRetry(() =>
      db.homeFocus.findMany({ select: { id: true, active: true } }),
    );
    const others = rows.filter((r) => r.id !== id && r.active).length;
    if (fields.active && homeFocusFull(others)) {
      error = "focus-full";
    } else {
      await withDbRetry(() =>
        db.homeFocus.update({
          where: { id },
          data: { ...fields, ...(Number.isFinite(sortOrder) ? { sortOrder } : {}) },
        }),
      );
      afterFocusChange();
    }
  } catch {
    error = "failed";
  }
  if (error) redirect(`/admin/startseite?err=${error}`);
  redirect("/admin/startseite?ok=saved");
}

export async function deleteHomeFocus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirect("/admin/startseite?err=not-found");

  let failed = false;
  try {
    await withDbRetry(() => db.homeFocus.delete({ where: { id } }));
    afterFocusChange();
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/startseite?err=failed");
  redirect("/admin/startseite?ok=deleted");
}
