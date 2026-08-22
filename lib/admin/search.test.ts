import { describe, it, expect } from "vitest";
import {
  normalizeQuery,
  isSearchable,
  toSearchEntity,
  matchesAny,
  rankHits,
  countByEntity,
  type SearchHit,
  previewForFile,
} from "./search";

describe("normalizeQuery", () => {
  it("stutzt Ränder und schreibt klein", () => {
    expect(normalizeQuery("  Copilot ")).toBe("copilot");
  });

  it("verträgt fehlende Eingabe", () => {
    expect(normalizeQuery(undefined)).toBe("");
    expect(normalizeQuery(null)).toBe("");
  });
});

describe("isSearchable", () => {
  it("verlangt mindestens zwei Zeichen", () => {
    expect(isSearchable("a")).toBe(false);
    expect(isSearchable(" a ")).toBe(false);
    expect(isSearchable("ai")).toBe(true);
  });
});

describe("toSearchEntity", () => {
  it("erkennt gültige Bereiche", () => {
    expect(toSearchEntity("mission")).toBe("mission");
    expect(toSearchEntity("briefing")).toBe("briefing");
  });

  it("weist Unbekanntes ab", () => {
    expect(toSearchEntity("kaffee")).toBeNull();
    expect(toSearchEntity(undefined)).toBeNull();
  });
});

describe("matchesAny", () => {
  it("findet unabhängig von Groß-/Kleinschreibung", () => {
    expect(matchesAny("copilot", ["Agents mit COPILOT Studio", null])).toBe(true);
  });

  it("ignoriert leere Felder und leere Suche", () => {
    expect(matchesAny("copilot", [null, undefined, ""])).toBe(false);
    expect(matchesAny("", ["irgendwas"])).toBe(false);
  });
});

describe("rankHits", () => {
  it("stellt Präfixtreffer nach vorn, dann alphabetisch", () => {
    const hits = [
      { title: "Agents mit Copilot" },
      { title: "Copilot Studio" },
      { title: "Copilot Grundlagen" },
    ];
    expect(rankHits(hits, "copilot").map((h) => h.title)).toEqual([
      "Copilot Grundlagen",
      "Copilot Studio",
      "Agents mit Copilot",
    ]);
  });

  it("lässt die Eingabeliste unverändert", () => {
    const hits = [{ title: "B" }, { title: "A" }];
    rankHits(hits, "a");
    expect(hits.map((h) => h.title)).toEqual(["B", "A"]);
  });
});

describe("countByEntity", () => {
  const hit = (entity: SearchHit["entity"], title: string): SearchHit => ({
    entity,
    id: title,
    title,
    detail: "",
    status: "",
    href: "#",
  });

  it("zählt je Bereich und lässt leere Bereiche bei null", () => {
    const counts = countByEntity([hit("mission", "A"), hit("mission", "B"), hit("dispatch", "C")]);
    expect(counts.mission).toBe(2);
    expect(counts.dispatch).toBe(1);
    expect(counts.media).toBe(0);
  });
});

describe("previewForFile", () => {
  it("erkennt PDFs", () => {
    expect(previewForFile("folien.pdf")).toEqual({ kind: "pdf", label: "PDF" });
    expect(previewForFile("FOLIEN.PDF")).toEqual({ kind: "pdf", label: "PDF" });
  });

  it("erkennt PowerPoint in beiden Endungen", () => {
    expect(previewForFile("deck.pptx").label).toBe("PPTX");
    expect(previewForFile("alt.ppt").label).toBe("PPT");
  });

  it("behandelt Unbekanntes als Foliensatz, statt zu raten", () => {
    expect(previewForFile("ohne-endung").kind).toBe("slides");
  });
});
