import { describe, expect, it } from "vitest";
import {
  countOverdueTasks,
  filterPlanEntries,
  sortPlanEntries,
  toPlanSort,
  toPlanTime,
  toPlanType,
} from "./filter";
import type { PlanEntry } from "@/lib/queries/planning";

const now = new Date("2026-06-15T10:00:00Z");

function entry(over: Partial<PlanEntry> & Pick<PlanEntry, "kind" | "id">): PlanEntry {
  return {
    title: over.id,
    status: "DRAFT",
    date: null,
    updatedAt: new Date("2026-06-01T00:00:00Z"),
    identities: [],
    editHref: "/admin",
    ...over,
  } as PlanEntry;
}

const mission = entry({ kind: "mission", id: "m1", status: "PUBLISHED", date: new Date("2026-06-20T00:00:00Z") });
const pastMission = entry({ kind: "mission", id: "m2", status: "PUBLISHED", date: new Date("2026-05-01T00:00:00Z") });
const todayDispatch = entry({ kind: "dispatch", id: "d1", status: "SCHEDULED", date: new Date("2026-06-15T22:00:00Z") });
const undated = entry({ kind: "dispatch", id: "d2", status: "DRAFT", date: null });
const overdueTask = entry({
  kind: "task",
  id: "t1",
  status: "OPEN",
  date: new Date("2026-05-01T00:00:00Z"),
  task: { missionId: "m2", complete: false, missing: ["Text zum Vortrag"], photosMissing: true, overdue: true },
});

const all = [mission, pastMission, todayDispatch, undated, overdueTask];

describe("toPlanType / toPlanTime / toPlanSort", () => {
  it("fällt bei Unbekanntem auf sinnvolle Vorgaben zurück", () => {
    expect(toPlanType("quatsch")).toBe("alle");
    expect(toPlanTime(undefined)).toBe("kommend");
    expect(toPlanSort("")).toBe("date");
  });

  it("übernimmt gültige Werte", () => {
    expect(toPlanType("task")).toBe("task");
    expect(toPlanTime("alle")).toBe("alle");
    expect(toPlanSort("title")).toBe("title");
  });
});

describe("filterPlanEntries", () => {
  it("filtert nach Typ", () => {
    const only = filterPlanEntries(all, { type: "mission", time: "alle", status: "" }, now);
    expect(only.map((e) => e.id)).toEqual(["m1", "m2"]);
  });

  it("filtert nach Status", () => {
    const only = filterPlanEntries(all, { type: "alle", time: "alle", status: "SCHEDULED" }, now);
    expect(only.map((e) => e.id)).toEqual(["d1"]);
  });

  it("rechnet den heutigen Tag zu „kommend“", () => {
    const upcoming = filterPlanEntries(all, { type: "alle", time: "kommend", status: "" }, now);
    expect(upcoming.map((e) => e.id)).toContain("d1");
    expect(upcoming.map((e) => e.id)).not.toContain("m2");
  });

  it("hält Einträge ohne Datum bei „kommend“ und nicht in der Vergangenheit", () => {
    expect(filterPlanEntries(all, { type: "alle", time: "kommend", status: "" }, now).map((e) => e.id)).toContain("d2");
    expect(filterPlanEntries(all, { type: "alle", time: "vergangen", status: "" }, now).map((e) => e.id)).not.toContain("d2");
  });

  it("zeigt bei „vergangen“ nur Zurückliegendes", () => {
    expect(filterPlanEntries(all, { type: "alle", time: "vergangen", status: "" }, now).map((e) => e.id)).toEqual(["m2", "t1"]);
  });
});

describe("sortPlanEntries", () => {
  it("sortiert nach Datum und schiebt Undatiertes ans Ende", () => {
    expect(sortPlanEntries(all, "date").map((e) => e.id)).toEqual(["m2", "t1", "d1", "m1", "d2"]);
  });

  it("sortiert alphabetisch nach Titel", () => {
    expect(sortPlanEntries([mission, todayDispatch], "title").map((e) => e.id)).toEqual(["d1", "m1"]);
  });

  it("lässt die Eingabe unverändert", () => {
    const input = [mission, pastMission];
    sortPlanEntries(input, "title");
    expect(input.map((e) => e.id)).toEqual(["m1", "m2"]);
  });
});

describe("countOverdueTasks", () => {
  it("zählt nur überfällige Aufgaben", () => {
    expect(countOverdueTasks(all)).toBe(1);
  });
});
