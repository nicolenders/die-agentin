// Reine Helfer für Identitäten (Phase 2). Keine DB, testbar. Enthält die
// Anzeige-Fallbacks (Deckname → Rolle) und die Kontrastprüfung für die
// Akzentfarbe (Phase 2.6, Validierung vor dem Veröffentlichen).

import type { Locale } from "@/lib/i18n/config";

/** Seiten-Hintergrund (styles/_tokens.scss `--ink`) — Bezug der Kontrastprüfung. */
export const INK = "#05010D";

/** Parst ein als JSON gespeichertes String-Array robust (leer bei Fehler). */
export function parseStringList(json: string | null | undefined): string[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json);
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

/** Serialisiert ein String-Array (leert Leerzeilen). */
export function serializeStringList(items: string[]): string {
  return JSON.stringify(items.map((s) => s.trim()).filter(Boolean));
}

export interface IdentityNaming {
  codenameDe: string;
  codenameEn: string;
  roleDe: string;
  roleEn: string;
}

/**
 * Anzeigename einer Identität. Solange kein Deckname gepflegt ist (STOP in
 * Phase 2.5 — Nicole füllt die Decknamen), fällt die Anzeige auf die Rolle
 * zurück. Fehlt die Sprachfassung, greift die jeweils andere.
 */
export function identityDisplayName(id: IdentityNaming, locale: Locale): string {
  const codename = locale === "de" ? id.codenameDe : id.codenameEn;
  const codenameOther = locale === "de" ? id.codenameEn : id.codenameDe;
  const role = locale === "de" ? id.roleDe : id.roleEn;
  const roleOther = locale === "de" ? id.roleEn : id.roleDe;
  return codename.trim() || codenameOther.trim() || role.trim() || roleOther.trim();
}

/** #rrggbb / #rgb → [r,g,b] (0–255) oder null bei ungültiger Eingabe. */
export function parseHex(hex: string): [number, number, number] | null {
  const value = hex.trim().replace(/^#/, "");
  const full = value.length === 3 ? value.split("").map((c) => c + c).join("") : value;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16)) as [number, number, number];
}

/** Relative Luminanz nach WCAG 2.1. */
export function relativeLuminance([r, g, b]: [number, number, number]): number {
  const channel = (c: number) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** Kontrastverhältnis zweier Hex-Farben (1–21) oder null bei ungültiger Eingabe. */
export function contrastRatio(hexA: string, hexB: string): number | null {
  const a = parseHex(hexA);
  const b = parseHex(hexB);
  if (!a || !b) return null;
  const la = relativeLuminance(a);
  const lb = relativeLuminance(b);
  const [hi, lo] = la > lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

/** Kontrast der Akzentfarbe gegen den dunklen Seitengrund (`--ink`). */
export function accentContrastOnInk(hex: string): number | null {
  return contrastRatio(hex, INK);
}

/**
 * Akzentfarbe für UI-Elemente (Punkte, Ränder, Labels) ausreichend? WCAG
 * verlangt für Nicht-Text-Kontraste 3:1. Gilt als Warnung, nicht als Blocker
 * (Phase 2.6): valide Hex-Farbe ist blockierend, schwacher Kontrast warnt.
 */
export function isAccentReadable(hex: string): boolean {
  const ratio = accentContrastOnInk(hex);
  return ratio !== null && ratio >= 3;
}

/** Nur gültige Hex-Farbe? (blockierende Pflichtprüfung) */
export function isValidHex(hex: string): boolean {
  return parseHex(hex) !== null;
}
