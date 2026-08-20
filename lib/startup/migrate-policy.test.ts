import { describe, it, expect } from "vitest";
import {
  backoffDelay,
  shouldKeepTrying,
  isLockContention,
  attemptLabel,
  INITIAL_DELAY_MS,
  MAX_DELAY_MS,
  TOTAL_BUDGET_MS,
  STARTUP_GRACE_MS,
} from "./migrate-policy";

// Der Fehler, der hier festgehalten wird: Acht Versuche mit je 5 s Pause sind
// rund 40 s. Eine pausierte Azure-SQL-Instanz braucht 30–60 s zum Aufwachen —
// das Budget reichte also nicht verlässlich, und danach wurde nie wieder
// versucht.

describe("backoffDelay", () => {
  it("beginnt kurz und verdoppelt sich", () => {
    expect(backoffDelay(1)).toBe(INITIAL_DELAY_MS);
    expect(backoffDelay(2)).toBe(INITIAL_DELAY_MS * 2);
    expect(backoffDelay(3)).toBe(INITIAL_DELAY_MS * 4);
  });

  it("deckelt die Pause", () => {
    for (const attempt of [10, 50, 500]) {
      expect(backoffDelay(attempt)).toBe(MAX_DELAY_MS);
    }
  });

  it("kommt mit unsinnigen Eingaben zurecht", () => {
    for (const attempt of [0, -1]) {
      expect(backoffDelay(attempt)).toBe(INITIAL_DELAY_MS);
    }
  });
});

describe("shouldKeepTrying", () => {
  it("hält innerhalb des Budgets durch", () => {
    expect(shouldKeepTrying(0)).toBe(true);
    expect(shouldKeepTrying(TOTAL_BUDGET_MS - 1)).toBe(true);
  });

  it("hört auf, wenn das Budget aufgebraucht ist", () => {
    expect(shouldKeepTrying(TOTAL_BUDGET_MS)).toBe(false);
    expect(shouldKeepTrying(TOTAL_BUDGET_MS + 1)).toBe(false);
  });
});

describe("Das Budget deckt den Kaltstart wirklich ab", () => {
  it("überdauert eine Datenbank, die 60 s zum Aufwachen braucht", () => {
    // Genau das war vorher nicht der Fall: 8 × 5 s = 40 s.
    const WAKE_UP_MS = 60_000;
    let elapsed = 0;
    let attempt = 1;
    while (shouldKeepTrying(elapsed) && elapsed < WAKE_UP_MS) {
      elapsed += backoffDelay(attempt);
      attempt++;
    }
    expect(elapsed).toBeGreaterThanOrEqual(WAKE_UP_MS);
    expect(shouldKeepTrying(elapsed), "nach 60 s muss noch Budget übrig sein").toBe(true);
  });

  it("gibt auch einer sehr langsamen Datenbank noch Versuche", () => {
    // Nach fünf Minuten Ausfall soll weiter versucht werden.
    expect(shouldKeepTrying(5 * 60_000)).toBe(true);
  });

  it("hält den Serverstart nur kurz auf", () => {
    // Sonst greift die Startprüfung von Container Apps und der Container wird
    // neu gestartet — dann beginnt alles von vorn.
    expect(STARTUP_GRACE_MS).toBeLessThanOrEqual(20_000);
    expect(STARTUP_GRACE_MS).toBeLessThan(TOTAL_BUDGET_MS);
  });
});

describe("isLockContention", () => {
  it("erkennt eine Sperre einer anderen Instanz", () => {
    for (const message of [
      "Timed out trying to acquire a postgres advisory lock",
      "sp_getapplock returned -1",
      "Lock timeout exceeded",
      "could not acquire lock on the database",
      "A migration is already in progress",
    ]) {
      expect(isLockContention(message), message).toBe(true);
    }
  });

  it("hält echte Fehler nicht dafür", () => {
    for (const message of [
      "Can't reach database server at db:1433",
      "Authentication failed against database server",
      "P3009 migrate found failed migrations",
    ]) {
      expect(isLockContention(message), message).toBe(false);
    }
  });
});

describe("attemptLabel", () => {
  it("nennt Versuch und verstrichene Zeit", () => {
    expect(attemptLabel(3, 12_400)).toBe("Versuch 3, 12 s seit Start");
  });
});
