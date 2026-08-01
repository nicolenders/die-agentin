import { describe, it, expect } from "vitest";
import { sanitizeDocument } from "./sanitize";
import type { TiptapDoc } from "./schema";

const wrap = (...content: unknown[]): unknown => ({ type: "doc", content });

describe("content/sanitize", () => {
  it("gibt bei ungültiger Eingabe ein leeres Dokument zurück", () => {
    expect(sanitizeDocument(null, "post")).toEqual({ type: "doc", content: [] });
    expect(sanitizeDocument({ foo: 1 }, "post")).toEqual({ type: "doc", content: [] });
  });

  it("verwirft unbekannte Node-Typen", () => {
    const doc = wrap(
      { type: "paragraph", content: [{ type: "text", text: "ok" }] },
      { type: "script", content: [{ type: "text", text: "böse" }] },
      { type: "iframe" },
    );
    const result = sanitizeDocument(doc, "post");
    expect(result.content).toHaveLength(1);
    expect(result.content[0]?.type).toBe("paragraph");
  });

  it("klemmt Überschriften auf H2/H3", () => {
    const doc = wrap(
      { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "a" }] },
      { type: "heading", attrs: { level: 3 }, content: [{ type: "text", text: "b" }] },
      { type: "heading", attrs: { level: 6 }, content: [{ type: "text", text: "c" }] },
    );
    const levels = sanitizeDocument(doc, "post").content.map((n) => n.attrs?.level);
    expect(levels).toEqual([2, 3, 2]);
  });

  it("lässt gallery/video/toc nur im passenden Kontext zu", () => {
    const doc = wrap(
      { type: "gallery", attrs: { assetIds: ["a1"] } },
      { type: "video", attrs: { videoId: "xyz" } },
      { type: "toc" },
    );
    // Im Beitrag (post) sind diese Bausteine nicht erlaubt.
    expect(sanitizeDocument(doc, "post").content).toHaveLength(0);
    // Im Dossier schon.
    const dossier = sanitizeDocument(doc, "dossier");
    expect(dossier.content.map((n) => n.type)).toEqual(["gallery", "video", "toc"]);
  });

  it("erlaubt linkCard nur in Beiträgen", () => {
    const doc = wrap({ type: "linkCard", attrs: { url: "https://example.org", title: "T" } });
    expect(sanitizeDocument(doc, "post").content).toHaveLength(1);
    expect(sanitizeDocument(doc, "dossier").content).toHaveLength(0);
  });

  it("filtert Marks auf die Allow-List", () => {
    const doc = wrap({
      type: "paragraph",
      content: [
        {
          type: "text",
          text: "x",
          marks: [{ type: "bold" }, { type: "blink" }, { type: "italic" }],
        },
      ],
    });
    const marks = sanitizeDocument(doc, "post").content[0]?.content?.[0]?.marks;
    expect(marks?.map((m) => m.type)).toEqual(["bold", "italic"]);
  });

  it("erzwingt rel=noopener auf Links und verwirft javascript:", () => {
    const doc = wrap({
      type: "paragraph",
      content: [
        { type: "text", text: "a", marks: [{ type: "link", attrs: { href: "https://x.io" } }] },
        { type: "text", text: "b", marks: [{ type: "link", attrs: { href: "javascript:alert(1)" } }] },
      ],
    });
    const [a, b] = sanitizeDocument(doc, "post").content[0]?.content ?? [];
    expect(a?.marks?.[0]?.attrs?.rel).toContain("noopener");
    expect(a?.marks?.[0]?.attrs?.["data-external"]).toBe("true");
    // Unsicherer Link-Mark wird entfernt, der Text bleibt.
    expect(b?.marks).toBeUndefined();
  });

  it("verwirft ein Bild ohne assetId und behält gültige Layout-Werte", () => {
    const doc = wrap(
      { type: "image", attrs: { caption: "ohne id" } },
      { type: "image", attrs: { assetId: "a1", layout: "left" } },
      { type: "image", attrs: { assetId: "a2", layout: "unsinn" } },
    );
    const imgs = sanitizeDocument(doc, "post").content;
    expect(imgs).toHaveLength(2);
    expect(imgs[0]?.attrs?.layout).toBe("left");
    expect(imgs[1]?.attrs?.layout).toBe("full");
  });

  it("übernimmt ein gültiges Marginalbild am Absatz", () => {
    const doc = wrap({
      type: "paragraph",
      attrs: { marginAsset: { assetId: "a1", side: "right", caption: "c" } },
      content: [{ type: "text", text: "x" }],
    });
    const para = sanitizeDocument(doc, "post").content[0];
    expect(para?.attrs?.marginAsset).toEqual({ assetId: "a1", side: "right", caption: "c" });
  });

  it("entfernt ein Marginalbild mit ungültiger Seite", () => {
    const doc = wrap({
      type: "paragraph",
      attrs: { marginAsset: { assetId: "a1", side: "oben" } },
      content: [{ type: "text", text: "x" }],
    });
    expect(sanitizeDocument(doc, "post").content[0]?.attrs).toBeUndefined();
  });

  it("bewahrt verschachtelte Listen", () => {
    const doc = wrap({
      type: "bulletList",
      content: [
        { type: "listItem", content: [{ type: "paragraph", content: [{ type: "text", text: "1" }] }] },
      ],
    });
    const result: TiptapDoc = sanitizeDocument(doc, "post");
    expect(result.content[0]?.type).toBe("bulletList");
    expect(result.content[0]?.content?.[0]?.type).toBe("listItem");
  });
});
