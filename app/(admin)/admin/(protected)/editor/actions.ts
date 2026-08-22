"use server";

import { randomUUID } from "node:crypto";
import { requireAdmin, ForbiddenError } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { serializeDocument, sanitizeDocument } from "@/lib/content/sanitize";
import { collectAssetIds } from "@/lib/content/assets";
import { buildChecklist } from "@/lib/content/checklist";
import { slugify } from "@/lib/slug";
import { berlinLocalToUtc } from "@/lib/time";
import { invalidateTags, tags } from "@/lib/cache";
import { POST_TYPES, isOneOf, type PostType } from "@/lib/domain";
import { createPreviewToken } from "@/lib/preview/token";
import type { Locale } from "@/lib/i18n/config";

export interface TranslationInput {
  title: string;
  summary: string;
  bodyJson: string; // TipTap-JSON als String
  socialText?: string;
}

export interface SavePostInput {
  postId?: string;
  type: string;
  publishAtLocal?: string;
  missionId?: string | null;
  dossierId?: string | null;
  de: TranslationInput;
  en?: TranslationInput | null;
  intent: "draft" | "schedule" | "publish";
}

export interface SavePostResult {
  ok: boolean;
  postId?: string;
  status?: string;
  error?: string;
}

async function ensureUniqueSlug(
  locale: Locale,
  desired: string,
  postId: string | undefined,
): Promise<string> {
  const base = desired || "beitrag";
  let candidate = base;
  let n = 1;
  // Kollidiert der Slug mit einer ANDEREN Übersetzung, Suffix anhängen.
  while (true) {
    const existing = await db.postTranslation.findFirst({
      where: { locale, slug: candidate, NOT: postId ? { postId } : undefined },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

async function countImagesWithoutAlt(bodyJsons: string[]): Promise<number> {
  const ids = new Set<string>();
  for (const body of bodyJsons) {
    try {
      const doc = sanitizeDocument(JSON.parse(body), "post");
      collectAssetIds(doc).forEach((id) => ids.add(id));
    } catch {
      // ignorieren
    }
  }
  if (ids.size === 0) return 0;
  const assets = await db.mediaAsset.findMany({
    where: { id: { in: [...ids] } },
    select: { id: true, altDe: true, decorative: true },
  });
  const byId = new Map(assets.map((a) => [a.id, a]));
  let missing = 0;
  for (const id of ids) {
    const a = byId.get(id);
    if (!a) missing += 1; // referenziertes Asset existiert nicht
    else if (!a.decorative && a.altDe.trim().length === 0) missing += 1;
  }
  return missing;
}

/**
 * Legt einen Beitrag an oder aktualisiert ihn. Erste Zeile: Rollenprüfung
 * (SPEC §9). Bereinigt Inhalte, friert Slugs ein und setzt bei „publish" nur
 * bei grüner Prüfliste auf PUBLISHED (SPEC §6).
 */
export async function savePost(input: SavePostInput): Promise<SavePostResult> {
  let actor: string;
  try {
    const user = await requireAdmin();
    actor = user.email ?? user.oid ?? "admin";
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: error.message };
    throw error;
  }

  if (!isOneOf(POST_TYPES, input.type)) {
    return { ok: false, error: "Unbekannter Beitragstyp." };
  }
  const type = input.type as PostType;

  const deBody = serializeDocument(safeParse(input.de.bodyJson), "post");
  const enBody = input.en ? serializeDocument(safeParse(input.en.bodyJson), "post") : null;

  // Prüfliste (SPEC §6) bei Veröffentlichung.
  if (input.intent === "publish") {
    const imagesWithoutAlt = await countImagesWithoutAlt(
      [input.de.bodyJson, input.en?.bodyJson].filter((b): b is string => Boolean(b)),
    );
    const checklist = buildChecklist({
      deTitle: input.de.title,
      deSummary: input.de.summary,
      hasGermanBody: true,
      imagesWithoutAlt,
      enPresent: Boolean(input.en),
    });
    if (!checklist.canPublish) {
      const missing = checklist.items
        .filter((i) => i.level === "error")
        .map((i) => i.label)
        .join("; ");
      return { ok: false, error: `Noch nicht veröffentlichbar: ${missing}` };
    }
  }

  const publishAt =
    input.intent === "publish"
      ? new Date()
      : input.intent === "schedule"
        ? berlinLocalToUtc(input.publishAtLocal)
        : berlinLocalToUtc(input.publishAtLocal);
  const status =
    input.intent === "publish"
      ? "PUBLISHED"
      : input.intent === "schedule"
        ? "SCHEDULED"
        : "DRAFT";
  const publishedAt = input.intent === "publish" ? new Date() : undefined;

  try {
    const deSlug = await ensureUniqueSlug("de", slugify(input.de.title), input.postId);
    const enSlug = input.en
      ? await ensureUniqueSlug("en", slugify(input.en.title), input.postId)
      : null;

    const post = await db.post.upsert({
      // Für neue Beiträge ein garantiert nicht existierender Lookup-Wert, damit
      // upsert sicher den create-Zweig nimmt (die tatsächliche id wird unten in
      // `create` als cuid vergeben). Verhindert das versehentliche Überschreiben
      // eines real existierenden Datensatzes über einen Sentinel-Wert.
      where: { id: input.postId ?? `new-${randomUUID()}` },
      create: {
        id: input.postId,
        type,
        status,
        publishAt: publishAt ?? undefined,
        publishedAt,
        missionId: input.missionId ?? undefined,
        dossierId: input.dossierId ?? undefined,
        translations: {
          create: [
            {
              locale: "de",
              slug: deSlug,
              title: input.de.title,
              summary: input.de.summary,
              bodyJson: deBody,
              socialText: input.de.socialText,
              state: "REVIEWED",
            },
            ...(input.en && enBody
              ? [
                  {
                    locale: "en" as const,
                    slug: enSlug ?? slugify(input.en.title),
                    title: input.en.title,
                    summary: input.en.summary,
                    bodyJson: enBody,
                    socialText: input.en.socialText,
                    state: "REVIEWED" as const,
                  },
                ]
              : []),
          ],
        },
      },
      update: {
        type,
        status,
        publishAt: publishAt ?? undefined,
        publishedAt,
        missionId: input.missionId ?? null,
        dossierId: input.dossierId ?? null,
      },
    });

    // Übersetzungen bei Update angleichen (Slug bleibt eingefroren).
    if (input.postId) {
      await upsertTranslation(post.id, "de", deSlug, input.de, deBody);
      if (input.en && enBody) {
        await upsertTranslation(post.id, "en", enSlug ?? slugify(input.en.title), input.en, enBody);
      }
    }


    await db.auditLog.create({
      data: {
        actor,
        action: `post.${input.intent}`,
        entity: "post",
        entityId: post.id,
        detail: `status=${status}`,
      },
    });

    if (status === "PUBLISHED") {
      invalidateTags([tags.post(post.id), tags.postList("de"), tags.postList("en")]);
    }

    return { ok: true, postId: post.id, status };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Speichern fehlgeschlagen.";
    return { ok: false, error: message };
  }
}

/** Erzeugt einen teilbaren, 7 Tage gültigen Vorschau-Link (SPEC §6). */
export async function createPreviewLink(postId: string): Promise<{ url?: string; error?: string }> {
  try {
    await requireAdmin();
  } catch (error) {
    if (error instanceof ForbiddenError) return { error: error.message };
    throw error;
  }
  const token = createPreviewToken("post", postId);
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  return { url: `${site}/preview/${token}` };
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

async function upsertTranslation(
  postId: string,
  locale: Locale,
  slug: string,
  t: TranslationInput,
  body: string,
): Promise<void> {
  const existing = await db.postTranslation.findUnique({
    where: { postId_locale: { postId, locale } },
    select: { id: true, slug: true },
  });
  await db.postTranslation.upsert({
    where: { postId_locale: { postId, locale } },
    create: {
      postId,
      locale,
      slug,
      title: t.title,
      summary: t.summary,
      bodyJson: body,
      socialText: t.socialText,
      state: "REVIEWED",
    },
    update: {
      // Slug eingefroren: vorhandenen Slug behalten (SPEC §5).
      slug: existing?.slug ?? slug,
      title: t.title,
      summary: t.summary,
      bodyJson: body,
      socialText: t.socialText,
    },
  });
}

