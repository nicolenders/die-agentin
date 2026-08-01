import { describe, it, expect } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("transliteriert deutsche Umlaute", () => {
    expect(slugify("Sensitivity Labels sauber ausrollen")).toBe(
      "sensitivity-labels-sauber-ausrollen",
    );
    expect(slugify("Über Größe und Maß")).toBe("ueber-groesse-und-mass");
  });

  it("entfernt Sonderzeichen und mehrfache Trenner", () => {
    expect(slugify("Copilot & Agents!! (2026)")).toBe("copilot-agents-2026");
  });

  it("trimmt führende/abschließende Trenner", () => {
    expect(slugify("  --Hallo--  ")).toBe("hallo");
  });

  it("kürzt auf maximal 80 Zeichen", () => {
    expect(slugify("a".repeat(200)).length).toBeLessThanOrEqual(80);
  });
});
