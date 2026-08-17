import { describe, it, expect } from "vitest";
import { toTalkLanguage, missionTalkLanguage, talkLanguageLabel } from "./mission-language";

describe("toTalkLanguage", () => {
  it("erkennt Kürzel und Freitexte", () => {
    expect(toTalkLanguage("de")).toBe("de");
    expect(toTalkLanguage("Deutsch")).toBe("de");
    expect(toTalkLanguage(" ENGLISH ")).toBe("en");
    expect(toTalkLanguage("en-GB")).toBe("en");
  });

  it("gibt für Unbekanntes und Leeres null zurück", () => {
    expect(toTalkLanguage("klingonisch")).toBeNull();
    expect(toTalkLanguage("")).toBeNull();
    expect(toTalkLanguage(null)).toBeNull();
  });
});

describe("missionTalkLanguage", () => {
  it("nimmt die Sprache des Einsatzes", () => {
    expect(missionTalkLanguage("en", "de")).toBe("en");
  });

  it("fällt auf die Zuordnung zum Briefing zurück (Altdaten)", () => {
    expect(missionTalkLanguage(null, "en")).toBe("en");
    expect(missionTalkLanguage("", "de")).toBe("de");
  });

  it("ist null, wenn nirgends etwas Brauchbares steht", () => {
    expect(missionTalkLanguage(null, null)).toBeNull();
    expect(missionTalkLanguage("irgendwas", undefined)).toBeNull();
  });
});

describe("talkLanguageLabel", () => {
  it("beschriftet in der Sprache des Lesers", () => {
    expect(talkLanguageLabel("en", "de")).toBe("Englisch");
    expect(talkLanguageLabel("en", "en")).toBe("English");
    expect(talkLanguageLabel("Deutsch", "en")).toBe("German");
  });

  it("liefert null statt eines Platzhalters", () => {
    expect(talkLanguageLabel(null, "de")).toBeNull();
  });
});
