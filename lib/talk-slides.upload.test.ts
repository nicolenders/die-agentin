import { describe, expect, it, vi, afterAll } from "vitest";
import { randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { SLIDE_TEMPLATE_PART_BYTES } from "./slide-templates";

// Der Foliensatz am Briefing geht denselben Weg wie eine Vorlage — geprüft wird
// hier, dass er auch dort landet: am richtigen Briefing, in der richtigen
// Sprache, und nur wenn die Datei vollständig angekommen ist.

const decks = new Map<string, { blobPath: string; fileName: string; bytes: number }>();
const KNOWN_TALK = "talk-123";

vi.mock("@/lib/auth/guard", () => ({
  getSessionUser: async () => ({ isAdmin: true, oid: "test" }),
  requireAdmin: async () => ({ isAdmin: true }),
}));

vi.mock("@/lib/db", () => ({
  db: {
    talk: {
      findUnique: async ({ where }: { where: { id: string } }) =>
        where.id === KNOWN_TALK ? { id: KNOWN_TALK } : null,
    },
    talkSlideDeck: {
      upsert: async ({
        where,
        create,
      }: {
        where: { talkId_locale: { talkId: string; locale: string } };
        create: { blobPath: string; fileName: string; bytes: number };
      }) => {
        decks.set(`${where.talkId_locale.talkId}:${where.talkId_locale.locale}`, create);
      },
    },
  },
}));

const ENDPOINT = "http://localhost:3000/api/admin/briefings/slides";
const LOCAL = path.join(process.cwd(), "public", "uploads");
const stored: string[] = [];
const uploads: string[] = [];

// Nur die eigenen Spuren beseitigen: Das Verzeichnis der Zwischenstücke teilen
// sich die Tests, die parallel laufen — wer es als Ganzes löscht, zieht einem
// anderen Lauf die Teile unter den Füßen weg.
afterAll(async () => {
  for (const name of stored) await rm(path.join(LOCAL, name), { force: true });
  for (const id of uploads) await rm(path.join(LOCAL, ".parts", id), { recursive: true, force: true });
});

/** Upload-Kennung, die am Ende mit aufgeräumt wird. */
function newUploadId(): string {
  const id = randomUUID();
  uploads.push(id);
  return id;
}

const ascii = (text: string) => Buffer.from(text, "latin1");

/** Eine Datei, die sich wie eine vollständige .pptx verhält. */
function fakePresentation(size: number): Buffer {
  const head = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x03, 0x04, 0x14, 0x00]),
    ascii("ppt/presentation.xml"),
  ]);
  const end = Buffer.concat([
    Buffer.from([0x50, 0x4b, 0x01, 0x02]),
    ascii("ppt/presentation.xml"),
    Buffer.from([0x50, 0x4b, 0x05, 0x06]),
    Buffer.alloc(18),
  ]);
  const filler = Buffer.alloc(Math.max(0, size - head.length - end.length), 5);
  return Buffer.concat([head, filler, end]);
}

async function upload(file: Buffer, uploadId: string, sendParts?: number) {
  const { POST } = await import("@/app/api/admin/briefings/slides/route");
  const total = Math.ceil(file.length / SLIDE_TEMPLATE_PART_BYTES);
  for (let index = 0; index < (sendParts ?? total); index += 1) {
    const slice = file.subarray(
      index * SLIDE_TEMPLATE_PART_BYTES,
      Math.min(file.length, (index + 1) * SLIDE_TEMPLATE_PART_BYTES),
    );
    const response = await POST(
      new Request(`${ENDPOINT}?phase=part&upload=${uploadId}&index=${index}&name=folien.pptx`, {
        method: "POST",
        body: new Uint8Array(slice),
      }),
    );
    expect(response.status).toBe(200);
  }
  return total;
}

async function commit(uploadId: string, parts: number, size: number, talkId = KNOWN_TALK, locale = "de") {
  const { POST } = await import("@/app/api/admin/briefings/slides/route");
  return POST(
    new Request(
      `${ENDPOINT}?phase=commit&upload=${uploadId}&talk=${talkId}&locale=${locale}&name=folien.pptx&parts=${parts}&size=${size}`,
      { method: "POST" },
    ),
  );
}

describe("Foliensatz am Briefing", () => {
  it("hinterlegt die Datei am Briefing in der gewählten Sprache", async () => {
    const file = fakePresentation(6 * 1024 * 1024);
    const uploadId = newUploadId();
    const parts = await upload(file, uploadId);

    const response = await commit(uploadId, parts, file.length, KNOWN_TALK, "en");
    const payload = await response.json();
    expect(response.status).toBe(200);
    stored.push(String(payload.path).replace(/^uploads\//, ""));

    const deck = decks.get(`${KNOWN_TALK}:en`);
    expect(deck?.bytes).toBe(file.length);
    expect(deck?.fileName).toBe("folien.pptx");
    // Die deutsche Fassung bleibt davon unberührt.
    expect(decks.get(`${KNOWN_TALK}:de`)).toBeUndefined();
  });

  it("lehnt eine abgebrochene Übertragung ab", async () => {
    const file = fakePresentation(9 * 1024 * 1024);
    const uploadId = newUploadId();
    const total = await upload(file, uploadId, 1);
    expect(total).toBeGreaterThan(1);

    const response = await commit(uploadId, 1, file.length);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("unvollständig");
    expect(decks.get(`${KNOWN_TALK}:de`)).toBeUndefined();
  });

  it("nimmt nichts für ein unbekanntes Briefing an", async () => {
    const file = fakePresentation(2 * 1024 * 1024);
    const uploadId = newUploadId();
    const parts = await upload(file, uploadId);

    const response = await commit(uploadId, parts, file.length, "gibt-es-nicht");
    expect(response.status).toBe(404);
    expect(decks.get("gibt-es-nicht:de")).toBeUndefined();
  });
});
