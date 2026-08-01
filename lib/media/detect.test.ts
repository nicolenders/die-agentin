import { describe, it, expect } from "vitest";
import { detectImageMime, validateUpload, MAX_UPLOAD_BYTES } from "./detect";

const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const webp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50,
]);
const gif = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);

describe("media/detect", () => {
  it("erkennt erlaubte Bildtypen an den Magic Bytes", () => {
    expect(detectImageMime(png)).toBe("image/png");
    expect(detectImageMime(jpeg)).toBe("image/jpeg");
    expect(detectImageMime(webp)).toBe("image/webp");
  });

  it("lehnt nicht erlaubte Typen ab (z. B. GIF)", () => {
    expect(detectImageMime(gif)).toBeNull();
  });

  it("validiert Größe und Typ", () => {
    expect(validateUpload(png).ok).toBe(true);
    expect(validateUpload(new Uint8Array(0)).ok).toBe(false);
    expect(validateUpload(gif).error).toContain("JPEG");
  });

  it("weist zu große Dateien ab", () => {
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(png.subarray(0, 8), 0);
    expect(validateUpload(big).ok).toBe(false);
  });
});
