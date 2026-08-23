"use server";

import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { invalidateTags, tags } from "@/lib/cache";
import { PUBLICATION_TYPES, CERTIFICATION_STATUSES, isOneOf } from "@/lib/domain";
import { toCertKind, toCertFamily } from "@/lib/records/kind";
import { FOCUS_TAG } from "@/lib/queries/records";
import { MAX_IMPORT_LINES, extractYouTubeId, parseVideoList } from "@/lib/video/youtube";
import { attachVideoThumbnail, saveVideoPublication } from "@/lib/video/save";

const LIST = "/admin/publikationen";
const CERT_LIST = "/admin/ausbildung";
const FOCUS_LIST = "/admin/aufklaerung";

function monthToDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(`${value}-01T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function str(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function invalidatePublications(): void {
  invalidateTags([tags.publicationList("de"), tags.publicationList("en")]);
}
function invalidateCertifications(): void {
  invalidateTags([tags.certificationList("de"), tags.certificationList("en")]);
}

// ---------------------------------------------------------------- Publikationen

export async function createPublication(formData: FormData): Promise<void> {
  await requireAdmin();
  const deTitle = str(formData, "deTitle");
  if (!deTitle) redirect(`${LIST}?err=missing-fields`);

  const type = isOneOf(PUBLICATION_TYPES, str(formData, "type")) ? str(formData, "type") : "ARTICLE";
  const year = Number(formData.get("year") ?? 0) || new Date().getUTCFullYear();

  let failed = false;
  try {
    await db.publication.create({
      data: {
        type,
        year,
        isbn: str(formData, "isbn") || null,
        publisher: str(formData, "publisher") || null,
        url: str(formData, "url") || null,
        repoUrl: str(formData, "repoUrl") || null,
        language: str(formData, "language") || null,
        coverAssetId: str(formData, "coverAssetId") || null,
        translations: { create: [{ locale: "de", title: deTitle, role: str(formData, "role") || null, description: str(formData, "description") || null }] },
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidatePublications();
  redirect(`${LIST}?ok=created`);
}

export async function updatePublication(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);
  const deTitle = str(formData, "deTitle");
  if (!deTitle) redirect(`${LIST}/bearbeiten?pub=${id}&err=missing-fields`);

  const type = isOneOf(PUBLICATION_TYPES, str(formData, "type")) ? str(formData, "type") : "ARTICLE";
  const year = Number(formData.get("year") ?? 0) || new Date().getUTCFullYear();

  let failed = false;
  try {
    await db.publication.update({
      where: { id },
      data: {
        type,
        year,
        isbn: str(formData, "isbn") || null,
        publisher: str(formData, "publisher") || null,
        url: str(formData, "url") || null,
        repoUrl: str(formData, "repoUrl") || null,
        language: str(formData, "language") || null,
        coverAssetId: str(formData, "coverAssetId") || null,
        translations: {
          upsert: {
            where: { publicationId_locale: { publicationId: id, locale: "de" } },
            create: { locale: "de", title: deTitle, role: str(formData, "role") || null, description: str(formData, "description") || null },
            update: { title: deTitle, role: str(formData, "role") || null, description: str(formData, "description") || null },
          },
        },
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}/bearbeiten?pub=${id}&err=failed`);
  invalidatePublications();
  redirect(`${LIST}?ok=updated`);
}

// ------------------------------------------------------- Verkaufszahlen (Bücher)

