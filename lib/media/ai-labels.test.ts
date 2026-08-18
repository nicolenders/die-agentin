import { describe, it, expect } from "vitest";
import { aiImageLabels } from "./ai-labels";
import de from "@/lib/i18n/dictionaries/de";
import en from "@/lib/i18n/dictionaries/en";

// Der Transparenzhinweis muss in beiden Sprachen an denselben Bildern und
// Stellen erscheinen. Wo er im Code stand statt im Wörterbuch, lief er
// auseinander (auf /en stand „KI-generiert"). Diese Tests halten fest, dass es
// genau eine Quelle gibt und beide Sprachen sie bedienen.

describe("aiImageLabels", () => {
  it("liefert den deutschen Wortlaut", () => {
    expect(aiImageLabels("de")).toEqual({
      aiGenerated: de.common.aiGenerated,
      aiGeneratedImage: de.common.aiGeneratedImage,
    });
  });

  it("liefert den englischen Wortlaut", () => {
    expect(aiImageLabels("en")).toEqual({
      aiGenerated: en.common.aiGenerated,
      aiGeneratedImage: en.common.aiGeneratedImage,
    });
  });

  it("fällt bei unbekannter Sprache auf Deutsch zurück, statt leer zu bleiben", () => {
    expect(aiImageLabels("fr").aiGenerated).toBe(de.common.aiGenerated);
  });

  it("hält den englischen Hinweis kurz und englisch", () => {
    expect(en.common.aiGenerated).toBe("AI generated");
    expect(en.common.aiGeneratedShort).toBe("AI");
    expect(en.common.aiGeneratedImage).toBe("AI generated image");
    // Kein deutscher Rest in der englischen Fassung.
    for (const value of Object.values(en.common)) {
      expect(value).not.toContain("KI-generiert");
    }
  });
});
