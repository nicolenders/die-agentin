import { describe, expect, it, afterAll } from "vitest";
import { Readable, Transform } from "node:stream";
import { stat, rm } from "node:fs/promises";
import path from "node:path";
import { storeStream, deleteMedia, openMedia } from "./storage";
import { PresentationScanner } from "@/lib/slide-templates";

// Die Strom-Strecke der Medienablage: Uploads großer Dateien (Foliensvorlagen)
// dürfen nie vollständig im Speicher liegen. Geprüft wird hier der lokale Weg
// (public/uploads) — der Blob-Weg nutzt dieselben Aufrufe mit demselben Vertrag.
// Absichtlich kleine Dateien: die Mechanik ist größenunabhängig.

const LOCAL = path.join(process.cwd(), "public", "uploads");
const OK_NAME = "test-stream.pptx";
const ABORT_NAME = "test-stream-abbruch.pptx";
const written = [OK_NAME, ABORT_NAME];

afterAll(async () => {
  for (const name of written) await rm(path.join(LOCAL, name), { force: true });
});

/** Strom, der wie eine .pptx beginnt und dann auf `totalBytes` auffüllt. */
function fakeUpload(totalBytes: number): Readable {
  const head = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]),
    Buffer.from("ppt/presentation.xml", "latin1"),
  ]);
  const block = Buffer.alloc(64 * 1024, 7);
  let sent = 0;
  return new Readable({
    read() {
      if (sent === 0) {
        sent += head.length;
        this.push(head);
        return;
      }
      if (sent >= totalBytes) {
        this.push(null);
        return;
      }
      const size = Math.min(block.length, totalBytes - sent);
      sent += size;
      this.push(block.subarray(0, size));
    },
  });
}

/** Wie in der Upload-Route: prüfen und Obergrenze durchsetzen im Vorbeifließen. */
function guarded(source: Readable, scanner: PresentationScanner, maxBytes: number) {
  const guard = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      scanner.push(chunk);
      if (scanner.bytes > maxBytes) {
        callback(new Error("zu groß"));
        return;
      }
      callback(null, chunk);
    },
  });
  return source.pipe(guard);
}

describe("storeStream / openMedia / deleteMedia", () => {
  it("schreibt einen geprüften Strom vollständig und liest ihn wieder", async () => {
    const scanner = new PresentationScanner();
    const size = 1024 * 1024;
    const stored = await storeStream(
      OK_NAME,
      guarded(fakeUpload(size), scanner, size * 2),
      "application/octet-stream",
    );

    expect(stored.path).toBe(`uploads/${OK_NAME}`);
    expect(scanner.verdict()).toEqual({ ok: true });
    expect(scanner.bytes).toBe(size);
    expect((await stat(path.join(LOCAL, OK_NAME))).size).toBe(size);

    const opened = await openMedia(OK_NAME);
    expect(opened?.size).toBe(size);
    opened?.stream.destroy();
  });

  it("bricht bei überschrittener Obergrenze ab und lässt keinen Rest zurück", async () => {
    const scanner = new PresentationScanner();
    const maxBytes = 128 * 1024;
    await expect(
      storeStream(
        ABORT_NAME,
        guarded(fakeUpload(maxBytes * 4), scanner, maxBytes),
        "application/octet-stream",
      ),
    ).rejects.toThrow();
    expect(scanner.bytes).toBeGreaterThan(maxBytes);

    await deleteMedia(ABORT_NAME);
    expect(await openMedia(ABORT_NAME)).toBeNull();
  });

  it("meldet fehlende Dateien als null, statt zu werfen", async () => {
    expect(await openMedia("gibt-es-nicht.pptx")).toBeNull();
  });
});
