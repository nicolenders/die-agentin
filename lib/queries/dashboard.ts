import { db } from "@/lib/db";

export interface DashboardStats {
  drafts: number;
  scheduled: number;
  published: number;
  channelErrors: number;
  /** true, wenn die (serverlose) DB nicht erreichbar war — Admin zeigt dann
   *  einen „Datenbank wird geweckt"-Zustand statt eines Timeouts (SPEC §2.1). */
  dbUnavailable: boolean;
}

const EMPTY: DashboardStats = {
  drafts: 0,
  scheduled: 0,
  published: 0,
  channelErrors: 0,
  dbUnavailable: false,
};

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const [drafts, scheduled, published, channelErrors] = await Promise.all([
      db.post.count({ where: { status: "DRAFT" } }),
      db.post.count({ where: { status: "SCHEDULED" } }),
      db.post.count({ where: { status: "PUBLISHED" } }),
      db.channelTask.count({ where: { state: "FAILED" } }),
    ]);
    return { drafts, scheduled, published, channelErrors, dbUnavailable: false };
  } catch {
    return { ...EMPTY, dbUnavailable: true };
  }
}
