import { describe, expect, it } from "vitest";
import {
  ATTACHMENT_ACCEPT,
  ATTACHMENT_TOO_LARGE,
  MAX_ATTACHMENT_MB,
  attachmentContentType,
  attachmentExtension,
  formatBytes,
  guessAttachmentKind,
  isPreviewable,
  safeAttachmentName,
  toAttachmentKind,
} from "./attachments";

describe("attachmentExtension", () => {
  it("erkennt zugelassene Endungen, auch in Großschreibung", () => {
    expect(attachmentExtension("Anleitung.PDF")).toBe("pdf");
    expect(attachmentExtension("demo.mp4")).toBe("mp4");
  });

  it("weist alles ab, was nicht auf der Liste steht", () => {
    expect(attachmentExtension("skript.exe")).toBeNull();
    expect(attachmentExtension("bild.svg")).toBeNull();
    expect(attachmentExtension("ohne-endung")).toBeNull();
  });
});

describe("attachmentContentType", () => {
  it("liefert den Typ zur Endung", () => {
    expect(attachmentContentType("a.mp4")).toBe("video/mp4");
    expect(attachmentContentType("a.md")).toBe("text/markdown");
  });

  it("fällt bei Unbekanntem auf den neutralen Typ zurück", () => {
    expect(attachmentContentType("a.exe")).toBe("application/octet-stream");
  });
});

describe("safeAttachmentName", () => {
  it("wirft Pfadangaben weg", () => {
    expect(safeAttachmentName("C:\\Temp\\Demo Datei.zip")).toBe("Demo Datei.zip");
    expect(safeAttachmentName("../../etc/passwd.txt")).toBe("passwd.txt");
  });

  it("entfernt Sonderzeichen und kürzt", () => {
    expect(safeAttachmentName('an"lei<tung>.pdf')).toBe("anleitung.pdf");
    expect(safeAttachmentName(`${"a".repeat(300)}.pdf`).length).toBeLessThanOrEqual(120);
  });

  it("hat immer einen Namen", () => {
    expect(safeAttachmentName("")).toBe("datei");
    expect(safeAttachmentName("///")).toBe("datei");
  });
});

describe("guessAttachmentKind", () => {
  it("schlägt anhand der Endung vor", () => {
    expect(guessAttachmentKind("demo.mp4")).toBe("VIDEO");
    expect(guessAttachmentKind("notizen.md")).toBe("NOTES");
    expect(guessAttachmentKind("anleitung.pdf")).toBe("GUIDE");
    expect(guessAttachmentKind("daten.zip")).toBe("DEMO");
    expect(guessAttachmentKind("bild.png")).toBe("OTHER");
  });
});

describe("toAttachmentKind", () => {
  it("nimmt gültige Werte und sonst „Sonstiges“", () => {
    expect(toAttachmentKind("VIDEO")).toBe("VIDEO");
    expect(toAttachmentKind("QUATSCH")).toBe("OTHER");
    expect(toAttachmentKind(null)).toBe("OTHER");
  });
});

describe("isPreviewable", () => {
  it("zeigt nur Bilder direkt an", () => {
    expect(isPreviewable("image/png")).toBe(true);
    expect(isPreviewable("video/mp4")).toBe(false);
    expect(isPreviewable("application/pdf")).toBe(false);
  });
});

describe("formatBytes", () => {
  it("schreibt MB und KB mit deutschem Komma", () => {
    expect(formatBytes(4_400_000)).toBe("4,2 MB");
    expect(formatBytes(831_488)).toBe("812 KB");
  });

  it("hat für Leeres einen Strich", () => {
    expect(formatBytes(0)).toBe("—");
  });
});

describe("Grenzen und Auswahl", () => {
  it("nennt in der Meldung dieselbe Grenze wie die Konstante", () => {
    expect(ATTACHMENT_TOO_LARGE).toContain(String(MAX_ATTACHMENT_MB));
  });

  it("bietet im Dateidialog genau die zugelassenen Endungen an", () => {
    expect(ATTACHMENT_ACCEPT).toContain(".mp4");
    expect(ATTACHMENT_ACCEPT).toContain(".pdf");
    expect(ATTACHMENT_ACCEPT).not.toContain(".svg");
    expect(ATTACHMENT_ACCEPT).not.toContain(".exe");
  });
});
