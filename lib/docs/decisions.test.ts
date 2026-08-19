import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

// Architekturentscheidungen werden über ihre Nummer zitiert („siehe ADR 0015").
// Genau einmal war eine Nummer doppelt vergeben — und damit war jede Referenz
// darauf mehrdeutig. Ein Test ist billiger als die Aufmerksamkeit, das jedes
// Mal von Hand zu prüfen.

const DIR = join(process.cwd(), "docs", "decisions");

function decisionFiles(): string[] {
  return readdirSync(DIR).filter((name) => /^\d{4}-.+\.md$/.test(name));
}

describe("Architekturentscheidungen", () => {
  it("vergibt jede Nummer nur einmal", () => {
    const byNumber = new Map<string, string[]>();
    for (const file of decisionFiles()) {
      const number = file.slice(0, 4);
      byNumber.set(number, [...(byNumber.get(number) ?? []), file]);
    }
    const duplicates = [...byNumber.entries()].filter(([, files]) => files.length > 1);
    expect(duplicates, `Doppelte ADR-Nummern: ${JSON.stringify(duplicates)}`).toEqual([]);
  });

  it("gibt bei jedem Eintrag Datum und Status an", () => {
    const incomplete = decisionFiles().filter((file) => {
      const text = readFileSync(join(DIR, file), "utf8");
      return !text.includes("**Datum:**") || !text.includes("**Status:**");
    });
    expect(incomplete, `Ohne Datum/Status: ${incomplete.join(", ")}`).toEqual([]);
  });

  it("findet überhaupt Einträge (sonst prüft der Test nichts)", () => {
    expect(decisionFiles().length).toBeGreaterThan(5);
  });
});
