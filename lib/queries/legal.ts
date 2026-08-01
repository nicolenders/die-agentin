import { db } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";

// Rechtstexte (SPEC §12): Struktur/Felder werden gepflegt, der Inhalt kommt von
// Nicole. Fehlt eine Sprache, wird auf DE zurückgefallen.

export const LEGAL_KEYS = ["IMPRINT", "PRIVACY", "ACCESSIBILITY"] as const;
export type LegalKey = (typeof LEGAL_KEYS)[number];

export const LEGAL_ROUTE: Record<string, LegalKey> = {
  impressum: "IMPRINT",
  datenschutz: "PRIVACY",
  barrierefreiheit: "ACCESSIBILITY",
};

export interface LegalContent {
  title: string;
  body: string;
  updatedAt: Date;
}

export async function getLegalDoc(
  docKey: LegalKey,
  locale: Locale,
): Promise<LegalContent | null> {
  try {
    const doc =
      (await db.legalDoc.findUnique({ where: { docKey_locale: { docKey, locale } } })) ??
      (await db.legalDoc.findUnique({ where: { docKey_locale: { docKey, locale: "de" } } }));
    if (!doc) return null;
    return { title: doc.title, body: doc.body, updatedAt: doc.updatedAt };
  } catch {
    return null;
  }
}
