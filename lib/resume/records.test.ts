import { describe, expect, it } from "vitest";
import {
  formatRecordYears,
  groupRecords,
  publicationsForCv,
  splitRecordsForCv,
  type RecordLike,
} from "./records";

describe("splitRecordsForCv", () => {
  const certs = [
    { id: "1", kind: "CERTIFICATION", status: "ACHIEVED" },
    { id: "2", kind: "CERTIFICATION", status: "PLANNED" },
    { id: "3", kind: "TRAINING", status: "ACHIEVED" },
    { id: "4", kind: "MVP", status: "ACHIEVED" },
    { id: "5", kind: "AWARD", status: "ACHIEVED" },
    { id: "6", kind: "CERTIFICATION", status: "EXPIRED" },
  ];

  it("gliedert nach Zertifizierungen, Schulungen und Auszeichnungen", () => {
    const split = splitRecordsForCv(certs);
    expect(split.certifications.map((c) => c.id)).toEqual(["1", "6"]);
    expect(split.trainings.map((c) => c.id)).toEqual(["3"]);
    expect(split.awards.map((c) => c.id)).toEqual(["4", "5"]);
  });

  it("lässt geplante Zertifizierungen weg", () => {
    const split = splitRecordsForCv(certs);
    expect(split.certifications.some((c) => c.id === "2")).toBe(false);
  });
});

describe("publicationsForCv", () => {
  it("lässt Videos weg und behält alles andere", () => {
    const items = [{ type: "BOOK" }, { type: "VIDEO" }, { type: "COURSE" }];
    expect(publicationsForCv(items)).toEqual([{ type: "BOOK" }, { type: "COURSE" }]);
  });
});

function rec(id: string, name: string, year: number, extra: Partial<RecordLike> = {}): RecordLike {
  return {
    id,
    name,
    shortCode: null,
    acquiredOn: new Date(Date.UTC(year, 5, 1)),
    validUntil: null,
    ...extra,
  };
}

describe("groupRecords", () => {
  it("fasst gleichnamige Nachweise zu einer Zeile zusammen", () => {
    const grouped = groupRecords([
      rec("a", "Microsoft MVP", 2026),
      rec("b", "Microsoft MVP", 2025),
      rec("c", "Microsoft MVP", 2024),
    ]);
    expect(grouped).toHaveLength(1);
    expect(grouped[0]!.count).toBe(3);
    expect(grouped[0]!.years).toEqual([2026, 2025, 2024]);
  });

  it("behandelt Schreibweisen mit anderer Groß-/Kleinschreibung als denselben Nachweis", () => {
    const grouped = groupRecords([rec("a", "Microsoft MVP", 2026), rec("b", " microsoft mvp ", 2025)]);
    expect(grouped).toHaveLength(1);
  });

  it("behält die Reihenfolge der Eingabe bei", () => {
    const grouped = groupRecords([
      rec("a", "AI-102", 2025),
      rec("b", "Microsoft MVP", 2026),
      rec("c", "AI-102", 2022),
    ]);
    expect(grouped.map((g) => g.name)).toEqual(["AI-102", "Microsoft MVP"]);
  });

  it("übernimmt das Ablaufdatum nur bei Einzelnachweisen", () => {
    const validUntil = new Date(Date.UTC(2027, 0, 1));
    const single = groupRecords([rec("a", "AI-102", 2025, { validUntil })]);
    expect(single[0]!.validUntil).toEqual(validUntil);

    const many = groupRecords([rec("a", "AI-102", 2025, { validUntil }), rec("b", "AI-102", 2022)]);
    expect(many[0]!.validUntil).toBeNull();
  });

  it("gibt für eine leere Liste eine leere Liste zurück", () => {
    expect(groupRecords([])).toEqual([]);
  });
});

describe("formatRecordYears", () => {
  it("zeigt ein einzelnes Jahr als Zahl", () => {
    expect(formatRecordYears([2024])).toBe("2024");
  });

  it("fasst eine lückenlose Folge zu einer Spanne zusammen", () => {
    expect(formatRecordYears([2026, 2025, 2024, 2023])).toBe("2023 – 2026");
  });

  it("zählt bei Lücken die Jahre auf, statt eine Spanne zu behaupten", () => {
    expect(formatRecordYears([2026, 2024, 2020])).toBe("2026, 2024, 2020");
  });

  it("ignoriert doppelte Jahre", () => {
    expect(formatRecordYears([2024, 2024])).toBe("2024");
  });

  it("bleibt bei leerer Eingabe leer", () => {
    expect(formatRecordYears([])).toBe("");
  });
});
