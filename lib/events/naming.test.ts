import { describe, expect, it } from "vitest";
import {
  editionLabel,
  editionRange,
  eventDisplayName,
  eventMatchKey,
  eventSlugBase,
  isSameEvent,
} from "./naming";

describe("eventMatchKey", () => {
  it("lässt Jahreszahlen weg", () => {
    expect(eventMatchKey("TechDay 2024")).toBe("techday");
    expect(eventMatchKey("TechDay 2025")).toBe("techday");
  });

  it("erkennt dieselbe Veranstaltung trotz Ausgabe-Zusatz", () => {
    expect(isSameEvent("Cloud Summit – 3. Ausgabe", "Cloud Summit")).toBe(true);
    expect(isSameEvent("Cloud Summit #12", "cloud summit")).toBe(true);
    expect(isSameEvent("Cloud Summit, 2nd Edition", "Cloud Summit")).toBe(true);
  });

  it("normalisiert Umlaute, Bindestriche und Satzzeichen", () => {
    expect(eventMatchKey("Öffentliche IT‑Tage")).toBe("oeffentliche it tage");
    expect(isSameEvent("Team-Power Konferenz", "Team‑Power  Konferenz!")).toBe(true);
  });

  it("hält verschiedene Veranstaltungen auseinander", () => {
    expect(isSameEvent("TechDay Berlin", "TechDay Wien")).toBe(false);
    // Jahreszeiten bleiben stehen: Frühjahrs- und Herbstausgabe sind zwei Namen.
    expect(isSameEvent("Community Day Spring", "Community Day Autumn")).toBe(false);
  });

  it("gibt bei leerem Namen einen leeren Schlüssel zurück — und vergleicht dann nichts", () => {
    expect(eventMatchKey("   ")).toBe("");
    expect(eventMatchKey("2026")).toBe("");
    expect(isSameEvent("2024", "2025")).toBe(false);
  });
});

describe("eventSlugBase", () => {
  it("baut einen lesbaren Slug", () => {
    expect(eventSlugBase("Öffentliche IT-Tage 2026")).toBe("oeffentliche-it-tage-2026");
  });

  it("fällt auf einen sprechenden Rest zurück", () => {
    expect(eventSlugBase("!!!")).toBe("veranstaltung");
  });
});

describe("editionLabel", () => {
  it("nimmt das Jahr des Starttags", () => {
    expect(editionLabel(new Date("2026-03-12T00:00:00Z"))).toBe("2026");
  });

  it("zählt durch, wenn das Jahr vergeben ist", () => {
    expect(editionLabel(new Date("2026-09-01T00:00:00Z"), ["2026"])).toBe("2026 (2)");
    expect(editionLabel(new Date("2026-09-01T00:00:00Z"), ["2026", "2026 (2)"])).toBe("2026 (3)");
  });

  it("kommt ohne Datum aus", () => {
    expect(editionLabel(null)).toBe("Ohne Datum");
    expect(editionLabel(null, ["Ohne Datum"])).toBe("Ohne Datum (2)");
  });
});

describe("editionRange", () => {
  const start = new Date("2026-03-12T00:00:00Z");
  const end = new Date("2026-03-14T00:00:00Z");

  it("zeigt eine Spanne", () => {
    expect(editionRange(start, end, "de")).toBe("12.03.2026 – 14.03.2026");
  });

  it("zeigt einen einzelnen Tag nur einmal", () => {
    expect(editionRange(start, start, "de")).toBe("12.03.2026");
    expect(editionRange(start, null, "de")).toBe("12.03.2026");
  });

  it("bleibt ohne Datum leer", () => {
    expect(editionRange(null, null, "de")).toBe("");
  });
});

describe("eventDisplayName", () => {
  it("streicht Jahreszahl und Ausgabe-Zusatz, behält die Schreibweise", () => {
    expect(eventDisplayName("TechDay 2025")).toBe("TechDay");
    expect(eventDisplayName("Cloud Summit – 3. Ausgabe")).toBe("Cloud Summit");
    expect(eventDisplayName("Öffentliche IT-Tage 2026")).toBe("Öffentliche IT-Tage");
  });

  it("lässt einen Namen ohne Zusatz unverändert", () => {
    expect(eventDisplayName("Microsoft AI Tour")).toBe("Microsoft AI Tour");
  });

  it("behält den ursprünglichen Namen, wenn nichts übrig bliebe", () => {
    expect(eventDisplayName("2026")).toBe("2026");
  });
});
