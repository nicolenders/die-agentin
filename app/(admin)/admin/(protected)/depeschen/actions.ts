"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags, tags } from "@/lib/cache";
import { slugify } from "@/lib/slug";
import { berlinLocalToUtc } from "@/lib/time";
import { DISPATCH_FORMATS, CONTENT_STATUSES, isOneOf } from "@/lib/domain";
import { FOCUS_TAG } from "@/lib/queries/records";
import { checkName, findByName, type InlineCreateResult } from "@/lib/admin/inline-create";
import { RETURN_PARAM, safeReturnTo, withParams } from "@/lib/admin/return-to";

const LIST = "/admin/depeschen";
const EDIT = `${LIST}/bearbeiten`;

/** Die gefilterte Liste, aus der die Maske geöffnet wurde. */
function listFrom(formData: FormData): string {
  return safeReturnTo(String(formData.get(RETURN_PARAM) ?? ""), LIST);
}

/** Rückweg in die Maske, der die gefilterte Liste weiterträgt. */
function editHrefWithReturn(id: string | null, list: string): string {
  return withParams(EDIT, { id: id ?? undefined, [RETURN_PARAM]: list === LIST ? undefined : list });
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}
function ids(formData: FormData, key: string): string[] {
  return formData.getAll(key).map((v) => String(v)).filter(Boolean);
}

function invalidate(): void {
  // Radar-Themen zeigen öffentlich die Anzahl verknüpfter Depeschen — deren
  // Cache muss beim Speichern einer Depesche mitgehen.
  invalidateTags([tags.dispatchList("de"), tags.dispatchList("en"), FOCUS_TAG]);
}

interface Common {
  format: string;
  status: string;
  publishedAt: Date | null;
  reviewedAt: Date | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceSite: string | null;
  heroAssetId: string | null;
}
function commonData(formData: FormData): Common {
  const format = isOneOf(DISPATCH_FORMATS, str(formData, "format")) ? str(formData, "format") : "NOTE";
  const status = isOneOf(CONTENT_STATUSES, str(formData, "status")) ? str(formData, "status") : "DRAFT";
  const publishedAt = berlinLocalToUtc(str(formData, "publishedAt")) ?? (status === "PUBLISHED" ? new Date() : null);
  return {
    format,
    status,
    publishedAt,
    reviewedAt: berlinLocalToUtc(str(formData, "reviewedAt")),
    sourceUrl: str(formData, "sourceUrl") || null,
    sourceTitle: str(formData, "sourceTitle") || null,
    sourceSite: str(formData, "sourceSite") || null,
    heroAssetId: str(formData, "heroAssetId") || null,
  };
}

interface TransInput {
  locale: "de" | "en";
  slug: string;
  title: string;
  summary: string | null;
  bodyJson: string;
  tocEnabled: boolean;
}
function translations(formData: FormData, format: string): TransInput[] {
  const out: TransInput[] = [];
  const toc = format === "REFERENCE";
  const deTitle = str(formData, "deTitle");
  if (deTitle) {
    out.push({
      locale: "de",
      slug: slugify(str(formData, "deSlug") || deTitle),
      title: deTitle,
      summary: str(formData, "deSummary") || null,
      bodyJson: str(formData, "deBody") || '{"type":"doc","content":[]}',
      tocEnabled: toc,
    });
  }
  const enTitle = str(formData, "enTitle");
  if (enTitle) {
    out.push({
      locale: "en",
      slug: slugify(str(formData, "enSlug") || enTitle),
      title: enTitle,
      summary: str(formData, "enSummary") || null,
      bodyJson: str(formData, "enBody") || '{"type":"doc","content":[]}',
      tocEnabled: toc,
    });
  }
  return out;
}

export async function createDispatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const list = listFrom(formData);
  const c = commonData(formData);
  const trans = translations(formData, c.format);
  if (trans.length === 0 || trans[0]!.locale !== "de") {
    redirect(withParams(editHrefWithReturn(null, list), { err: "missing-fields" }));
  }

  let newId: string | null = null;
  try {
    const created = await db.dispatch.create({
      data: {
        ...c,
        publishAt: c.publishedAt,
        identities: { connect: ids(formData, "identityIds").map((id) => ({ id })) },
        topics: { connect: ids(formData, "topicIds").map((id) => ({ id })) },
        focusTopics: { connect: ids(formData, "focusTopicIds").map((id) => ({ id })) },
        // Admin-verfasste Übersetzungen gelten als geprüft (öffentlich sichtbar).
        translations: { create: trans.map((t) => ({ ...t, state: "REVIEWED" })) },
      },
    });
    newId = created.id;
  } catch {
    redirect(withParams(editHrefWithReturn(null, list), { err: "failed" }));
  }
  invalidate();
  redirect(withParams(editHrefWithReturn(newId, list), { ok: "created" }));
}

