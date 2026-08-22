import { describe, expect, it } from "vitest";
import { countTaskViews, filterTasks, isOverdue, sortTasks, toTaskView } from "./filter";
import type { TaskItem } from "@/lib/queries/tasks";

const now = new Date("2026-06-15T10:00:00Z");

function task(over: Partial<TaskItem> & Pick<TaskItem, "id">): TaskItem {
  return {
    missionId: `m-${over.id}`,
    eventName: over.id,
    city: "Lingen",
    isOnline: false,
    dueOn: new Date("2026-06-01T00:00:00Z"),
    status: "OPEN",
    doneAt: null,
    complete: false,
    missing: ["Text zum Vortrag"],
    photosMissing: true,
    editHref: "/admin",
    ...over,
  } as TaskItem;
}

const overdue = task({ id: "alt", dueOn: new Date("2026-01-01T00:00:00Z") });
const upcoming = task({ id: "kommend", dueOn: new Date("2026-07-01T00:00:00Z") });
const done = task({ id: "fertig", status: "DONE", doneAt: now, complete: true, missing: [] });
const all = [upcoming, overdue, done];

describe("toTaskView", () => {
  it("beginnt bei den offenen Aufgaben", () => {
    expect(toTaskView(undefined)).toBe("offen");
    expect(toTaskView("quatsch")).toBe("offen");
  });

  it("übernimmt gültige Ansichten", () => {
    expect(toTaskView("erledigt")).toBe("erledigt");
  });
});

describe("isOverdue", () => {
  it("ist überfällig, wenn der Einsatz vorbei und die Aufgabe offen ist", () => {
    expect(isOverdue(overdue, now)).toBe(true);
    expect(isOverdue(upcoming, now)).toBe(false);
  });

  it("ist nach dem Abhaken nie überfällig", () => {
    expect(isOverdue({ ...overdue, status: "DONE" }, now)).toBe(false);
  });
});

describe("filterTasks", () => {
  it("zeigt je Ansicht das Passende", () => {
    expect(filterTasks(all, "offen", now).map((t) => t.id)).toEqual(["kommend", "alt"]);
    expect(filterTasks(all, "ueberfaellig", now).map((t) => t.id)).toEqual(["alt"]);
    expect(filterTasks(all, "erledigt", now).map((t) => t.id)).toEqual(["fertig"]);
    expect(filterTasks(all, "alle", now)).toHaveLength(3);
  });
});

describe("sortTasks", () => {
  it("stellt Offenes voran, darin das am längsten Überfällige zuerst", () => {
    expect(sortTasks(all).map((t) => t.id)).toEqual(["alt", "kommend", "fertig"]);
  });

  it("lässt die Eingabe unverändert", () => {
    const input = [upcoming, overdue];
    sortTasks(input);
    expect(input.map((t) => t.id)).toEqual(["kommend", "alt"]);
  });
});

describe("countTaskViews", () => {
  it("zählt je Ansicht", () => {
    expect(countTaskViews(all, now)).toEqual({ offen: 2, ueberfaellig: 1, erledigt: 1, alle: 3 });
  });
});
