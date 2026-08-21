import { describe, it, expect } from "vitest";
import { checkName, findByName, INLINE_NAME_MAX, normalizeName } from "./inline-create";

describe("normalizeName", () => {
  it("entfernt Ränder und fasst innere Leerzeichen zusammen", () => {
    expect(normalizeName("  Copilot   Studio ")).toBe("Copilot Studio");
  });

  it("macht aus einer reinen Leerzeicheneingabe nichts", () => {
    expect(normalizeName("   ")).toBe("");
  });
});

describe("findByName", () => {
  const items = [
    { id: "1", name: "Copilot Studio" },
    { id: "2", name: "Governance" },
  ];

  it("findet den Eintrag unabhängig von Groß- und Kleinschreibung", () => {
    expect(findByName(items, "copilot studio")?.id).toBe("1");
  });

  it("findet ihn auch bei abweichenden Leerzeichen", () => {
    expect(findByName(items, "  Copilot   Studio  ")?.id).toBe("1");
  });

  it("findet Umlaute unabhängig von der Schreibung", () => {
    expect(findByName([{ id: "3", name: "Öffentliche Verwaltung" }], "öffentliche verwaltung")?.id).toBe("3");
  });

  it("liefert nichts, wenn es den Namen wirklich noch nicht gibt", () => {
    expect(findByName(items, "Purview")).toBeUndefined();
  });
});

describe("checkName", () => {
  it("nimmt einen gewöhnlichen Namen an und gibt ihn bereinigt zurück", () => {
    expect(checkName(" Purview ")).toEqual({ ok: true, name: "Purview" });
  });

  it("lehnt eine leere Eingabe ab", () => {
    expect(checkName("   ")).toEqual({ ok: false, error: "Kein Name eingegeben." });
  });

  it("lehnt einen ganzen Satz ab", () => {
    const result = checkName("x".repeat(INLINE_NAME_MAX + 1));
    expect(result.ok).toBe(false);
  });

  it("lässt einen Namen an der Längengrenze durch", () => {
    expect(checkName("x".repeat(INLINE_NAME_MAX)).ok).toBe(true);
  });
});
