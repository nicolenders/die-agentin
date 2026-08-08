"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { requireAdmin, ForbiddenError } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { slugify } from "@/lib/slug";
import { invalidateTags, tags } from "@/lib/cache";
import { MISSION_STATUSES, isOneOf } from "@/lib/domain";
import type { Locale } from "@/lib/i18n/config";

export interface MissionTextInput {
  eventText: string;
  talkText: string;
}

export interface SaveMissionInput {
  missionId?: string;
  eventName: string;
  city: string;
  countryCode: string;
  lat: number;
  lon: number;
  startDate: string; // YYYY-MM-DD
  status: string; // MissionStatus
  eventUrl?: string | null;
  talkId?: string | null;
  language: string; // Locale des Vortrags
  de: MissionTextInput;
  en?: MissionTextInput | null;
  photoAssetIds: string[];
  intent: "draft" | "publish";
}

export interface SaveMissionResult {
  ok: boolean;
  missionId?: string;
  error?: string;
}

async function uniqueSlug(locale: Locale, desired: string, missionId?: string): Promise<string> {
  const base = desired || "einsatz";
  let candidate = base;
  let n = 1;
  while (true) {
    const existing = await db.missionTranslation.findFirst({
      where: { locale, slug: candidate, NOT: missionId ? { missionId } : undefined },
      select: { id: true },
    });
    if (!existing) return candidate;
    n += 1;
    candidate = `${base}-${n}`;
  }
}

export async function saveMission(input: SaveMissionInput): Promise<SaveMissionResult> {
  let actor: string;
  try {
    const user = await requireAdmin();
    actor = user.email ?? user.oid ?? "admin";
  } catch (error) {
    if (error instanceof ForbiddenError) return { ok: false, error: error.message };
    throw error;
  }

  if (input.eventName.trim().length === 0) {
    return { ok: false, error: "Veranstaltungsname fehlt." };
  }
  const status = isOneOf(MISSION_STATUSES, input.status) ? input.status : "PLANNED";
  const contentStatus = input.intent === "publish" ? "PUBLISHED" : "DRAFT";
  const startDate = new Date(`${input.startDate || "2026-01-01"}T00:00:00Z`);

  try {
    const mission = await db.mission.upsert({
      // Neuer Datensatz: nicht existierender Lookup-Wert → sicherer create-Zweig.
      where: { id: input.missionId ?? `new-${randomUUID()}` },
      create: {
        id: input.missionId,
        eventName: input.eventName,
        city: input.city,
        countryCode: input.countryCode.slice(0, 2).toUpperCase() || "XX",
        lat: input.lat,
        lon: input.lon,
        startDate,
        status,
        contentStatus,
        eventUrl: input.eventUrl || null,
      },
      update: {
        eventName: input.eventName,
        city: input.city,
        countryCode: input.countryCode.slice(0, 2).toUpperCase() || "XX",
        lat: input.lat,
        lon: input.lon,
        startDate,
        status,
        contentStatus,
        eventUrl: input.eventUrl || null,
      },
    });

    const deSlug = await uniqueSlug("de", slugify(`${input.eventName}-${input.city}`), mission.id);
    await upsertText(mission.id, "de", deSlug, input.de);
    if (input.en) {
      const enSlug = await uniqueSlug("en", slugify(`${input.eventName}-${input.city}-en`), mission.id);
      await upsertText(mission.id, "en", enSlug, input.en);
    }

    // Fotos neu setzen.
    await db.missionPhoto.deleteMany({ where: { missionId: mission.id } });
    for (let i = 0; i < input.photoAssetIds.length; i++) {
      const assetId = input.photoAssetIds[i];
      if (assetId) {
        await db.missionPhoto.create({ data: { missionId: mission.id, assetId, sortOrder: i } });
      }
    }

    // Optional: gehaltenen Vortrag als TalkDelivery erfassen (für Ranking, M6).
    if (input.talkId) {
      const language: Locale = input.language === "en" ? "en" : "de";
      const existing = await db.talkDelivery.findFirst({
        where: { talkId: input.talkId, missionId: mission.id },
        select: { id: true },
      });
      if (existing) {
        await db.talkDelivery.update({ where: { id: existing.id }, data: { language, heldOn: startDate } });
      } else {
        await db.talkDelivery.create({ data: { talkId: input.talkId, missionId: mission.id, language, heldOn: startDate } });
      }
    }

    await db.auditLog.create({
      data: { actor, action: `mission.${input.intent}`, entity: "mission", entityId: mission.id, detail: `status=${contentStatus}` },
    });

    invalidateTags([tags.mission(mission.id), tags.missionList("de"), tags.missionList("en")]);
    return { ok: true, missionId: mission.id };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Speichern fehlgeschlagen." };
  }
}

/**
 * Löscht einen Einsatz samt Übersetzungen und Fotozuordnungen. Zugehörige
 * TalkDeliveries (Vortragszählung fürs Ranking) müssen zuvor entfernt werden,
 * weil ihr Fremdschlüssel kein Kaskadenlöschen erlaubt. Leitet mit sichtbarer
 * Rückmeldung zurück auf die Liste.
 */
export async function deleteMission(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) redirect("/admin/einsaetze?err=not-found");

  let failed = false;
  try {
    await db.talkDelivery.deleteMany({ where: { missionId: id } });
    await db.mission.delete({ where: { id } });
  } catch {
    failed = true;
  }
  if (failed) redirect("/admin/einsaetze?err=failed");

  invalidateTags([tags.mission(id), tags.missionList("de"), tags.missionList("en")]);
  redirect("/admin/einsaetze?ok=deleted");
}

async function upsertText(
  missionId: string,
  locale: Locale,
  slug: string,
  t: MissionTextInput,
): Promise<void> {
  const existing = await db.missionTranslation.findUnique({
    where: { missionId_locale: { missionId, locale } },
    select: { slug: true },
  });
  await db.missionTranslation.upsert({
    where: { missionId_locale: { missionId, locale } },
    create: { missionId, locale, slug, eventText: t.eventText, talkText: t.talkText, state: "REVIEWED" },
    update: { slug: existing?.slug ?? slug, eventText: t.eventText, talkText: t.talkText },
  });
}
