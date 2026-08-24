import { describe, expect, it } from "vitest";
import {
  hasReadablePeriod,
  inDisplayOrder,
  isAutoSorted,
  sortByPeriodDesc,
  splitProjects,
  startOf,
} from "./order";

const now = new Date("2026-08-24T00:00:00Z");

function e(id: string, periodFrom: string | null, periodTo: string | null = null) {
  return { id, periodFrom, periodTo };
}

describe("startOf", () => {
  it("liest die gebräuchlichen Schreibweisen", () => {
    expect(startOf(e("a", "03/2018"), now)).toBe(2018 * 12 + 2);
    expect(startOf(e("a", "2018"), now)).toBe(2018 * 12);
  });

  it("gibt bei unlesbaren Angaben null zurück", () => {
    expect(startOf(e("a", "6 Monate"), now)).toBeNull();
    expect(startOf(e("a", null), now)).toBeNull();
  });

  it("liest „heute“ als jetzt", () => {
    expect(startOf(e("a", "heute"), now)).toBe(2026 * 12 + 7);
  });
});

describe("sortByPeriodDesc", () => {
  it("stellt die neueste Station nach vorn", () => {
    const sorted = sortByPeriodDesc(
      [e("alt", "06/2008", "03/2014"), e("neu", "04/2025", "heute"), e("mittel", "04/2021", "03/2025")],
      now,
    );
    expect(sorted.map((x) => x.id)).toEqual(["neu", "mittel", "alt"]);
  });

  it("stellt bei gleichem Beginn den laufenden Einsatz nach vorn", () => {
    const sorted = sortByPeriodDesc([e("beendet", "01/2024", "06/2024"), e("laufend", "01/2024", "heute")], now);
    expect(sorted.map((x) => x.id)).toEqual(["laufend", "beendet"]);
  });

  it("stellt bei gleichem Beginn das spätere Ende nach vorn", () => {
    const sorted = sortByPeriodDesc([e("kurz", "08/2024", "06/2025"), e("lang", "08/2024", "09/2025")], now);
    expect(sorted.map((x) => x.id)).toEqual(["lang", "kurz"]);
  });

  it("hängt Einträge ohne lesbares Datum hinten an", () => {
    const sorted = sortByPeriodDesc(
      [e("dauer", "6 Monate"), e("datiert", "04/2017", "12/2021"), e("ohne", null)],
      now,
    );
    expect(sorted.map((x) => x.id)).toEqual(["datiert", "dauer", "ohne"]);
  });

  it("lässt die Reihenfolge der undatierten Einträge unangetastet", () => {
    // Die Liste kommt nach sortOrder sortiert an; unter den undatierten
    // Einträgen entscheidet weiter der Adminbereich.
    const sorted = sortByPeriodDesc([e("b", "2 Monate"), e("a", "1 Monat"), e("c", null)], now);
    expect(sorted.map((x) => x.id)).toEqual(["b", "a", "c"]);
  });

  it("verändert die übergebene Liste nicht", () => {
    const input = [e("alt", "2010"), e("neu", "2024")];
    sortByPeriodDesc(input, now);
    expect(input.map((x) => x.id)).toEqual(["alt", "neu"]);
  });

  it("kommt mit einem Ende vor dem Beginn zurecht", () => {
    const sorted = sortByPeriodDesc([e("dreht", "06/2024", "01/2020"), e("normal", "07/2024", "08/2024")], now);
    expect(sorted.map((x) => x.id)).toEqual(["normal", "dreht"]);
  });
});

describe("hasReadablePeriod", () => {
  it("trennt datierte von undatierten Einträgen", () => {
    expect(hasReadablePeriod(e("a", "03/2018"), now)).toBe(true);
    expect(hasReadablePeriod(e("a", "6 Monate"), now)).toBe(false);
  });
});

describe("isAutoSorted / inDisplayOrder", () => {
  it("sortiert Werdegang und Projekte selbst", () => {
    expect(isAutoSorted("CAREER")).toBe(true);
    expect(isAutoSorted("PROJECT")).toBe(true);
  });

  it("lässt Ausbildung und Fähigkeiten von Hand sortiert", () => {
    expect(isAutoSorted("EDUCATION")).toBe(false);
    expect(isAutoSorted("SKILL")).toBe(false);
  });

  it("gibt manuelle Rubriken unverändert zurück", () => {
    const items = [e("b", "2020"), e("a", "2024")];
    expect(inDisplayOrder("SKILL", items, now).map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("sortiert automatische Rubriken nach Zeitraum", () => {
    const items = [e("b", "2020"), e("a", "2024")];
    expect(inDisplayOrder("CAREER", items, now).map((x) => x.id)).toEqual(["a", "b"]);
  });
});

describe("splitProjects", () => {
  it("trennt datierte Projekte von solchen mit reiner Dauer", () => {
    const { dated, undated } = splitProjects(
      [e("dauer", "6 Monate"), e("neu", "08/2024", "06/2025"), e("alt", "04/2017", "12/2021"), e("ohne", null)],
      now,
    );
    expect(dated.map((x) => x.id)).toEqual(["neu", "alt"]);
    expect(undated.map((x) => x.id)).toEqual(["dauer", "ohne"]);
  });

  it("sortiert die datierten neu → alt, lässt die anderen in Handreihenfolge", () => {
    const { dated, undated } = splitProjects(
      [e("mitte", "2020"), e("b", "2 Monate"), e("neu", "2024"), e("a", "1 Monat")],
      now,
    );
    expect(dated.map((x) => x.id)).toEqual(["neu", "mitte"]);
    expect(undated.map((x) => x.id)).toEqual(["b", "a"]);
  });

  it("kommt mit leeren Listen zurecht", () => {
    expect(splitProjects([], now)).toEqual({ dated: [], undated: [] });
  });
});
