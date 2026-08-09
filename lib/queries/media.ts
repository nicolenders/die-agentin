import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import { toMediaSource, type MediaSource } from "@/lib/media/source";
import { collectAssetIds } from "@/lib/content/assets";
import { isTiptapDoc, type TiptapDoc } from "@/lib/content/schema";
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
        ai: a.source === "AI",
      };
    }
    return map;
  } catch {
    return {};
  }
}

// --------------------------------------------------------------- Bibliothek

export interface MediaUsage {
  type: string; // z. B. „Einsatz", „Dossier", „Beitrag"
  label: string; // Titel des verwendenden Eintrags
}

export interface MediaLibraryItem {
  id: string;
  url: string;
  altDe: string;
  altEn: string | null;
  decorative: boolean;
  source: MediaSource;
  width: number;
  height: number;
  createdAt: Date;
  usages: MediaUsage[];
}

function parseDoc(json: string): TiptapDoc | null {
  try {
    const parsed: unknown = JSON.parse(json);
    return isTiptapDoc(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Alle Bilder mit Metadaten und Verwendungsnachweis („wo verwendet"): direkte
 * Referenzen (Banner, Cover, Logo, Porträt, Hero, Einsatzfotos) plus Inline-
 * Bilder in Beitrags- und Dossier-Inhalten. So sieht man je Bild, in welchem
 * Einsatz/Dossier/Beitrag es steckt.
 */
export async function getMediaLibrary(): Promise<MediaLibraryItem[]> {
  const [assets, missions, posts, dossiers, publications, certifications, legend, home] =
    await Promise.all([
      db.mediaAsset.findMany({ orderBy: { createdAt: "desc" }, take: 500 }),
      db.mission.findMany({
        select: { eventName: true, bannerAssetId: true, photos: { select: { assetId: true } } },
      }),
      db.post.findMany({
        select: { heroAssetId: true, translations: { select: { locale: true, title: true, bodyJson: true } } },
      }),
      db.dossier.findMany({
        select: { translations: { select: { locale: true, title: true, bodyJson: true } } },
      }),
      db.publication.findMany({
        select: { coverAssetId: true, translations: { select: { locale: true, title: true } } },
      }),
      db.certification.findMany({ select: { name: true, logoAssetId: true } }),
      db.legendContent.findMany({ select: { portraitAssetId: true } }),
      db.homeContent.findMany({ select: { heroAssetId: true } }),
    ]);

  const usage = new Map<string, MediaUsage[]>();
  const add = (id: string | null | undefined, u: MediaUsage) => {
    if (!id) return;
    const list = usage.get(id) ?? [];
    list.push(u);
    usage.set(id, list);
  };
  const deTitle = (ts: { locale: string; title: string }[], fallback: string) =>
    ts.find((t) => t.locale === "de")?.title ?? ts[0]?.title ?? fallback;

  for (const m of missions) {
    add(m.bannerAssetId, { type: "Einsatz", label: m.eventName });
    for (const p of m.photos) add(p.assetId, { type: "Einsatz (Foto)", label: m.eventName });
  }
  for (const p of posts) {
    const title = deTitle(p.translations, "Beitrag");
    add(p.heroAssetId, { type: "Beitrag", label: title });
    for (const t of p.translations) {
      const doc = parseDoc(t.bodyJson);
      if (doc) for (const id of collectAssetIds(doc)) add(id, { type: "Beitrag", label: title });
    }
  }
  for (const d of dossiers) {
    const title = deTitle(d.translations, "Dossier");
    for (const t of d.translations) {
      const doc = parseDoc(t.bodyJson);
      if (doc) for (const id of collectAssetIds(doc)) add(id, { type: "Dossier", label: title });
    }
  }
  for (const pub of publications) {
    add(pub.coverAssetId, { type: "Publikation", label: deTitle(pub.translations, "Publikation") });
  }
  for (const c of certifications) add(c.logoAssetId, { type: "Ausbildung", label: c.name });
  for (const l of legend) add(l.portraitAssetId, { type: "Legende", label: "Über mich" });
  for (const h of home) add(h.heroAssetId, { type: "Startseite", label: "Hero" });

  return assets.map((a) => {
    const raw = usage.get(a.id) ?? [];
    const seen = new Set<string>();
    const usages = raw.filter((u) => {
      const key = `${u.type}|${u.label}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    return {
      id: a.id,
      url: assetUrl(a.blobPath),
      altDe: a.altDe,
      altEn: a.altEn,
      decorative: a.decorative,
      source: toMediaSource(a.source),
      width: a.width,
      height: a.height,
      createdAt: a.createdAt,
      usages,
    };
  });
}
