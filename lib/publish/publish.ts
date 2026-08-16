import { db } from "@/lib/db";
import { invalidateTags, tags } from "@/lib/cache";

// Veröffentlichung und Zeitsteuerung (SPEC §6). Der Job verarbeitet alles mit
// status = SCHEDULED AND publishAt <= now. Idempotent: die Statusänderung läuft
// über updateMany mit `status: SCHEDULED` als Bedingung — eine zweite
// Ausführung findet den Beitrag bereits als PUBLISHED und tut nichts.

const SITE = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

/** Reiht je verbundenem Kanal eine Aufgabe ein — sofern noch keine existiert. */
async function enqueueChannelTasks(postId: string, now: Date): Promise<void> {
  try {
    const accounts = await db.channelAccount.findMany({ where: { connected: true } });
    if (accounts.length === 0) return;

    const de = await db.postTranslation.findUnique({
      where: { postId_locale: { postId, locale: "de" } },
      select: { slug: true, socialText: true, title: true },
    });
    const url = de ? `${SITE}/de/signale/${de.slug}` : SITE;
    const text = de?.socialText ?? de?.title ?? "";

    for (const account of accounts) {
      const existing = await db.channelTask.findFirst({
        where: { postId, platform: account.platform },
        select: { id: true },
      });
      if (existing) continue;
      // Alle Kanäle laufen gleich: der fertige Text steht bereit, geteilt wird
      // von Hand (Text kopieren, Profil öffnen).
      const state = "MANUAL_OPEN";
      await db.channelTask.create({
        data: {
          postId,
          platform: account.platform,
          state,
          scheduledAt: now,
          payload: JSON.stringify({ text, url }),
        },
      });
    }
  } catch {
    // Kanäle sind optional; ein Fehler hier darf die Veröffentlichung nicht kippen.
  }
}

/** Kanal-Aufgaben für eine fällige Depesche einreihen (Phase 4). */
async function enqueueDispatchTasks(dispatchId: string, now: Date): Promise<void> {
  try {
    const accounts = await db.channelAccount.findMany({ where: { connected: true } });
    if (accounts.length === 0) return;
    const de = await db.dispatchTranslation.findUnique({
      where: { dispatchId_locale: { dispatchId, locale: "de" } },
      select: { slug: true, socialText: true, title: true },
    });
    const url = de ? `${SITE}/de/depeschen/${de.slug}` : SITE;
    const text = de?.socialText ?? de?.title ?? "";
    for (const account of accounts) {
      const existing = await db.channelTask.findFirst({
        where: { dispatchId, platform: account.platform },
        select: { id: true },
      });
      if (existing) continue;
      await db.channelTask.create({
        data: { dispatchId, platform: account.platform, state: "MANUAL_OPEN", scheduledAt: now, payload: JSON.stringify({ text, url }) },
      });
    }
  } catch {
    // Kanäle sind optional.
  }
}

/** Fällige, terminierte Depeschen veröffentlichen (idempotent). */
async function publishDispatches(now: Date): Promise<string[]> {
  const due = await db.dispatch.findMany({
    where: { status: "SCHEDULED", publishAt: { lte: now } },
    select: { id: true },
  });
  const published: string[] = [];
  for (const { id } of due) {
    const res = await db.dispatch.updateMany({
      where: { id, status: "SCHEDULED" },
      data: { status: "PUBLISHED", publishedAt: now },
    });
    if (res.count === 1) {
      published.push(id);
      await enqueueDispatchTasks(id, now);
      await db.auditLog.create({
        data: { actor: "scheduler", action: "dispatch.publish", entity: "dispatch", entityId: id, detail: "auto (scheduled)" },
      });
    }
  }
  return published;
}

export interface PublishResult {
  published: string[];
  publishedDispatches: string[];
}

/**
 * Veröffentlicht alle fälligen, terminierten Beiträge. `now` injizierbar für
 * Tests/Kontrolle.
 */
export async function runScheduledPublish(now: Date = new Date()): Promise<PublishResult> {
  const due = await db.post.findMany({
    where: { status: "SCHEDULED", publishAt: { lte: now } },
    select: { id: true },
  });

  const published: string[] = [];
  for (const { id } of due) {
    // Idempotenz: nur wenn noch SCHEDULED.
    const res = await db.post.updateMany({
      where: { id, status: "SCHEDULED" },
      data: { status: "PUBLISHED", publishedAt: now },
    });
    if (res.count === 1) {
      published.push(id);
      await enqueueChannelTasks(id, now);
      await db.auditLog.create({
        data: {
          actor: "scheduler",
          action: "post.publish",
          entity: "post",
          entityId: id,
          detail: "auto (scheduled)",
        },
      });
    }
  }

  if (published.length > 0) {
    invalidateTags([
      tags.postList("de"),
      tags.postList("en"),
      ...published.map((id) => tags.post(id)),
    ]);
  }

  const publishedDispatches = await publishDispatches(now);
  if (publishedDispatches.length > 0) {
    invalidateTags([
      tags.dispatchList("de"),
      tags.dispatchList("en"),
      ...publishedDispatches.map((id) => tags.dispatch(id)),
    ]);
  }

  return { published, publishedDispatches };
}
