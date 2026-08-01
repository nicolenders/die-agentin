import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import type { AssetMap } from "@/lib/content/assets";
import type { Locale } from "@/lib/i18n/config";

// Lädt die referenzierten MediaAssets und baut die AssetMap für den Renderer.
// Der Alt-Text wird sprachabhängig gewählt (EN, sonst DE als Fallback).
export async function resolveAssets(ids: string[], locale: Locale): Promise<AssetMap> {
  if (ids.length === 0) return {};
  try {
    const assets = await db.mediaAsset.findMany({ where: { id: { in: ids } } });
    const map: AssetMap = {};
    for (const a of assets) {
      map[a.id] = {
        id: a.id,
        url: assetUrl(a.blobPath),
        alt: locale === "en" && a.altEn ? a.altEn : a.altDe,
        width: a.width,
        height: a.height,
        credit: a.credit,
        decorative: a.decorative,
      };
    }
    return map;
  } catch {
    return {};
  }
}