// Ganzzahl inkl. negativer Werte: Retouren (zurückgegebene Exemplare) werden am
// Ende einer Laufzeit als negative Zahl erfasst und mindern die Summe.
function intField(formData: FormData, key: string): number {
  const n = Number(formData.get(key) ?? 0);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

/** Legt eine Halbjahres-Zeile an oder aktualisiert sie (per Periode eindeutig). */
export async function savePublicationSales(formData: FormData): Promise<void> {
  await requireAdmin();
  const publicationId = str(formData, "publicationId");
  const period = str(formData, "period");
  const edit = `${LIST}/bearbeiten?pub=${publicationId}`;
  if (!publicationId) redirect(`${LIST}?err=not-found`);
  if (!period) redirect(`${edit}&err=missing-fields`);
  const printedCount = intField(formData, "printedCount");
  const pdfCount = intField(formData, "pdfCount");
  const bundleCount = intField(formData, "bundleCount");
  try {
    await db.publicationSales.upsert({
      where: { publicationId_period: { publicationId, period } },
      create: { publicationId, period, printedCount, pdfCount, bundleCount },
      update: { printedCount, pdfCount, bundleCount },
    });
  } catch {
    redirect(`${edit}&err=failed`);
  }
  invalidatePublications();
  redirect(`${edit}&ok=sales`);
}

export async function deletePublicationSales(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const publicationId = str(formData, "publicationId");
  try {
    await db.publicationSales.delete({ where: { id } });
  } catch {
    // bereits entfernt → ignorieren
  }
  invalidatePublications();
  redirect(`${LIST}/bearbeiten?pub=${publicationId}&ok=sales-deleted`);
}

export async function deletePublication(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${LIST}?err=not-found`);

  let failed = false;
  try {
    await db.publication.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${LIST}?err=failed`);
  invalidatePublications();
  redirect(`${LIST}?ok=deleted`);
}

// -------------------------------------------------------- Zertifizierungen

