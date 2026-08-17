import { describe, expect, it } from "vitest";
import {
  ARCHIVE_PROBE_BYTES,
  EMPTY_SLIDE_TEMPLATES,
  formatMb,
  isLegacyPowerPoint,
  isUploadId,
  MAX_PARTS,
  MAX_SLIDE_TEMPLATE_BYTES,
  MAX_SLIDE_TEMPLATE_MB,
  SLIDE_TEMPLATE_PART_BYTES,
  SLIDE_TEMPLATE_TOO_LARGE,
  pickForLanguage,
  pickSlideTemplate,
  safeTemplateName,
  slideTemplateKeys,
  slideTemplateUrl,
  templateExtension,
  verifyTemplateArchive,
  type SlideTemplate,
} from "./slide-templates";

const de: SlideTemplate = { locale: "de", path: "abc.pptx", fileName: "vorlage-de.pptx", bytes: 42 };
const en: SlideTemplate = { locale: "en", path: "def.pptx", fileName: "template-en.pptx", bytes: 42 };

const ascii = (text: string) => Array.from(text, (c) => c.charCodeAt(0));

/** Anfang einer OOXML-Präsentation: ZIP-Signatur plus erster Eintragsname. */
function fakeHead(entryName = "ppt/presentation.xml"): Uint8Array {
  return Uint8Array.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00, ...ascii(entryName), 0x00]);
}

/** Ende einer vollständigen Datei: Verzeichniseintrag plus Schlussmarke. */
function fakeTail(entryName = "ppt/presentation.xml"): Uint8Array {
  return Uint8Array.from([
    0x50, 0x4b, 0x01, 0x02, ...ascii(entryName),
    0x50, 0x4b, 0x05, 0x06, ...new Array(18).fill(0),
  ]);
}

/** Vollständige, gültige Datei mit passender Größe. */
const goodProbe = (size = 1000) => ({ size, expectedSize: size, head: fakeHead(), tail: fakeTail() });

describe("slideTemplateKeys", () => {
  it("liefert je Sprache eigene Schlüssel", () => {
    expect(slideTemplateKeys("de")).toEqual({
      path: "slideTemplate.de.path",
      name: "slideTemplate.de.fileName",
      bytes: "slideTemplate.de.bytes",
    });
    expect(slideTemplateKeys("en").path).not.toBe(slideTemplateKeys("de").path);
  });
});

describe("Obergrenze", () => {
  it("nennt in der Meldung dieselbe Zahl, die geprüft wird", () => {
    expect(MAX_SLIDE_TEMPLATE_BYTES).toBe(MAX_SLIDE_TEMPLATE_MB * 1024 * 1024);
    expect(SLIDE_TEMPLATE_TOO_LARGE).toContain(String(MAX_SLIDE_TEMPLATE_MB));
  });

  it("lässt eine übliche Corporate-Vorlage durch (rund 42 MB)", () => {
    expect(42 * 1024 * 1024).toBeLessThan(MAX_SLIDE_TEMPLATE_BYTES);
  });

  it("deckt mit der erlaubten Teilezahl die volle Dateigröße ab", () => {
    expect(MAX_PARTS * SLIDE_TEMPLATE_PART_BYTES).toBeGreaterThanOrEqual(MAX_SLIDE_TEMPLATE_BYTES);
    // 42 MB in Teilstücken: eine überschaubare Zahl von Anfragen.
    expect(Math.ceil(42 * 1024 * 1024 / SLIDE_TEMPLATE_PART_BYTES)).toBeLessThan(20);
  });
});

describe("isUploadId", () => {
  it("nimmt UUIDs an und weist alles ab, was ein Pfad sein könnte", () => {
    expect(isUploadId("123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(isUploadId("../../etc/passwd")).toBe(false);
    expect(isUploadId("abc")).toBe(false);
    expect(isUploadId("")).toBe(false);
  });
});

describe("formatMb", () => {
  it("schreibt Größen so, wie sie im Explorer stehen", () => {
    expect(formatMb(41703 * 1024)).toBe("40,7 MB");
    expect(formatMb(0)).toBe("0,0 MB");
  });
});

describe("verifyTemplateArchive", () => {
  it("nimmt eine vollständige Präsentation an", () => {
    expect(verifyTemplateArchive(goodProbe())).toEqual({ ok: true });
  });

  it("erkennt die abgeschnittene Übertragung an der fehlenden Größe", () => {
    const verdict = verifyTemplateArchive({ ...goodProbe(), size: 20 * 1024 * 1024, expectedSize: 42 * 1024 * 1024 });
    expect(verdict.ok).toBe(false);
    expect(verdict.error).toContain("unvollständig");
    expect(verdict.error).toContain("20,0 MB von 42,0 MB");
  });

  it("erkennt die abgeschnittene Übertragung auch ohne angekündigte Größe", () => {
    // Genau der Fall, der PowerPoint zum Reparieren-Dialog bringt: vorne heil,
    // hinten fehlt die Schlussmarke.
    const verdict = verifyTemplateArchive({ size: 1000, expectedSize: 0, head: fakeHead(), tail: fakeHead() });
    expect(verdict.ok).toBe(false);
    expect(verdict.error).toContain("Schlussmarke");
  });

  it("weist leere Dateien, .ppt und Fremdformate ab", () => {
    expect(verifyTemplateArchive({ ...goodProbe(), size: 0 }).error).toContain("leer");
    expect(
      verifyTemplateArchive({
        ...goodProbe(),
        head: Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]),
      }).error,
    ).toContain(".ppt");
    expect(
      verifyTemplateArchive({ ...goodProbe(), head: Uint8Array.from(ascii("%PDF-1.7")) }).error,
    ).toContain("PowerPoint");
  });

  it("weist ein ZIP ohne Präsentationsteil ab", () => {
    const verdict = verifyTemplateArchive({
      size: 1000,
      expectedSize: 1000,
      head: fakeHead("word/document.xml"),
      tail: fakeTail("word/document.xml"),
    });
    expect(verdict.ok).toBe(false);
  });

  it("liest weit genug in die Datei hinein, um das Verzeichnis zu erwischen", () => {
    expect(ARCHIVE_PROBE_BYTES).toBeGreaterThanOrEqual(64 * 1024);
  });
});

