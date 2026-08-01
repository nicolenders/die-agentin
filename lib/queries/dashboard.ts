import { db } from "@/lib/db";
import { expiryState, daysUntil } from "@/lib/channels/expiry";

export interface DashboardStats {
  drafts: number;
  scheduled: number;
  published: number;
  channelErrors: number;
  /** LinkedIn-Ablaufwarnung (SPEC §7.1): Tage bis Ablauf, wenn < 14. */
  linkedInWarnDays: number | null;
  /** true, wenn die (serverlose) DB nicht erreichbar war — Admin zeigt dann
   *  einen „Datenbank wird geweckt"-Zustand statt eines Timeouts (SPEC §2.1). */
  dbUnavailable: boolean;
}

const EMPTY: DashboardStats = {
  drafts: 0,
  scheduled: 0,
  published: 0,
  channelErrors: 0,
  linkedInWarnDays: null,
  dbUnavailable: false,
};

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [drafts, scheduled, published, channelErrors, linkedIn] = await Promise.all([
      db.post.count({ where: { status: "DRAFT" } }),
      db.post.count({ where: { status: "SCHEDULED" } }),
      db.post.count({ where: { status: "PUBLISHED" } }),
      db.channelTask.count({ where: { state: "FAILED" } }),
      db.channelAccount.findUnique({ where: { platform: "LINKEDIN" } }),
    ]);
    const state = expiryState(linkedIn?.expiresAt ?? null);
    const linkedInWarnDays =
      linkedIn?.connected && (state === "warn" || state === "expired")
        ? daysUntil(linkedIn.expiresAt)
        : null;
    return { drafts, scheduled, published, channelErrors, linkedInWarnDays, dbUnavailable: false };
  } catch {
    return { ...EMPTY, dbUnavailable: true };
  }
}
