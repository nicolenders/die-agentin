import { describe, expect, it } from "vitest";
import { isReportOverdue, reportDueDate, reportReadiness } from "./report-task";

const doc = (text: string) =>
  JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [{ type: "text", text }] }] });

describe("reportReadiness", () => {
  it("ist vollständig, wenn Veranstaltung und Vortrag Text haben", () => {
    const r = reportReadiness({ eventText: doc("Die Konferenz"), talkText: doc("Mein Vortrag"), photoCount: 2 });
    expect(r.complete).toBe(true);
    expect(r.missing).toEqual([]);
    expect(r.photosMissing).toBe(false);
  });

  it("benennt die fehlenden Bereiche einzeln", () => {
    const r = reportReadiness({ eventText: "", talkText: null, photoCount: 0 });
    expect(r.complete).toBe(false);
    expect(r.missing).toEqual(["Text zur Veranstaltung", "Text zum Vortrag"]);
  });

  it("zählt ein leeres TipTap-Dokument nicht als Text", () => {
    const empty = JSON.stringify({ type: "doc", content: [{ type: "paragraph", content: [] }] });
    expect(reportReadiness({ eventText: empty, talkText: doc("da"), photoCount: 1 }).complete).toBe(false);
  });

  it("lässt fehlende Bilder zu, meldet sie aber", () => {
    const r = reportReadiness({ eventText: doc("a"), talkText: doc("b"), photoCount: 0 });
    expect(r.complete).toBe(true);
    expect(r.photosMissing).toBe(true);
  });
});

describe("reportDueDate", () => {
  const start = new Date("2026-05-01T00:00:00Z");
  const end = new Date("2026-05-03T00:00:00Z");

  it("nimmt das Enddatum, wenn es eines gibt", () => {
    expect(reportDueDate(start, end)).toEqual(end);
  });

  it("fällt sonst auf den Beginn zurück", () => {
    expect(reportDueDate(start, null)).toEqual(start);
  });
});

describe("isReportOverdue", () => {
  const now = new Date("2026-06-01T12:00:00Z");

  it("ist überfällig, wenn der Einsatz vorbei und die Aufgabe offen ist", () => {
    expect(isReportOverdue("OPEN", new Date("2026-05-01T00:00:00Z"), now)).toBe(true);
  });

  it("ist vor dem Einsatz nicht überfällig", () => {
    expect(isReportOverdue("OPEN", new Date("2026-07-01T00:00:00Z"), now)).toBe(false);
  });

  it("ist nach dem Abhaken nie überfällig", () => {
    expect(isReportOverdue("DONE", new Date("2020-01-01T00:00:00Z"), now)).toBe(false);
  });
});
