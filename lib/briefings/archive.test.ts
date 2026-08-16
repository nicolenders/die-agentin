import { describe, it, expect } from "vitest";
import {
  talkArchiveState,
  isArchived,
  isSelectableForMission,
  selectableTalks,
} from "./archive";

const ARCHIVED_AT = new Date("2026-06-01T00:00:00Z");

describe("talkArchiveState", () => {
  it("unterscheidet aktiv, verborgen und archiviert", () => {
    expect(talkArchiveState({ active: true, archivedAt: null })).toBe("active");
    expect(talkArchiveState({ active: false, archivedAt: null })).toBe("hidden");
    expect(talkArchiveState({ active: true, archivedAt: ARCHIVED_AT })).toBe("archived");
  });

  it("lässt das Archiv die Sichtbarkeit überstimmen", () => {
    // Auch ein „aktives" Briefing ist archiviert, wenn ein Datum gesetzt ist.
    expect(talkArchiveState({ active: true, archivedAt: ARCHIVED_AT })).toBe("archived");
    expect(isArchived({ archivedAt: ARCHIVED_AT })).toBe(true);
    expect(isArchived({ archivedAt: null })).toBe(false);
  });

  it("verträgt ISO-Strings (serialisierte Daten aus dem Cache)", () => {
    expect(talkArchiveState({ active: true, archivedAt: "2026-06-01T00:00:00.000Z" })).toBe("archived");
  });
});

describe("isSelectableForMission", () => {
  const archived = { archivedAt: ARCHIVED_AT };
  const open = { archivedAt: null };

  it("erlaubt nicht archivierte Briefings immer", () => {
    expect(isSelectableForMission(open, new Date("2026-09-01T00:00:00Z"))).toBe(true);
    expect(isSelectableForMission(open, null)).toBe(true);
  });

  it("erlaubt archivierte nur für Einsätze vor dem Archivierungsdatum", () => {
    expect(isSelectableForMission(archived, new Date("2026-05-31T00:00:00Z"))).toBe(true);
    expect(isSelectableForMission(archived, new Date("2026-06-02T00:00:00Z"))).toBe(false);
  });

  it("schließt den Archivierungstag selbst aus", () => {
    expect(isSelectableForMission(archived, ARCHIVED_AT)).toBe(false);
  });

  it("verweigert archivierte Briefings ohne Einsatzdatum", () => {
    expect(isSelectableForMission(archived, null)).toBe(false);
    expect(isSelectableForMission(archived, "")).toBe(false);
  });
});

describe("selectableTalks", () => {
  const talks = [
    { id: "offen", archivedAt: null },
    { id: "archiv", archivedAt: ARCHIVED_AT },
  ];

  it("filtert archivierte Briefings für neue Einsätze heraus", () => {
    expect(selectableTalks(talks, new Date("2026-09-01T00:00:00Z")).map((t) => t.id)).toEqual(["offen"]);
  });

  it("behält die bestehende Zuordnung, auch wenn die Regel sie ausschlösse", () => {
    const list = selectableTalks(talks, new Date("2026-09-01T00:00:00Z"), "archiv");
    expect(list.map((t) => t.id)).toEqual(["archiv", "offen"]);
  });

  it("dupliziert nichts, wenn die Zuordnung ohnehin zulässig ist", () => {
    const list = selectableTalks(talks, new Date("2026-05-01T00:00:00Z"), "archiv");
    expect(list.map((t) => t.id)).toEqual(["offen", "archiv"]);
  });
});