export async function createCertification(formData: FormData): Promise<void> {
  await requireAdmin();
  const name = str(formData, "name");
  const status = isOneOf(CERTIFICATION_STATUSES, str(formData, "status")) ? str(formData, "status") : "ACHIEVED";
  // Geplante Zertifizierungen brauchen kein Erwerbsdatum; als Platzhalter now.
  const acquiredOn = monthToDate(str(formData, "acquiredOn")) ?? (status === "PLANNED" ? new Date() : null);
  if (!name || !acquiredOn) redirect(`${CERT_LIST}?err=missing-fields`);

  let failed = false;
  try {
    await db.certification.create({
      data: {
        name,
        kind: toCertKind(str(formData, "kind")),
        family: toCertFamily(str(formData, "family")),
        status,
        plannedFor: str(formData, "plannedFor") || null,
        shortCode: str(formData, "shortCode") || null,
        acquiredOn,
        validUntil: monthToDate(str(formData, "validUntil")),
        proofUrl: str(formData, "proofUrl") || null,
        series: str(formData, "series") || null,
        logoAssetId: str(formData, "logoAssetId") || null,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${CERT_LIST}?err=failed`);
  invalidateCertifications();
  redirect(`${CERT_LIST}?ok=created`);
}

export async function updateCertification(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${CERT_LIST}?err=not-found`);
  const name = str(formData, "name");
  const status = isOneOf(CERTIFICATION_STATUSES, str(formData, "status")) ? str(formData, "status") : "ACHIEVED";
  const acquiredOn = monthToDate(str(formData, "acquiredOn")) ?? (status === "PLANNED" ? new Date() : null);
  if (!name || !acquiredOn) redirect(`${CERT_LIST}/bearbeiten?cert=${id}&err=missing-fields`);


  let failed = false;
  try {
    await db.certification.update({
      where: { id },
      data: {
        name,
        kind: toCertKind(str(formData, "kind")),
        family: toCertFamily(str(formData, "family")),
        status,
        plannedFor: str(formData, "plannedFor") || null,
        shortCode: str(formData, "shortCode") || null,
        acquiredOn,
        validUntil: monthToDate(str(formData, "validUntil")),
        proofUrl: str(formData, "proofUrl") || null,
        series: str(formData, "series") || null,
        logoAssetId: str(formData, "logoAssetId") || null,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${CERT_LIST}/bearbeiten?cert=${id}&err=failed`);
  invalidateCertifications();
  redirect(`${CERT_LIST}?ok=updated`);
}

// Reihenfolge einer Zertifizierung innerhalb ihrer Art um eine Position
// verschieben. sortOrder gilt gruppenweise (je kind): Wir normalisieren die
// Werte der Gruppe auf fortlaufende Indizes und tauschen den Nachbarn — so ist
// die Reihenfolge deterministisch, auch wenn bisher alles sortOrder=0 war.
export async function reorderCertification(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const dir = str(formData, "dir"); // "up" | "down"
  if (!id) redirect(`${CERT_LIST}?err=not-found`);

  let failed = false;
  try {
    const target = await db.certification.findUnique({ where: { id }, select: { kind: true } });
    if (target) {
      const group = await db.certification.findMany({
        where: { kind: target.kind },
        orderBy: [{ sortOrder: "asc" }, { acquiredOn: "desc" }],
        select: { id: true },
      });
      const index = group.findIndex((g) => g.id === id);
      const swapWith = dir === "down" ? index + 1 : index - 1;
      const order = group.map((g) => g.id);
      const a = order[index];
      const b = order[swapWith];
      if (a !== undefined && b !== undefined) {
        order[index] = b;
        order[swapWith] = a;
        await db.$transaction(
          order.map((gid, i) => db.certification.update({ where: { id: gid }, data: { sortOrder: i } })),
        );
      }
    }
  } catch {
    failed = true;
  }
  if (failed) redirect(`${CERT_LIST}?err=failed`);
  invalidateCertifications();
  redirect(`${CERT_LIST}?ok=reordered`);
}

export async function deleteCertification(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${CERT_LIST}?err=not-found`);

  let failed = false;
  try {
    await db.certification.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${CERT_LIST}?err=failed`);
  invalidateCertifications();
  redirect(`${CERT_LIST}?ok=deleted`);
}

// ------------------------------------------------ Aktuelle Lernthemen

export async function createFocusTopic(formData: FormData): Promise<void> {
  await requireAdmin();
  const titleDe = str(formData, "titleDe");
  if (!titleDe) redirect(`${FOCUS_LIST}?err=missing-fields`);
  let failed = false;
  try {
    await db.focusTopic.create({
      data: {
        titleDe,
        titleEn: str(formData, "titleEn") || null,
        note: str(formData, "note") || null,
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${FOCUS_LIST}?err=failed`);
  invalidateTags([FOCUS_TAG]);
  redirect(`${FOCUS_LIST}?ok=created`);
}

/**
 * Ein Radar-Thema ändern. Bis hierher ließ sich ein Thema nur anlegen oder
 * entfernen — ein Tippfehler bedeutete löschen und neu anlegen, samt Verlust
 * aller Verknüpfungen zu Depeschen und Identitäten.
 *
 * Bearbeitet wird auf eigener Seite; nach dem Speichern geht es zurück auf die
 * Übersicht, weil man dort weiterarbeitet.
 */
export async function updateFocusTopic(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  const titleDe = str(formData, "titleDe");
  if (!id) redirect(`${FOCUS_LIST}?err=not-found`);
  if (!titleDe) redirect(`/admin/aufklaerung/bearbeiten?id=${id}&err=missing-fields`);

  const sortRaw = Number.parseInt(String(formData.get("sortOrder") ?? ""), 10);
  let failed = false;
  try {
    await db.focusTopic.update({
      where: { id },
      data: {
        titleDe,
        titleEn: str(formData, "titleEn") || null,
        note: str(formData, "note") || null,
        active: formData.get("active") === "on",
        ...(Number.isFinite(sortRaw) ? { sortOrder: sortRaw } : {}),
      },
    });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${FOCUS_LIST}?err=failed`);
  invalidateTags([FOCUS_TAG]);
  redirect(`${FOCUS_LIST}?ok=updated`);
}

export async function deleteFocusTopic(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${FOCUS_LIST}?err=not-found`);
  let failed = false;
  try {
    await db.focusTopic.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect(`${FOCUS_LIST}?err=failed`);
  invalidateTags([FOCUS_TAG]);
  redirect(`${FOCUS_LIST}?ok=deleted`);
}

// ------------------------------------------------------------------- Videos
//
// Ein Video ist eine Publikation mit `type = "VIDEO"`: die Adresse in `url`,
// der Kanal in `publisher`, das Vorschaubild in `coverAsset`. Keine eigene
// Tabelle, keine neue Spalte, keine Migration — die Kennung steckt in der
// Adresse und wird bei Bedarf herausgelesen.

const VIDEO_LIST = `${LIST}?tab=videos`;

/**
 * Sammel-Import: eine Adresse je Zeile, optional `| Jahr` dahinter.
 *
 * Für „super viele Videos, verteilt auf viele Kanäle" ist das der eigentliche
 * Weg — jedes einzeln durch ein Formular zu tragen wäre eine Nachmittagsaufgabe.
 * Titel und Kanal kommen von YouTube, das Vorschaubild wandert in die eigene
 * Ablage. Was schon da ist, wird übersprungen statt doppelt angelegt.
 */
export async function importVideos(formData: FormData): Promise<void> {
  await requireAdmin();
  const raw = String(formData.get("urls") ?? "");
  const parsed = parseVideoList(raw);

  if (parsed.ok.length === 0) {
    redirect(`${VIDEO_LIST}&err=${parsed.bad.length > 0 ? "video-none-usable" : "missing-fields"}`);
  }
  if (parsed.ok.length > MAX_IMPORT_LINES) {
    redirect(`${VIDEO_LIST}&err=video-too-many`);
  }

  const fallbackYear = new Date().getUTCFullYear();
  let created = 0;
  let skipped = parsed.duplicates.length;
  let withoutThumbnail = 0;
  let failed = 0;

  for (const entry of parsed.ok) {
    const videoId = entry.videoId!;
    try {
      const saved = await saveVideoPublication({ videoId, year: entry.year ?? fallbackYear });
      if (saved.existed) {
        skipped += 1;
        continue;
      }
      created += 1;
      if (!saved.hasThumbnail) withoutThumbnail += 1;
    } catch (error) {
      if (error && typeof error === "object" && "digest" in error) throw error;
      console.error(`[videos] ${videoId} konnte nicht angelegt werden:`, error);
      failed += 1;
    }
  }

  invalidatePublications();
  const report = new URLSearchParams({
    tab: "videos",
    ok: "videos-imported",
    neu: String(created),
    uebersprungen: String(skipped + parsed.bad.length),
    ohnebild: String(withoutThumbnail),
    fehler: String(failed),
  });
  redirect(`${LIST}?${report}`);
}

/**
 * Vorschaubild neu holen — für Videos, bei denen es beim Anlegen nicht klappte
 * (YouTube nicht erreichbar) oder deren Bild sich geändert hat.
 */
export async function refreshVideoThumbnail(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = str(formData, "id");
  if (!id) redirect(`${VIDEO_LIST}&err=not-found`);

  let outcome = "video-thumb-failed";
  try {
    const row = await db.publication.findUnique({
      where: { id },
      select: { url: true, translations: { where: { locale: "de" }, select: { title: true } } },
    });
    const videoId = extractYouTubeId(row?.url ?? null);
    if (!videoId) {
      redirect(`${VIDEO_LIST}&err=video-no-id`);
    }
    const title = row?.translations[0]?.title ?? `YouTube-Video ${videoId}`;
    if (await attachVideoThumbnail(id, videoId, title)) outcome = "video-thumb";
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error) throw error;
    console.error("[videos] Vorschaubild konnte nicht geholt werden:", error);
  }
  invalidatePublications();
  redirect(`${LIST}?tab=videos&${outcome === "video-thumb" ? "ok" : "err"}=${outcome}`);
}
