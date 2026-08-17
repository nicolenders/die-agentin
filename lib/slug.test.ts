import { describe, it, expect } from "vitest";
import { normalizeHyphens, slugify } from "./slug";

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

  // Audit 4.2: An dieser Lücke ist die Dublette „Mehr Team-Power mit KI" im
  // Repertoire entstanden — einmal mit geschütztem Bindestrich, einmal ohne.
  it("bildet exotische Bindestriche auf denselben Slug ab", () => {
    const expected = "mehr-team-power-mit-ki";
    expect(slugify("Mehr Team-Power mit KI")).toBe(expected); // U+002D
    expect(slugify("Mehr Team‑Power mit KI")).toBe(expected); // Non-Breaking Hyphen
    expect(slugify("Mehr Team‐Power mit KI")).toBe(expected); // Hyphen
    expect(slugify("Mehr Team–Power mit KI")).toBe(expected); // En Dash
    expect(slugify("Mehr Team—Power mit KI")).toBe(expected); // Em Dash
    expect(slugify("Mehr Team−Power mit KI")).toBe(expected); // Minus
  });
});

describe("normalizeHyphens", () => {
  it("vereinheitlicht alle Bindestrich-Varianten", () => {
    expect(normalizeHyphens("a‐b‑c‒d–e—f―g−h")).toBe(
      "a-b-c-d-e-f-g-h",
    );
  });

  it("lässt normale Bindestriche und übrigen Text unberührt", () => {
    expect(normalizeHyphens("Copilot-Studio 2026")).toBe("Copilot-Studio 2026");
  });
});
