import { describe, expect, it, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import {
  commitParts,
  deleteMedia,
  discardParts,
  mediaSize,
  openMedia,
  readMediaRange,
  storePart,
} from "./storage";

// Der mehrteilige Upload der Medienablage. Geprüft wird der lokale Weg
// (public/uploads); der Blob-Weg nutzt dieselben Aufrufe mit demselben Vertrag.
// Absichtlich kleine Teile: die Mechanik ist größenunabhängig.

const LOCAL = path.join(process.cwd(), "public", "uploads");
const targets: string[] = [];

afterAll(async () => {
  for (const name of targets) await rm(path.join(LOCAL, name), { force: true });
});

function newTarget(): string {
  const name = `test-${randomUUID()}.pptx`;
  targets.push(name);
  return name;
}

const part = (fill: number, size = 1024) => Buffer.alloc(size, fill);

describe("Mehrteiliger Upload", () => {
  it("setzt die Teile in der richtigen Reihenfolge zusammen", async () => {
    const target = newTarget();
    const uploadId = randomUUID();
    const parts = [part(1), part(2), part(3)];
    for (const [index, data] of parts.entries()) {
      await storePart(target, uploadId, index, data);
    }

    const stored = await commitParts(target, uploadId, parts.length, "application/octet-stream");
    expect(stored.path).toBe(`uploads/${target}`);
    expect(await mediaSize(stored.path)).toBe(3 * 1024);

    const opened = await openMedia(target);
    const chunks: Buffer[] = [];
    for await (const chunk of opened!.stream) chunks.push(Buffer.from(chunk));
    const full = Buffer.concat(chunks);
    expect(full.subarray(0, 1024)).toEqual(parts[0]);
    expect(full.subarray(1024, 2048)).toEqual(parts[1]);
    expect(full.subarray(2048)).toEqual(parts[2]);
  });

  it("setzt nichts zusammen, wenn ein Teil fehlt", async () => {
    const target = newTarget();
    const uploadId = randomUUID();
    await storePart(target, uploadId, 0, part(1));
    // Teil 1 fehlt — statt einer halben Datei muss das scheitern.
    await storePart(target, uploadId, 2, part(3));

    await expect(commitParts(target, uploadId, 3, "application/octet-stream")).rejects.toThrow();
    expect(await mediaSize(target)).toBeNull();
    await discardParts(uploadId);
  });

  it("liest Anfang und Ende einer Datei für die Prüfung", async () => {
    const target = newTarget();
    const uploadId = randomUUID();
    await storePart(target, uploadId, 0, Buffer.from("ANFANG-mitte-ENDE"));
    await commitParts(target, uploadId, 1, "application/octet-stream");

    expect((await readMediaRange(target, 0, 6))?.toString()).toBe("ANFANG");
    expect((await readMediaRange(target, 13, 4))?.toString()).toBe("ENDE");
    // Über das Dateiende hinaus lesen liefert, was da ist — nicht mehr.
    expect((await readMediaRange(target, 13, 999))?.toString()).toBe("ENDE");
  });

  it("räumt eine verworfene Datei weg und meldet Fehlendes als null", async () => {
    const target = newTarget();
    const uploadId = randomUUID();
    await storePart(target, uploadId, 0, part(9));
    await commitParts(target, uploadId, 1, "application/octet-stream");

    await deleteMedia(target);
    expect(await mediaSize(target)).toBeNull();
    expect(await openMedia(target)).toBeNull();
    expect(await readMediaRange(target, 0, 4)).toBeNull();
  });
});
