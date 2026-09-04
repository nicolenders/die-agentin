import { describe, it, expect } from "vitest";
import {
  MISSION_LIST_STATUSES,
  missionListStatus,
  missionStatusWhere,
  parseMissionListStatus,
} from "./mission-status";

describe("MISSION_LIST_STATUSES", () => {
  it("bietet genau die vier Zustände an, die ein Einsatz annehmen kann", () => {
    expect([...MISSION_LIST_STATUSES]).toEqual(["PLANNED", "DONE", "CANCELLED", "ARCHIVED"]);
  });
});

describe("parseMissionListStatus", () => {
  it("nimmt gültige Werte an", () => {
    expect(parseMissionListStatus("DONE")).toBe("DONE");
    expect(parseMissionListStatus("ARCHIVED")).toBe("ARCHIVED");
  });

  it("verwirft alles andere — auch alte Veröffentlichungs-Zustände", () => {
    expect(parseMissionListStatus("PUBLISHED")).toBe("");
    expect(parseMissionListStatus("DRAFT")).toBe("");
    expect(parseMissionListStatus(undefined)).toBe("");
    expect(parseMissionListStatus("")).toBe("");
  });
});

describe("missionListStatus", () => {
  it("gibt den gepflegten Einsatzstatus zurück", () => {
    expect(missionListStatus("PLANNED", "DRAFT")).toBe("PLANNED");
    expect(missionListStatus("DONE", "PUBLISHED")).toBe("DONE");
    expect(missionListStatus("CANCELLED", "DRAFT")).toBe("CANCELLED");
  });

  it("Archiv gewinnt über den Einsatzstatus", () => {
    expect(missionListStatus("PLANNED", "ARCHIVED")).toBe("ARCHIVED");
    expect(missionListStatus("DONE", "ARCHIVED")).toBe("ARCHIVED");
  });

  it("fällt bei unbekanntem Altbestand auf „geplant“ zurück", () => {
    expect(missionListStatus("", "DRAFT")).toBe("PLANNED");
    expect(missionListStatus("IRGENDWAS", "PUBLISHED")).toBe("PLANNED");
  });
});

describe("missionStatusWhere", () => {
  it("filtert ohne Auswahl nicht", () => {
    expect(missionStatusWhere("")).toEqual({});
  });

  it("sucht Archiviertes über den Veröffentlichungszustand", () => {
    expect(missionStatusWhere("ARCHIVED")).toEqual({ contentStatus: "ARCHIVED" });
  });

  it("lässt Archiviertes aus den laufenden Zuständen heraus", () => {
    expect(missionStatusWhere("PLANNED")).toEqual({ status: "PLANNED", contentStatus: { not: "ARCHIVED" } });
    expect(missionStatusWhere("CANCELLED")).toEqual({ status: "CANCELLED", contentStatus: { not: "ARCHIVED" } });
  });
});
