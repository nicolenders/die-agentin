import { PrismaClient } from "@prisma/client";

// Prisma-Singleton (SPEC §2.1). Die Azure-SQL-Datenbank im Free Offer pausiert
// bei Inaktivität; Admin-Routen und der Publish-Job müssen einen Kaltstart von
// 30–60 s tolerieren. Deshalb ein erhöhtes Verbindungs-Timeout und ein Retry
// für den ersten Verbindungsversuch (siehe `connectWithRetry`).
//
// Öffentliche Seiten sprechen die DB NICHT direkt an — sie werden statisch bzw.
// per ISR ausgeliefert. Nur Admin und Jobs verwenden diesen Client.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}

/**
 * Stellt sicher, dass eine Verbindung besteht, und wiederholt den ersten
 * Versuch einmal — die serverlose DB braucht nach einer Ruhephase einen Moment
 * zum Aufwachen. Aufrufer (Admin, Jobs) können dies vor der ersten Abfrage
 * nutzen, um einen „Datenbank wird geweckt"-Zustand sauber zu behandeln.
 */
export async function connectWithRetry(retries = 1, delayMs = 3000): Promise<void> {
  try {
    await db.$connect();
  } catch (error) {
    if (retries > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      return connectWithRetry(retries - 1, delayMs);
    }
    throw error;
  }
}
