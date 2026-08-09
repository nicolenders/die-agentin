import { Prisma } from "@prisma/client";

// Die serverlose Azure-SQL-Instanz pausiert bei Inaktivität und braucht nach dem
// ersten Zugriff ~30–60 s zum Aufwachen. Ohne Wiederholung scheitert die erste
// schreibende Aktion in diesem Fenster (z. B. „Upload fehlgeschlagen"). Dieser
// Wrapper wiederholt eine Operation bei einem vorübergehenden Verbindungsfehler
// mit wachsender Wartezeit, sodass sie auf das Aufwachen wartet statt zu scheitern.

const TRANSIENT_CODES = new Set([
  "P1000", // Authentifizierung fehlgeschlagen (kann beim Aufwachen kurz auftreten)
  "P1001", // Server nicht erreichbar
  "P1002", // Verbindungs-Timeout
  "P1008", // Operations-Timeout
  "P1017", // Server hat die Verbindung geschlossen
]);

function isTransient(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientInitializationError) return true;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return TRANSIENT_CODES.has(error.code);
  }
  return false;
}

export async function withDbRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  baseDelayMs = 2500,
): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (!isTransient(error) || attempt === attempts - 1) throw error;
      await new Promise((resolve) => setTimeout(resolve, baseDelayMs * (attempt + 1)));
    }
  }
  throw lastError;
}
