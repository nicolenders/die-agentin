import { collectAssetIds } from "@/lib/content/assets";
import { isTiptapDoc } from "@/lib/content/schema";
import { assetUrl } from "@/lib/media/url";

// Bilder-Pool einer Depesche (ADR 0033). Die Bilder werden einmal an der
// Depesche gepflegt und stehen in den Editoren beider Sprachen zum Einfügen
// bereit. Der Text speichert nur die Asset-ID; den Alt-Text der jeweiligen
// Sprache liefert beim Rendern das MediaAsset (`resolveAssets`). Deshalb muss
// nichts doppelt gepflegt werden.

/** Obergrenze je Depesche — schützt vor versehentlich riesigen Formularen. */
export const MAX_DISPATCH_IMAGES = 40;

/** Ein Bild aus dem Pool, wie es Maske und Editor brauchen. */
export interface PoolImage {
  id: string;
  url: string;
  altDe: string;
  altEn: string | null;
  decorative: boolean;
  ai: boolean;
}

/**
 * Liest die Asset-IDs aus dem Formular: leere Werte raus, Dubletten raus,
 * Reihenfolge wie übergeben (sie ist die Reihenfolge im Pool).
 */
export function parseImageIds(values: readonly unknown[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of values) {
    const id = String(v ?? "").trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= MAX_DISPATCH_IMAGES) break;
  }
  return out;
}

/** Zeilen für `DispatchImage.createMany` in der gegebenen Reihenfolge. */
export function imageRows(
  dispatchId: string,
  assetIds: readonly string[],
): { dispatchId: string; assetId: string; sortOrder: number }[] {
  return assetIds.map((assetId, i) => ({ dispatchId, assetId, sortOrder: i }));
}

/** Bild-Zeile aus der Datenbank → Pool-Eintrag. */
export function toPoolImage(asset: {
  id: string;
  blobPath: string;
  altDe: string;
  altEn: string | null;
  decorative: boolean;
  source: string;
}): PoolImage {
  return {
    id: asset.id,
    url: assetUrl(asset.blobPath),
    altDe: asset.altDe,
    altEn: asset.altEn?.trim() ? asset.altEn : null,
    decorative: asset.decorative,
    ai: asset.source === "AI",
  };
}

/**
 * true, wenn die englische Seite für dieses Bild auf den deutschen Alt-Text
 * zurückfallen müsste. Dekorative Bilder brauchen keinen.
 */
export function lacksEnglishAlt(image: Pick<PoolImage, "altEn" | "decorative">): boolean {
  return !image.decorative && !image.altEn;
}

/**
 * Welche Bilder stecken in welchem Text? Ergebnis: Asset-ID → Sprachen, in
 * deren gespeichertem Text das Bild vorkommt. Kaputtes JSON zählt als leer.
 */
export function usageByLocale(
  translations: readonly { locale: string; bodyJson: string }[],
): Map<string, string[]> {
  const usage = new Map<string, string[]>();
  for (const t of translations) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(t.bodyJson);
    } catch {
      continue;
    }
    if (!isTiptapDoc(parsed)) continue;
    for (const id of collectAssetIds(parsed)) {
      const list = usage.get(id) ?? [];
      if (!list.includes(t.locale)) list.push(t.locale);
      usage.set(id, list);
    }
  }
  return usage;
}
