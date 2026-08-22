import { describe, expect, it } from "vitest";
import { displayClient, formatPeriod, formatPersonDays } from "./projects";

describe("displayClient", () => {
  it("zeigt den Kundennamen, wenn er gezeigt werden darf", () => {
    expect(displayClient({ subtitle: "Stadtwerke Musterstadt", clientAnonymous: false, clientSector: null })).toBe(
      "Stadtwerke Musterstadt",
    );
  });

  it("ersetzt einen anonymen Kunden durch die Branchenangabe", () => {
    expect(
      displayClient({ subtitle: "Stadtwerke Musterstadt", clientAnonymous: true, clientSector: "Energieversorger" }),
    ).toBe("Energieversorger");
  });

  it("nennt den Namen auch ohne Branchenangabe nicht", () => {
    const shown = displayClient({ subtitle: "Stadtwerke Musterstadt", clientAnonymous: true, clientSector: null });
    expect(shown).toBe("Kunde anonymisiert");
    expect(shown).not.toContain("Stadtwerke");
  });

  it("übersetzt den Ersatztext", () => {
    expect(displayClient({ subtitle: "X", clientAnonymous: true, clientSector: "" }, "en")).toBe("Client anonymised");
  });

  it("bleibt leer, wenn gar kein Kunde erfasst ist", () => {
    expect(displayClient({ subtitle: "", clientAnonymous: false, clientSector: null })).toBeNull();
  });
});

describe("formatPeriod", () => {
  it("verbindet beide Enden", () => {
    expect(formatPeriod("03/2018", "heute")).toBe("03/2018 – heute");
  });

  it("kommt mit nur einer Angabe aus", () => {
    expect(formatPeriod("2019", null)).toBe("2019");
    expect(formatPeriod(null, null)).toBeNull();
  });
});

describe("formatPersonDays", () => {
  it("schreibt den Aufwand mit Kürzel", () => {
    expect(formatPersonDays(120)).toBe("ca. 120 PT");
    expect(formatPersonDays(120, "en")).toBe("approx. 120 person-days");
  });

  it("verschweigt leere und unsinnige Werte", () => {
    expect(formatPersonDays(null)).toBeNull();
    expect(formatPersonDays(0)).toBeNull();
  });
});
