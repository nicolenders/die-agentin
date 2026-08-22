import { describe, expect, it } from "vitest";
import {
  daysUntilDue,
  dueReportReminders,
  isAfterDue,
  isBeforeDue,
  type ReportReminderTask,
} from "./report-reminder";

const now = new Date("2026-06-15T10:00:00Z");
const window = { beforeDays: 3, afterDays: 7 };

function task(over: Partial<ReportReminderTask> = {}): ReportReminderTask {
  return {
    id: "t1",
    missionId: "m1",
    eventName: "CIM Lingen",
    dueOn: new Date("2026-06-17T00:00:00Z"),
    status: "OPEN",
    reminderBeforeSentAt: null,
    reminderAfterSentAt: null,
    ...over,
  };
}

describe("daysUntilDue", () => {
  it("zählt ganze Tage, auch rückwärts, unabhängig von der Uhrzeit", () => {
    expect(daysUntilDue(new Date("2026-06-18T23:00:00Z"), now)).toBe(3);
    expect(daysUntilDue(new Date("2026-06-15T00:01:00Z"), now)).toBe(0);
    expect(daysUntilDue(new Date("2026-06-10T00:00:00Z"), now)).toBe(-5);
  });
});

describe("isBeforeDue", () => {
  it("erinnert innerhalb der Vorlaufzeit", () => {
    expect(isBeforeDue(task(), 3, now)).toBe(true);
  });

  it("erinnert noch nicht, wenn der Einsatz weiter weg ist", () => {
    expect(isBeforeDue(task({ dueOn: new Date("2026-07-01T00:00:00Z") }), 3, now)).toBe(false);
  });

  it("erinnert am Einsatztag selbst noch", () => {
    expect(isBeforeDue(task({ dueOn: new Date("2026-06-15T18:00:00Z") }), 3, now)).toBe(true);
  });

  it("erinnert nicht rückwirkend für einen vergangenen Einsatz", () => {
    expect(isBeforeDue(task({ dueOn: new Date("2026-05-01T00:00:00Z") }), 3, now)).toBe(false);
  });

  it("erinnert nicht zweimal und nicht bei erledigter Aufgabe", () => {
    expect(isBeforeDue(task({ reminderBeforeSentAt: now }), 3, now)).toBe(false);
    expect(isBeforeDue(task({ status: "DONE" }), 3, now)).toBe(false);
  });
});

describe("isAfterDue", () => {
  it("erinnert, sobald der Abstand verstrichen ist", () => {
    expect(isAfterDue(task({ dueOn: new Date("2026-06-08T00:00:00Z") }), 7, now)).toBe(true);
  });

  it("erinnert vorher nicht", () => {
    expect(isAfterDue(task({ dueOn: new Date("2026-06-10T00:00:00Z") }), 7, now)).toBe(false);
  });

  it("erinnert nicht zweimal und nicht bei erledigter Aufgabe", () => {
    expect(isAfterDue(task({ dueOn: new Date("2026-01-01T00:00:00Z"), reminderAfterSentAt: now }), 7, now)).toBe(false);
    expect(isAfterDue(task({ dueOn: new Date("2026-01-01T00:00:00Z"), status: "DONE" }), 7, now)).toBe(false);
  });
});

describe("dueReportReminders", () => {
  it("schickt je Aufgabe höchstens eine Erinnerung und zieht „nach“ vor", () => {
    const old = task({ id: "alt", dueOn: new Date("2026-01-01T00:00:00Z") });
    const result = dueReportReminders([old], window, now);
    expect(result).toHaveLength(1);
    expect(result[0]!.kind).toBe("after");
  });

  it("nimmt das am längsten Überfällige zuerst", () => {
    const list = [
      task({ id: "bald", dueOn: new Date("2026-06-17T00:00:00Z") }),
      task({ id: "alt", dueOn: new Date("2026-01-01T00:00:00Z") }),
      task({ id: "mittel", dueOn: new Date("2026-05-01T00:00:00Z") }),
    ];
    expect(dueReportReminders(list, window, now).map((d) => d.task.id)).toEqual(["alt", "mittel", "bald"]);
  });

  it("lässt alles aus, was weder vor noch nach fällig ist", () => {
    expect(dueReportReminders([task({ dueOn: new Date("2026-06-30T00:00:00Z") })], window, now)).toEqual([]);
  });
});
