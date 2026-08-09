"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags, tags } from "@/lib/cache";
import { serializeRichValue } from "@/lib/content/rich";

const PAGE = "/admin/legende";

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

// Speichert die Legende-Inhalte je Sprache. Säulen und Werkzeuge werden zeilen-
// weise erfasst (eine je Zeile; Säule als „Titel | Text").
export async function saveLegend(formData: FormData): Promise<void> {
  await requireAdmin();
  const locale = str(formData, "locale") === "en" ? "en" : "de";
  const name = str(formData, "name");
  if (!name) redirect(`${PAGE}?locale=${locale}&err=missing-fields`);

  const pillars = str(formData, "pillars")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [title, ...rest] = line.split("|");
      return { title: (title ?? "").trim(), text: rest.join("|").trim() };
    })
    .filter((p) => p.title);
  const toolsList = str(formData, "tools")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const data = {
    eyebrow: str(formData, "eyebrow"),
    name,
    lead: serializeRichValue(str(formData, "lead")),
    missionEyebrow: str(formData, "missionEyebrow"),
    missionText: serializeRichValue(str(formData, "missionText")),
    pillarsJson: JSON.stringify(pillars),
    toolsJson: JSON.stringify(toolsList),
    contactEyebrow: str(formData, "contactEyebrow"),
    contactHeading: str(formData, "contactHeading"),
    contactText: serializeRichValue(str(formData, "contactText")),
    contactButton: str(formData, "contactButton"),
    contactUrl: str(formData, "contactUrl"),
    portraitAssetId: str(formData, "portraitAssetId") || null,
  };

  let failed = false;
  try {
    await db.legendContent.upsert({
      where: { locale },
      create: { locale, ...data },
      update: data,
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${PAGE}?locale=${locale}&err=failed`);
  invalidateTags([tags.legend(locale)]);
  redirect(`${PAGE}?locale=${locale}&ok=saved`);
}
