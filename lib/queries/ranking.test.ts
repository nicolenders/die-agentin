import { describe, it, expect } from "vitest";
import { computeRanking, type DeliveryRow, type TalkMeta } from "./ranking";

const talks: TalkMeta[] = [
  { id: "a", title: "Copilot Extensibility", level: "300" },
  { id: "b", title: "AI Assistant", level: "300" },
  { id: "c", title: "Sensitivity Labels", level: "200" },
];

function d(talkId: string, language: string, iso: string): DeliveryRow {
  return { talkId, language, heldOn: new Date(iso) };
}

const deliveries: DeliveryRow[] = [
  ...Array.from({ length: 5 }, (_, i) => d("a", "de", `2025-0${(i % 9) + 1}-01`)),
  ...Array.from({ length: 4 }, (_, i) => d("a", "en", `2025-0${(i % 9) + 1}-15`)),
  ...Array.from({ length: 5 }, (_, i) => d("b", "de", `2024-0${(i % 9) + 1}-01`)),
  d("b", "en", "2026-01-10"),
  ...Array.from({ length: 4 }, (_, i) => d("c", "de", `2023-0${(i % 9) + 1}-01`)),
];

describe("computeRanking", () => {
  it("zählt und teilt nach Sprache auf, absteigend sortiert", () => {
    const r = computeRanking(talks, deliveries);
    expect(r.map((x) => x.talkId)).toEqual(["a", "b", "c"]);
    expect(r[0]).toMatchObject({ total: 9, de: 5, en: 4 });
    expect(r[1]).toMatchObject({ total: 6, de: 5, en: 1 });
    expect(r[2]).toMatchObject({ total: 4, de: 4, en: 0 });
  });

  it("berücksichtigt den Zeitraumfilter", () => {
    // Nur 2025: Talk a (9 in 2025), Talk b/c außerhalb.
    const r = computeRanking(talks, deliveries, {
      from: new Date("2025-01-01"),
      to: new Date("2025-12-31"),
    });
    expect(r).toHaveLength(1);
    expect(r[0]).toMatchObject({ talkId: "a", total: 9 });
  });

  it("führt Vorträge ohne Durchführung im Zeitraum nicht auf", () => {
    const r = computeRanking(talks, deliveries, { from: new Date("2027-01-01") });
    expect(r).toHaveLength(0);
  });

  it("liefert das Datum der letzten Durchführung", () => {
    const r = computeRanking(talks, deliveries);
    const b = r.find((x) => x.talkId === "b");
    expect(b?.lastHeld?.toISOString().slice(0, 10)).toBe("2026-01-10");
  });
});
