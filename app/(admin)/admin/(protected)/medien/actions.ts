"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";

const LIST = "/admin/medien";

// Pflege der Medien-Metadaten. Der Upload selbst läuft über die API-Route; hier
// werden Alt-Texte gepflegt und ungenutzte Bilder gelöscht.
export async function updateAsset(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const altDe = String(formData.get("altDe") ?? "").trim();
  const altEn = String(formData.get("altEn") ?? "").trim();
  const decorative = formData.get("decorative") != null;
  if (!id) redirect(`${LIST}?err=not-found`);
  if (!decorative && !altDe) redirect(`${LIST}?err=alt-required`);

  let failed = false;
  try {
    await db.mediaAsset.update({
      where: { id },
      data: { altDe: decorative ? "" : altDe, altEn: altEn || null, decorative },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  redirect(`${LIST}?ok=updated`);
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
