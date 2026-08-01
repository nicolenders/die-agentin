"use server";

import { requireAdmin, ForbiddenError } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { serializeDocument, sanitizeDocument } from "@/lib/content/sanitize";
import { slugify } from "@/lib/slug";
import { berlinLocalToUtc } from "@/lib/time";
import { invalidateTags, tags } from "@/lib/cache";
import { translateDocument, translateTexts, TranslationUnavailableError } from "@/lib/translate/foundry";
import { emptyDoc } from "@/lib/content/schema";
import type { Locale } from "@/lib/i18n/config";

export interface DossierTranslationInput {
  title: string;
  summary: string;
  bodyJson: string;
  confirmed?: boolean; // EN erst nach Bestätigung REVIEWED (SPEC §8)
}

export interface SaveDossierInput {
  dossierId?: string;
  categoryId?: string | null;
  tocEnabled: boolean;
  publishAtLocal?: string;
  de: DossierTranslationInput;
  en?: DossierTranslationInput | null;
  intent: "draft" | "publish";
}

export interface SaveDossierResult {
  ok: boolean;
  dossierId?: string;
  status?: string;
  error?: string;
}

async function uniqueSlug(locale: Locale, desired: string, dossierId?: string): Promise<string> {
  const base = desired || "dossier";
  let candidate = base;
  let n = 1;
  while (true) {
    const existing = await db.dossierTranslation.findFirst({
      where: { locale, slug: candidate, NOT: dossierId ? { dossierId } : undefined },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

function parse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export async function saveDossier(input: SaveDossierInput): Promise<SaveDossierResult> {
  let actor: string;
  try {
    const user = await requireAdmin();
    actor = user.email ?? user.oid ?? "admin";
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: error.message };
    throw error;
  }

  if (input.intent === "publish" && input.de.title.trim().length === 0) {
    return { ok: false, error: "Noch nicht veröffentlichbar: Titel fehlt." };
  }

  const deBody = serializeDocument(parse(input.de.bodyJson), "dossier");
  const enBody = input.en ? serializeDocument(parse(input.en.bodyJson), "dossier") : null;
  const status = input.intent === "publish" ? "PUBLISHED" : "DRAFT";
  const publishAt = berlinLocalToUtc(input.publishAtLocal);
  const now = new Date();

  try {
    const dossier = await db.dossier.upsert({
      where: { id: input.dossierId ?? "__new__" },
      create: {
        id: input.dossierId,
        status,
        categoryId: input.categoryId ?? undefined,
        publishAt: publishAt ?? undefined,
        reviewedAt: now,
      },
      update: {
        status,
        categoryId: input.categoryId ?? null,
        publishAt: publishAt ?? undefined,
        reviewedAt: now,
      },
    });

    const deSlug = await uniqueSlug("de", slugify(input.de.title), dossier.id);
    await upsertDossierTranslation(dossier.id, "de", deSlug, input.de, deBody, "REVIEWED", input.tocEnabled);

    if (input.en && enBody) {
      const enSlug = await uniqueSlug("en", slugify(input.en.title), dossier.id);
      // AI-Entwurf bleibt AI_DRAFT bis zur Bestätigung (SPEC §8).
      const enState = input.en.confirmed ? "REVIEWED" : "AI_DRAFT";
      await upsertDossierTranslation(dossier.id, "en", enSlug, input.en, enBody, enState, input.tocEnabled);
    }

    await db.auditLog.create({
      data: { actor, action: `dossier.${input.intent}`, entity: "dossier", entityId: dossier.id, detail: `status=${status}` },
    });

    if (status === "PUBLISHED") {
      invalidateTags([tags.dossier(dossier.id), tags.dossierList("de"), tags.dossierList("en")]);
    }

    return { ok: true, dossierId: dossier.id, status };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Speichern fehlgeschlagen." };
  }
}

async function upsertDossierTranslation(
  dossierId: string,
  locale: Locale,
  slug: string,
  t: DossierTranslationInput,
  body: string,
  state: string,
  tocEnabled: boolean,
): Promise<void> {
  const existing = await db.dossierTranslation.findUnique({
    where: { dossierId_locale: { dossierId, locale } },
    select: { slug: true },
  });
  await db.dossierTranslation.upsert({
    where: { dossierId_locale: { dossierId, locale } },
    create: { dossierId, locale, slug, title: t.title, summary: t.summary, bodyJson: body, tocEnabled, state },
    update: { slug: existing?.slug ?? slug, title: t.title, summary: t.summary, bodyJson: body, tocEnabled, state },
  });
}

export interface TranslationDraft {
  ok: boolean;
  title?: string;
  summary?: string;
  bodyJson?: string;
  error?: string;
}

/**
 * Erzeugt einen EN-Rohübersetzungsvorschlag (SPEC §8). Ergebnis ist ein
 * KI-Entwurf, den die Redaktion bestätigen muss — es wird nichts automatisch
 * veröffentlicht.
 */
export async function suggestDossierTranslation(de: {
  title: string;
  summary: string;
  bodyJson: string;
}): Promise<TranslationDraft> {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: error.message };
    throw error;
  }

  try {
    const [title = "", summary = ""] = await translateTexts([de.title, de.summary], "de", "en");
    const doc = sanitizeDocument(parse(de.bodyJson) ?? emptyDoc(), "dossier");
    const translatedDoc = await translateDocument(doc, "de", "en", "dossier");
    return { ok: true, title, summary, bodyJson: JSON.stringify(translatedDoc) };
  } catch (error) {
    if (error instanceof TranslationUnavailableError) {
      return { ok: false, error: error.message };
    }
    return { ok: false, error: error instanceof Error ? error.message : "Übersetzung fehlgeschlagen." };
  }
}
