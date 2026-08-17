import { describe, expect, it } from "vitest";
import { assetUrl, contentDisposition } from "./url";

describe("assetUrl", () => {
  it("lässt absolute URLs und App-Pfade unverändert", () => {
    expect(assetUrl("https://example.org/a.webp")).toBe("https://example.org/a.webp");
    expect(assetUrl("/media/a.webp")).toBe("/media/a.webp");
  });

  it("liefert lokale Uploads direkt, Blob-Namen über den Proxy", () => {
    expect(assetUrl("uploads/a.webp")).toBe("/uploads/a.webp");
    expect(assetUrl("a1b2.pptx")).toBe("/media/a1b2.pptx");
  });
});

describe("contentDisposition", () => {
  it("setzt den Dateinamen in beiden Formen", () => {
    expect(contentDisposition("Vorlage.pptx")).toBe(
      `attachment; filename="Vorlage.pptx"; filename*=UTF-8''Vorlage.pptx`,
    );
  });

  it("hält Umlaute im UTF-8-Teil und ersetzt sie im ASCII-Teil", () => {
    const header = contentDisposition("Übersicht.pptx");
    expect(header).toContain(`filename="_bersicht.pptx"`);
    expect(header).toContain("filename*=UTF-8''%C3%9Cbersicht.pptx");
  });

  it("lässt sich nicht aufbrechen", () => {
    const header = contentDisposition('a"; x=1\r\nSet-Cookie: y=2.pptx');
    expect(header).not.toContain("\n");
    expect(header).not.toContain('"; x=1');
  });

  it("fällt bei leerem Namen auf einen Standardnamen zurück", () => {
    expect(contentDisposition("")).toBe(`attachment; filename="download"; filename*=UTF-8''download`);
  });
});
