"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { toMediaSource } from "@/lib/media/source";

const LIST = "/admin/medien";

// Pflege der Medien-Metadaten. Der Upload selbst läuft über die API-Route; hier
// werden Alt-Texte gepflegt und ungenutzte Bilder gelöscht.
export async function updateAsset(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const altDe = String(formData.get("altDe") ?? "").trim();
  const altEn = String(formData.get("altEn") ?? "").trim();
  const decorative = formData.get("decorative") != null;
  const source = toMediaSource(String(formData.get("source") ?? ""));
  if (!id) redirect(`${LIST}?err=not-found`);
  if (!decorative && !altDe) redirect(`${LIST}?err=alt-required`);

  let failed = false;
  try {
    await db.mediaAsset.update({
      where: { id },
      data: { altDe: decorative ? "" : altDe, altEn: altEn || null, decorative, source },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  redirect(`${LIST}?ok=updated`);
}

/** Beschreibung einer Präsentation ändern (Dateiname bleibt, wie er ist). */
export async function updateDocument(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  if (!id) redirect(`${LIST}?tab=praesentationen&err=not-found`);

  let failed = false;
  try {
    await db.mediaDocument.update({ where: { id }, data: { title: title || null } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?tab=praesentationen&err=failed`);
  redirect(`${LIST}?tab=praesentationen&ok=updated`);
}

/**
 * Löscht den Eintrag einer Präsentation. Hängt die Datei noch an einem Einsatz,
 * wird abgelehnt — sonst zeigte der öffentliche Download ins Leere.
 */
export async function deleteDocument(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(`${LIST}?tab=praesentationen&err=not-found`);

  let outcome: "deleted" | "not-found" | "document-in-use" | "failed" = "failed";
  try {
    const doc = await db.mediaDocument.findUnique({ where: { id }, select: { blobPath: true } });
    if (!doc) {
      outcome = "not-found";
    } else if ((await db.mission.count({ where: { slidesFilePath: doc.blobPath } })) > 0) {
      outcome = "document-in-use";
    } else {
      await db.mediaDocument.delete({ where: { id } });
      outcome = "deleted";
    }
  } catch {
    outcome = "failed";
  }
  redirect(
    outcome === "deleted"
      ? `${LIST}?tab=praesentationen&ok=deleted`
      : `${LIST}?tab=praesentationen&err=${outcome}`,
  );
}

export async function deleteAsset(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect(`${LIST}?err=not-found`);

  // Verwendete Bilder nicht löschen (Galerie-Zuordnung erlaubt kein
  // Kaskadenlöschen; Hero/Cover würden still entfernt). Erst dort lösen.
  const [inGalleries, asHero, asCover] = await Promise.all([
    db.missionPhoto.count({ where: { assetId: id } }),
    db.post.count({ where: { heroAssetId: id } }),
    db.publication.count({ where: { coverAssetId: id } }),
  ]);
  if (inGalleries + asHero + asCover > 0) redirect(`${LIST}?err=asset-in-use`);

  let failed = false;
  try {
    await db.mediaAsset.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  redirect(`${LIST}?ok=deleted`);
}