export async function updateDispatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const list = listFrom(formData);
  if (!id) redirect(withParams(list, { err: "not-found" }));
  const c = commonData(formData);
  const trans = translations(formData, c.format);
  if (trans.length === 0 || trans[0]!.locale !== "de") {
    redirect(withParams(editHrefWithReturn(id, list), { err: "missing-fields" }));
  }

  // Wird der Termin verschoben, gilt die Erinnerung als verbraucht: sie wird
  // zurückgesetzt, damit der NEUE Termin wieder erinnert wird.
  let resetReminder = false;
  try {
    const before = await db.dispatch.findUnique({ where: { id }, select: { publishAt: true } });
    resetReminder = (before?.publishAt?.getTime() ?? null) !== (c.publishedAt?.getTime() ?? null);
  } catch {
    // Kann der Vorzustand nicht gelesen werden, bleibt die Erinnerung stehen.
  }

  try {
    await db.$transaction([
      db.dispatch.update({
        where: { id },
        data: {
          ...c,
          publishAt: c.publishedAt,
          ...(resetReminder ? { reminderSentAt: null } : {}),
          identities: { set: ids(formData, "identityIds").map((x) => ({ id: x })) },
          topics: { set: ids(formData, "topicIds").map((x) => ({ id: x })) },
          focusTopics: { set: ids(formData, "focusTopicIds").map((x) => ({ id: x })) },
        },
      }),
      db.dispatchTranslation.deleteMany({ where: { dispatchId: id } }),
      db.dispatchTranslation.createMany({ data: trans.map((t) => ({ ...t, dispatchId: id, state: "REVIEWED" })) }),
    ]);
  } catch {
    redirect(withParams(editHrefWithReturn(id, list), { err: "failed" }));
  }
  invalidate();
  redirect(withParams(editHrefWithReturn(id, list), { ok: "updated" }));
}

export async function deleteDispatch(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  // Zurück in die Liste, aus der gelöscht wurde — mit ihren Filtern.
  const list = listFrom(formData);
  if (!id) redirect(withParams(list, { err: "not-found" }));
  let failed = false;
  try {
    await db.dispatch.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(withParams(list, { err: "failed" }));
  invalidate();
  redirect(withParams(list, { ok: "deleted" }));
}

// ---------------------------------------------------------------------------
// Anlegen aus der Maske heraus
//
// Beim Schreiben einer Depesche fällt einem das passende Fachgebiet oder
// Radar-Thema ein — und bis hierher hieß das: Formular verlassen, unter
// Stammdaten bzw. Aufklärung anlegen, zurückkommen, alles neu eintippen.
// Diese beiden Aktionen legen den Eintrag an Ort und Stelle an und geben ihn
// zurück, damit die Auswahl ihn sofort anbieten kann. Sie leiten deshalb NICHT
// um: das Formular soll stehen bleiben, wie es ist.
//
// Beide sind gutmütig gegenüber Doppeleingaben: Gibt es den Namen schon, wird
// der vorhandene Eintrag zurückgegeben und ausgewählt, statt einen zweiten
// anzulegen. Bei Radar-Themen läuft die Wiedererkennung ohnehin über den
// exakten deutschen Titel.
// ---------------------------------------------------------------------------

/** Legt ein Fachgebiet an (Taxonomy, kind = DOSSIER) und gibt es zurück. */
export async function createTopicInline(rawName: string): Promise<InlineCreateResult> {
  await requireAdmin();
  const checked = checkName(rawName);
  if (!checked.ok) return checked;
  const name = checked.name;

  try {
    const existing = await db.taxonomy.findMany({
      where: { kind: "DOSSIER" },
      select: { id: true, nameDe: true },
    });
    const match = findByName(
      existing.map((t) => ({ id: t.id, name: t.nameDe })),
      name,
    );
    if (match) return { ok: true, option: match, existed: true };

    // Der Slug ist je Art eindeutig. Kollidiert er (zwei Namen, ein Slug),
    // wird durchnummeriert, statt die Eingabe abzulehnen.
    const base = slugify(name) || "fachgebiet";
    let slug = base;
    for (let n = 2; await db.taxonomy.findUnique({ where: { kind_slug: { kind: "DOSSIER", slug } } }); n += 1) {
      slug = `${base}-${n}`;
    }
    const last = await db.taxonomy.findFirst({
      where: { kind: "DOSSIER" },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const created = await db.taxonomy.create({
      data: {
        kind: "DOSSIER",
        nameDe: name,
        // Englisch bleibt zunächst gleich; gepflegt wird es unter Stammdaten.
        nameEn: name,
        slug,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
      select: { id: true, nameDe: true },
    });
    invalidateTags([tags.dossierList("de"), tags.dossierList("en")]);
    return { ok: true, option: { id: created.id, name: created.nameDe }, existed: false };
  } catch {
    return { ok: false, error: "Anlegen fehlgeschlagen. Bitte erneut versuchen." };
  }
}

/**
 * Legt ein Radar-Thema an (FocusTopic) und gibt es zurück. `identityIds` sind
 * die in der Maske gerade gewählten Identitäten: Ein Radar-Thema ohne
 * Zuordnung bleibt global und hat keine Farbe, deshalb erbt es hier die
 * Identitäten der Depesche, aus der heraus es entsteht.
 */
export async function createFocusTopicInline(
  rawName: string,
  identityIds: string[],
): Promise<InlineCreateResult> {
  await requireAdmin();
  const checked = checkName(rawName);
  if (!checked.ok) return checked;
  const name = checked.name;

  try {
    const existing = await db.focusTopic.findMany({ select: { id: true, titleDe: true } });
    const match = findByName(
      existing.map((t) => ({ id: t.id, name: t.titleDe })),
      name,
    );
    if (match) return { ok: true, option: match, existed: true };

    const last = await db.focusTopic.findFirst({
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const created = await db.focusTopic.create({
      data: {
        titleDe: name,
        sortOrder: (last?.sortOrder ?? 0) + 1,
        identities: { connect: identityIds.map((id) => ({ id })) },
      },
      select: { id: true, titleDe: true },
    });
    invalidateTags([FOCUS_TAG]);
    return { ok: true, option: { id: created.id, name: created.titleDe }, existed: false };
  } catch {
    return { ok: false, error: "Anlegen fehlgeschlagen. Bitte erneut versuchen." };
  }
}
