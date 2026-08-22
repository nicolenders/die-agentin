import { describe, expect, it } from "vitest";
import { daysUntil, dueReminders, isReminderDue, type ReminderCandidate } from "./reminder";

const now = new Date("2026-06-10T09:00:00Z");
const base: ReminderCandidate = {
  id: "d1",
  title: "Agenten in Produktion",
  status: "SCHEDULED",
  publishAt: new Date("2026-06-12T06:00:00Z"),
  reminderSentAt: null,
};

describe("isReminderDue", () => {
  it("erinnert innerhalb der Vorlaufzeit", () => {
    expect(isReminderDue(base, 3, now)).toBe(true);
  });

  it("erinnert noch nicht, wenn der Termin weiter weg ist", () => {
    expect(isReminderDue(base, 1, now)).toBe(false);
  });

  it("erinnert auch bei überschrittenem Termin, solange nichts veröffentlicht ist", () => {
    const overdue = { ...base, publishAt: new Date("2026-06-01T06:00:00Z") };
    expect(isReminderDue(overdue, 3, now)).toBe(true);
  });

  it("erinnert nicht zweimal für denselben Termin", () => {
    expect(isReminderDue({ ...base, reminderSentAt: new Date("2026-06-09T09:00:00Z") }, 3, now)).toBe(false);
  });

  it("erinnert nicht ohne Termin und nicht bei bereits veröffentlichten Depeschen", () => {
    expect(isReminderDue({ ...base, publishAt: null }, 3, now)).toBe(false);
    expect(isReminderDue({ ...base, status: "PUBLISHED" }, 3, now)).toBe(false);
    expect(isReminderDue({ ...base, status: "ARCHIVED" }, 3, now)).toBe(false);
  });
});

describe("dueReminders", () => {
  it("liefert das Dringlichste zuerst", () => {
    const later = { ...base, id: "d2", publishAt: new Date("2026-06-12T18:00:00Z") };
    const sooner = { ...base, id: "d3", publishAt: new Date("2026-06-11T06:00:00Z") };
    expect(dueReminders([later, sooner], 3, now).map((e) => e.id)).toEqual(["d3", "d2"]);
  });
});

describe("daysUntil", () => {
  it("zählt volle Tage, auch rückwärts", () => {
    expect(daysUntil(new Date("2026-06-13T09:00:00Z"), now)).toBe(3);
    expect(daysUntil(new Date("2026-06-08T09:00:00Z"), now)).toBe(-2);
  });
});
