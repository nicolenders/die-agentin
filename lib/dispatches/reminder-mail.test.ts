import { describe, expect, it } from "vitest";
import { describeDue, reminderBody, reminderSubject } from "./reminder-mail";
import type { ReminderCandidate } from "./reminder";

const now = new Date("2026-06-10T09:00:00Z");
const entry: ReminderCandidate = {
  id: "d1",
  title: "Agenten in Produktion",
  status: "SCHEDULED",
  publishAt: new Date("2026-06-13T06:00:00Z"),
  reminderSentAt: null,
};

describe("describeDue", () => {
  it("benennt heute, morgen und weiter entfernte Termine", () => {
    expect(describeDue(new Date("2026-06-10T15:00:00Z"), now)).toBe("heute");
    expect(describeDue(new Date("2026-06-11T09:00:00Z"), now)).toBe("morgen");
    expect(describeDue(new Date("2026-06-14T09:00:00Z"), now)).toBe("in 4 Tagen");
  });

  it("sagt bei vergangenen Terminen, wie lange sie schon überfällig sind", () => {
    expect(describeDue(new Date("2026-06-09T09:00:00Z"), now)).toBe("seit 1 Tag überfällig");
    expect(describeDue(new Date("2026-06-07T09:00:00Z"), now)).toBe("seit 3 Tagen überfällig");
  });
});

describe("reminderSubject", () => {
  it("nennt bei einer Depesche den Titel", () => {
    expect(reminderSubject([entry])).toBe("Depesche prüfen: Agenten in Produktion");
  });

  it("zählt bei mehreren", () => {
    expect(reminderSubject([entry, { ...entry, id: "d2" }])).toBe("2 Depeschen stehen zur Veröffentlichung an");
  });
});

describe("reminderBody", () => {
  const body = reminderBody({ entries: [entry], siteUrl: "https://nicolenders.com/", now });

  it("verlinkt direkt in die Bearbeitungsmaske, ohne doppelten Schrägstrich", () => {
    expect(body).toContain("https://nicolenders.com/admin/depeschen/bearbeiten?id=d1");
  });

  it("nennt Titel, Datum und Abstand zum Termin", () => {
    expect(body).toContain("Agenten in Produktion");
    expect(body).toContain("13.06.2026");
    expect(body).toContain("in 3 Tagen");
  });

  it("sagt, was zu tun ist", () => {
    expect(body).toContain("Status");
  });
});
