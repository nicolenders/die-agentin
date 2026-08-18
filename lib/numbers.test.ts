import { describe, it, expect } from "vitest";
import { spellOutCount, spellOutTimes } from "./numbers";

// Audit 6.9: „zehn Fachbüchern" stand hartkodiert in llms.txt, während der
// Rest der Seite die Zahl aus der Datenbank zieht.
describe("spellOutCount", () => {
  it("schreibt kleine Zahlen aus", () => {
    expect(spellOutCount(0)).toBe("null");
    expect(spellOutCount(7)).toBe("sieben");
    expect(spellOutCount(10)).toBe("zehn");
    expect(spellOutCount(12)).toBe("zwölf");
  });

  it("nutzt ab 13 die Ziffer", () => {
    expect(spellOutCount(13)).toBe("13");
    expect(spellOutCount(221)).toBe("221");
  });

  it("gibt unsinnige Werte unverändert zurück", () => {
    expect(spellOutCount(-1)).toBe("-1");
    expect(spellOutCount(1.5)).toBe("1.5");
  });
});

describe("spellOutTimes", () => {
  it("bildet die Häufigkeit als Wort", () => {
    expect(spellOutTimes(1)).toBe("einmal");
    expect(spellOutTimes(7)).toBe("siebenmal");
  });

  it("nutzt ab 13 die Ziffer mit Bindestrich", () => {
    expect(spellOutTimes(13)).toBe("13-mal");
  });
});
