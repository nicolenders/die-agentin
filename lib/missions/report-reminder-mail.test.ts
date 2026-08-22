import { describe, expect, it } from "vitest";
import { describeDue, reportReminderBody, reportReminderSubject } from "./report-reminder-mail";
import type { DueReportReminder } from "./report-reminder";

function entry(kind: "before" | "after", days: number, name = "CIM Lingen"): DueReportReminder {
  return {
    kind,
    days,
    task: {
      id: `t-${name}`,
      missionId: `m-${name}`,
      eventName: name,
      dueOn: new Date("2026-06-17T00:00:00Z"),
      status: "OPEN",
      reminderBeforeSentAt: null,
      reminderAfterSentAt: null,
    },
  };
}

describe("describeDue", () => {
  it("beschreibt anstehende Termine", () => {
    expect(describeDue(3)).toBe("in 3 Tagen");
    expect(describeDue(1)).toBe("morgen");
    expect(describeDue(0)).toBe("heute");
  });

  it("beschreibt offene Berichte in der Vergangenheit", () => {
    expect(describeDue(-1)).toBe("seit gestern offen");
    expect(describeDue(-9)).toBe("seit 9 Tagen offen");
  });
});

describe("reportReminderSubject", () => {
  it("unterscheidet Vorher und Nachher bei einem Eintrag", () => {
    expect(reportReminderSubject([entry("before", 3)])).toBe("Einsatz steht an: CIM Lingen");
    expect(reportReminderSubject([entry("after", -9)])).toBe("Einsatzbericht fehlt: CIM Lingen");
  });

  it("zählt, wenn alles offene Berichte sind", () => {
    expect(reportReminderSubject([entry("after", -9, "A"), entry("after", -3, "B")])).toBe(
      "2 Einsatzberichte stehen aus",
    );
  });

  it("bleibt neutral, wenn beides zusammenkommt", () => {
    expect(reportReminderSubject([entry("after", -9, "A"), entry("before", 2, "B")])).toBe(
      "2 Einsätze brauchen deine Aufmerksamkeit",
    );
  });
});

describe("reportReminderBody", () => {
  it("verlinkt den Einsatz ohne doppelten Schrägstrich", () => {
    const body = reportReminderBody({ entries: [entry("after", -9)], siteUrl: "https://nicolenders.com/" });
    expect(body).toContain("https://nicolenders.com/admin/einsaetze/bearbeiten?mission=m-CIM Lingen");
  });

  it("nennt bei anstehenden Einsätzen Fotos und Notizen", () => {
    const body = reportReminderBody({ entries: [entry("before", 2)], siteUrl: "https://nicolenders.com" });
    expect(body).toContain("Fotos");
    expect(body).not.toContain("fehlt noch");
  });

  it("weist bei offenen Berichten auf die Aufgabenliste hin", () => {
    const body = reportReminderBody({ entries: [entry("after", -9)], siteUrl: "https://nicolenders.com" });
    expect(body).toContain("/admin/aufgaben");
  });

  it("trennt beide Anlässe im selben Text", () => {
    const body = reportReminderBody({
      entries: [entry("before", 2, "Kommend"), entry("after", -9, "Vergangen")],
      siteUrl: "https://nicolenders.com",
    });
    expect(body).toContain("Kommend");
    expect(body).toContain("Vergangen");
  });
});