describe("templateExtension", () => {
  it("erkennt pptx und potx, sonst null", () => {
    expect(templateExtension("Vorlage.pptx")).toBe("pptx");
    expect(templateExtension("Vorlage.POTX")).toBe("potx");
    expect(templateExtension("Vorlage.pdf")).toBeNull();
    expect(templateExtension("Vorlage")).toBeNull();
  });
});

describe("safeTemplateName", () => {
  it("entfernt Pfad und Sonderzeichen, behält die Endung", () => {
    expect(safeTemplateName("C:\\Users\\nicole\\Vorlage 2026.pptx")).toBe("Vorlage 2026.pptx");
    expect(safeTemplateName("../../etc/passwd.potx")).toBe("passwd.potx");
    expect(safeTemplateName('Vorlage"; rm -rf.pptx')).toBe("Vorlage rm -rf.pptx");
  });

  it("ergänzt eine fehlende Endung", () => {
    expect(safeTemplateName("Vorlage")).toBe("Vorlage.pptx");
    expect(safeTemplateName("Vorlage", "potx")).toBe("Vorlage.potx");
  });

  it("fällt bei leerem Namen auf einen Standardnamen zurück", () => {
    expect(safeTemplateName("")).toBe("vorlage.pptx");
    expect(safeTemplateName("///")).toBe("vorlage.pptx");
    expect(safeTemplateName(".pptx")).toBe("vorlage.pptx");
  });
});

describe("isLegacyPowerPoint", () => {
  it("erkennt das alte Binärformat", () => {
    expect(isLegacyPowerPoint(Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]))).toBe(true);
    expect(isLegacyPowerPoint(fakeHead())).toBe(false);
  });
});

describe("pickSlideTemplate", () => {
  it("wählt die Vorlage der Vortragssprache", () => {
    const set = { de, en };
    expect(pickSlideTemplate(set, "en")).toEqual({ template: en, matchesLanguage: true });
    expect(pickSlideTemplate(set, "de")).toEqual({ template: de, matchesLanguage: true });
  });

  it("normalisiert Freitext-Sprachen aus Altdaten", () => {
    expect(pickSlideTemplate({ de, en }, "English")).toEqual({ template: en, matchesLanguage: true });
  });

  it("fällt ohne erkennbare Sprache auf Deutsch zurück", () => {
    expect(pickSlideTemplate({ de, en }, null)).toEqual({ template: de, matchesLanguage: true });
    expect(pickSlideTemplate({ de, en }, "klingonisch")).toEqual({ template: de, matchesLanguage: true });
  });

  it("bietet die andere Sprache an, kennzeichnet sie aber", () => {
    expect(pickSlideTemplate({ de, en: null }, "en")).toEqual({ template: de, matchesLanguage: false });
    expect(pickSlideTemplate({ de: null, en }, "de")).toEqual({ template: en, matchesLanguage: false });
  });

  it("liefert null, wenn gar nichts hinterlegt ist", () => {
    expect(pickSlideTemplate(EMPTY_SLIDE_TEMPLATES, "de")).toBeNull();
  });
});

describe("slideTemplateUrl", () => {
  it("hängt den Originalnamen als Download-Parameter an", () => {
    expect(slideTemplateUrl({ locale: "de", path: "a1.pptx", fileName: "Vorlage DE.pptx", bytes: 1 })).toBe(
      "/media/a1.pptx?dl=Vorlage%20DE.pptx",
    );
  });
});

describe("pickForLanguage", () => {
  const deDeck = { locale: "de", fileName: "folien-de.pptx" };
  const enDeck = { locale: "en", fileName: "slides-en.pptx" };

  it("wählt den Foliensatz in der Vortragssprache des Einsatzes", () => {
    expect(pickForLanguage([deDeck, enDeck], "en")).toEqual({ item: enDeck, matchesLanguage: true });
    expect(pickForLanguage([deDeck, enDeck], "de")).toEqual({ item: deDeck, matchesLanguage: true });
  });

  it("kennzeichnet die Ersatzsprache, statt sie stillschweigend zu liefern", () => {
    // Sonst stünde jemand mit deutschen Folien vor englischem Publikum.
    expect(pickForLanguage([deDeck], "en")).toEqual({ item: deDeck, matchesLanguage: false });
    expect(pickForLanguage([enDeck], "de")).toEqual({ item: enDeck, matchesLanguage: false });
  });

  it("kommt mit Lücken, Freitext und Leere zurecht", () => {
    expect(pickForLanguage([null, undefined, enDeck], "English")).toEqual({ item: enDeck, matchesLanguage: true });
    expect(pickForLanguage([], "de")).toBeNull();
    expect(pickForLanguage([null], "de")).toBeNull();
  });

  it("fällt ohne erkennbare Sprache auf Deutsch zurück", () => {
    expect(pickForLanguage([deDeck, enDeck], null)).toEqual({ item: deDeck, matchesLanguage: true });
  });
});
