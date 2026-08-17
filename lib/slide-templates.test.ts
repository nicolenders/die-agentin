import { describe, expect, it } from "vitest";
import {
  EMPTY_SLIDE_TEMPLATES,
  isLegacyPowerPoint,
  isOfficePresentation,
  MAX_SLIDE_TEMPLATE_BYTES,
  MAX_SLIDE_TEMPLATE_MB,
  PresentationScanner,
  SLIDE_TEMPLATE_TOO_LARGE,
  pickSlideTemplate,
  safeTemplateName,
  slideTemplateKeys,
  slideTemplateUrl,
  templateExtension,
  type SlideTemplate,
} from "./slide-templates";

const de: SlideTemplate = { locale: "de", path: "abc.pptx", fileName: "vorlage-de.pptx" };
const en: SlideTemplate = { locale: "en", path: "def.pptx", fileName: "template-en.pptx" };

/** Baut einen Byte-Strom, der wie eine OOXML-Präsentation aussieht. */
function fakePptx(entryName = "ppt/presentation.xml"): Uint8Array {
  const head = [0x50, 0x4b, 0x03, 0x04, 0x14, 0x00];
  const name = Array.from(entryName, (c) => c.charCodeAt(0));
  return Uint8Array.from([...head, ...name, 0x00, 0x00]);
}

describe("slideTemplateKeys", () => {
  it("liefert je Sprache eigene Schlüssel", () => {
    expect(slideTemplateKeys("de")).toEqual({
      path: "slideTemplate.de.path",
      name: "slideTemplate.de.fileName",
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

describe("isOfficePresentation", () => {
  it("akzeptiert eine OOXML-Präsentation", () => {
    expect(isOfficePresentation(fakePptx())).toBe(true);
  });

  it("weist ZIPs ohne Präsentationsteil ab", () => {
    expect(isOfficePresentation(fakePptx("word/document.xml"))).toBe(false);
  });

  it("weist Nicht-ZIPs und leere Dateien ab", () => {
    expect(isOfficePresentation(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]))).toBe(false);
    expect(isOfficePresentation(new Uint8Array())).toBe(false);
  });
});

describe("PresentationScanner", () => {
  /** Zerlegt einen Byte-Strom in Blöcke fester Größe, wie beim Upload. */
  function feed(bytes: Uint8Array, chunkSize: number): PresentationScanner {
    const scanner = new PresentationScanner();
    for (let i = 0; i < bytes.length; i += chunkSize) {
      scanner.push(bytes.subarray(i, i + chunkSize));
    }
    return scanner;
  }

  it("erkennt die Präsentation auch, wenn der Fund über Blockgrenzen fällt", () => {
    const file = fakePptx();
    for (const size of [1, 3, 7, 1024]) {
      expect(feed(file, size).verdict()).toEqual({ ok: true });
    }
  });

  it("zählt alle Bytes, damit der Aufrufer die Obergrenze durchsetzen kann", () => {
    const file = fakePptx();
    expect(feed(file, 4).bytes).toBe(file.length);
  });

  it("nennt das alte Binärformat beim Namen", () => {
    const legacy = Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00, 0x00]);
    expect(feed(legacy, 3).verdict().error).toContain(".ppt");
  });

  it("weist ZIPs ohne Präsentationsteil und leere Ströme ab", () => {
    expect(feed(fakePptx("word/document.xml"), 5).verdict().ok).toBe(false);
    expect(new PresentationScanner().verdict()).toEqual({ ok: false, error: "Die Datei ist leer." });
  });

  it("lässt eine reine Textdatei mit dem Suchwort nicht durch", () => {
    const text = Uint8Array.from("ppt/presentation.xml", (c) => c.charCodeAt(0));
    expect(feed(text, 6).verdict().ok).toBe(false);
  });
});

describe("isLegacyPowerPoint", () => {
  it("erkennt das alte Binärformat", () => {
    expect(isLegacyPowerPoint(Uint8Array.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1, 0x00]))).toBe(true);
    expect(isLegacyPowerPoint(fakePptx())).toBe(false);
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
    expect(slideTemplateUrl({ locale: "de", path: "a1.pptx", fileName: "Vorlage DE.pptx" })).toBe(
      "/media/a1.pptx?dl=Vorlage%20DE.pptx",
    );
  });
});
