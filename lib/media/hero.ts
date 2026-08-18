import { assetUrl } from "./url";
import { isAiGenerated } from "./source";
import type { Locale } from "@/lib/i18n/config";

// Ein Titelbild („Hero") wird an mehreren Stellen aus derselben Zeile gebaut:
// Übersichtskarte, Detailseite, OpenGraph. Diese Abbildung liegt deshalb einmal
// hier, statt in jeder Query erneut ausgeschrieben zu werden.

/** Die Felder, die aus `MediaAsset` für ein Titelbild gebraucht werden. */
export interface HeroAssetRow {
  blobPath: string;
  width: number;
  height: number;
  altDe: string;
  altEn: string | null;
  decorative: boolean;
  source: string;
}

export interface HeroImage {
  url: string;
  /** Sprachrichtiger Alt-Text; bei dekorativen Bildern bewusst leer (SPEC §11). */
  alt: string;
  decorative: boolean;
  ai: boolean;
  width: number;
  height: number;
}

/**
 * Alt-Text in der gewünschten Sprache. Englisch nur, wenn gepflegt — sonst
 * greift Deutsch, damit ein Bild nie ohne Beschreibung dasteht.
 */
export function assetAlt(asset: HeroAssetRow, locale: Locale): string {
  if (asset.decorative) return "";
  return locale === "en" && asset.altEn ? asset.altEn : asset.altDe;
}

/** Baut das Titelbild einer Zeile; ohne zugewiesenes Bild: `null`. */
export function toHeroImage(
  asset: HeroAssetRow | null | undefined,
  locale: Locale,
): HeroImage | null {
  if (!asset) return null;
  return {
    url: assetUrl(asset.blobPath),
    alt: assetAlt(asset, locale),
    decorative: asset.decorative,
    ai: isAiGenerated(asset.source),
    width: asset.width,
    height: asset.height,
  };
}

/**
 * Absolute URL eines Mediums für OpenGraph und strukturierte Daten. Relative
 * Pfade (`/media/…`) bekommen den Origin davor; bereits absolute URLs bleiben,
 * wie sie sind.
 */
export function absoluteAssetUrl(url: string, origin: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  return `${origin.replace(/\/$/, "")}${url.startsWith("/") ? url : `/${url}`}`;
}
