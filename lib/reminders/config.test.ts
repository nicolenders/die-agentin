import { describe, expect, it } from "vitest";
import {
  DEFAULT_MISSION_AFTER_DAYS,
  DEFAULT_MISSION_BEFORE_DAYS,
  DEFAULT_REMINDER_EMAIL,
  DISPATCH_REMINDER_ENABLED_KEY,
  DISPATCH_REMINDER_LEAD_DAYS_KEY,
  LEGACY_DISPATCH_EMAIL_KEY,
  MAX_REMINDER_DAYS,
  MISSION_REMINDER_AFTER_DAYS_KEY,
  MISSION_REMINDER_ENABLED_KEY,
  REMINDER_EMAIL_KEY,
  buildReminderSettings,
  isValidReminderDays,
  parseReminderDays,
} from "./config";

const map = (entries: Record<string, string>) => new Map(Object.entries(entries));

describe("parseReminderDays", () => {
  it("nimmt den Rückfall bei leerer oder unlesbarer Angabe", () => {
    expect(parseReminderDays(null, 5)).toBe(5);
    expect(parseReminderDays("bald", 5)).toBe(5);
  });

  it("begrenzt auf sinnvolle Werte", () => {
    expect(parseReminderDays("0", 5)).toBe(1);
    expect(parseReminderDays("500", 5)).toBe(MAX_REMINDER_DAYS);
    expect(parseReminderDays("7", 5)).toBe(7);
  });
});

describe("isValidReminderDays", () => {
  it("lässt nur Werte im zulässigen Bereich zu", () => {
    expect(isValidReminderDays(1)).toBe(true);
    expect(isValidReminderDays(90)).toBe(true);
    expect(isValidReminderDays(0)).toBe(false);
    expect(isValidReminderDays(91)).toBe(false);
    expect(isValidReminderDays(Number.NaN)).toBe(false);
  });
});

describe("buildReminderSettings", () => {
  it("gilt ohne jede Pflege mit sinnvollen Vorgaben", () => {
    const s = buildReminderSettings(map({}));
    expect(s.email).toBe(DEFAULT_REMINDER_EMAIL);
    expect(s.dispatchEnabled).toBe(true);
    expect(s.missionEnabled).toBe(true);
    expect(s.missionBeforeDays).toBe(DEFAULT_MISSION_BEFORE_DAYS);
    expect(s.missionAfterDays).toBe(DEFAULT_MISSION_AFTER_DAYS);
  });

  it("übernimmt die alte Depeschen-Adresse, solange die neue fehlt", () => {
    const s = buildReminderSettings(map({ [LEGACY_DISPATCH_EMAIL_KEY]: "alt@example.com" }));
    expect(s.email).toBe("alt@example.com");
  });

  it("bevorzugt die neue Adresse", () => {
    const s = buildReminderSettings(
      map({ [REMINDER_EMAIL_KEY]: "neu@example.com", [LEGACY_DISPATCH_EMAIL_KEY]: "alt@example.com" }),
    );
    expect(s.email).toBe("neu@example.com");
  });

  it("schaltet nur ab, wenn ausdrücklich „false“ gespeichert ist", () => {
    expect(buildReminderSettings(map({ [DISPATCH_REMINDER_ENABLED_KEY]: "false" })).dispatchEnabled).toBe(false);
    expect(buildReminderSettings(map({ [MISSION_REMINDER_ENABLED_KEY]: "false" })).missionEnabled).toBe(false);
    expect(buildReminderSettings(map({ [DISPATCH_REMINDER_ENABLED_KEY]: "" })).dispatchEnabled).toBe(true);
  });

  it("liest die Tageszahlen", () => {
    const s = buildReminderSettings(
      map({ [DISPATCH_REMINDER_LEAD_DAYS_KEY]: "5", [MISSION_REMINDER_AFTER_DAYS_KEY]: "14" }),
    );
    expect(s.dispatchLeadDays).toBe(5);
    expect(s.missionAfterDays).toBe(14);
  });
});
