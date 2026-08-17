import { describe, expect, it, vi, afterAll } from "vitest";
import { createHash, randomUUID } from "node:crypto";
import { rm } from "node:fs/promises";
import path from "node:path";
import { SLIDE_TEMPLATE_PART_BYTES } from "./slide-templates";

// Die vollständige Strecke, so wie sie im Betrieb läuft: Teilstücke hochladen,
// abschließen, herunterladen — durch die echten Route-Handler, nur Anmeldung und
// Datenbank sind ersetzt. Das ist der Test, der die eigentliche Frage
// beantwortet: Kommt die Datei Byte für Byte wieder heraus, und wird eine
// abgebrochene Übertragung erkannt statt stillschweigend gespeichert?

const settings = new Map<string, string>();

vi.mock("@/lib/auth/guard", () => ({
  getSessionUser: async () => ({ isAdmin: true, oid: "test" }),
  requireAdmin: async () => ({ isAdmin: true }),
}));

vi.mock("@/lib/db", () => {
  const upsert = async ({ where, create }: { where: { key: string }; create: { value: string } }) => {
    settings.set(where.key, create.value);
  };
  return {
    db: {
      siteSetting: { upsert },
      $transaction: async (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),
    },
  };
});

const ENDPOINT = "http://localhost:3000/api/admin/missions/slide-template";
const stored: string[] = [];

afterAll(async () => {
  for (const name of stored) {
    await rm(path.join(process.cwd(), "public", "uploads", name), { force: true });
  }
});

const ascii = (text: string) => Buffer.from(text, "latin1");

/**
 * Eine Datei, die sich wie eine .pptx verhält: ZIP-Signatur, Präsentationsteil,
 * Füllung, zentrales Verzeichnis und Schlussmarke. Der Inhalt dazwischen ist
 * beliebig — geprüft wird, dass er unverändert zurückkommt.
 */
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
  const filler = Buffer.alloc(Math.max(0, size - head.length - end.length));
  for (let i = 0; i < filler.length; i += 1) filler[i] = i % 251;
  return Buffer.concat([head, filler, end]);
}

async function uploadParts(file: Buffer, uploadId: string, upTo?: number): Promise<number> {
  const { POST } = await import("@/app/api/admin/missions/slide-template/route");
  const total = Math.ceil(file.length / SLIDE_TEMPLATE_PART_BYTES);
  const send = upTo ?? total;
  for (let index = 0; index < send; index += 1) {
    const slice = file.subarray(
      index * SLIDE_TEMPLATE_PART_BYTES,
      Math.min(file.length, (index + 1) * SLIDE_TEMPLATE_PART_BYTES),
    );
    const response = await POST(
      new Request(`${ENDPOINT}?phase=part&upload=${uploadId}&index=${index}&name=vorlage.pptx`, {
        method: "POST",
        body: new Uint8Array(slice),
      }),
    );
    expect(response.status).toBe(200);
  }
  return total;
}

async function commit(uploadId: string, parts: number, size: number): Promise<Response> {
  const { POST } = await import("@/app/api/admin/missions/slide-template/route");
  return POST(
    new Request(
      `${ENDPOINT}?phase=commit&upload=${uploadId}&locale=de&name=vorlage.pptx&parts=${parts}&size=${size}`,
      { method: "POST" },
    ),
  );
}

const sha = (b: Buffer) => createHash("sha256").update(b).digest("hex");

describe("Foliensvorlage: Upload in Teilen, Prüfung, Download", () => {
  it("liefert die Datei Byte für Byte zurück", async () => {
    const { GET } = await import("@/app/media/[...path]/route");
    const file = fakePresentation(10 * 1024 * 1024);
    const uploadId = randomUUID();

    const parts = await uploadParts(file, uploadId);
    expect(parts).toBeGreaterThan(1); // wirklich mehrteilig

    const response = await commit(uploadId, parts, file.length);
    const payload = await response.json();
    expect(response.status).toBe(200);
    expect(payload.bytes).toBe(file.length);
    stored.push(String(payload.path).replace(/^uploads\//, ""));

    const name = String(payload.path).replace(/^uploads\//, "");
    const download = await GET(new Request(`http://localhost:3000/media/${name}?dl=vorlage.pptx`), {
      params: Promise.resolve({ path: [name] }),
    });
    expect(download.status).toBe(200);
    expect(download.headers.get("content-length")).toBe(String(file.length));
    expect(download.headers.get("content-disposition")).toContain("vorlage.pptx");

    const back = Buffer.from(await download.arrayBuffer());
    expect(back.length).toBe(file.length);
    expect(sha(back)).toBe(sha(file));
  });

  it("lehnt eine abgebrochene Übertragung ab, statt sie zu hinterlegen", async () => {
    const file = fakePresentation(10 * 1024 * 1024);
    const uploadId = randomUUID();

    // Nur die Hälfte der Teile — der Rest ging unterwegs verloren.
    const total = await uploadParts(file, uploadId, 1);
    const response = await commit(uploadId, 1, file.length);
    const payload = await response.json();

    expect(total).toBeGreaterThan(1);
    expect(response.status).toBe(400);
    expect(payload.error).toContain("unvollständig");
    // Nichts hinterlegt, nichts liegen gelassen.
    expect(settings.get("slideTemplate.de.path")).not.toContain(uploadId);
  });

  it("weist eine fremde Datei ab", async () => {
    const uploadId = randomUUID();
    const { POST } = await import("@/app/api/admin/missions/slide-template/route");
    const pdf = Buffer.concat([ascii("%PDF-1.7"), Buffer.alloc(2048, 3)]);
    await POST(
      new Request(`${ENDPOINT}?phase=part&upload=${uploadId}&index=0&name=vorlage.pptx`, {
        method: "POST",
        body: new Uint8Array(pdf),
      }),
    );
    const response = await commit(uploadId, 1, pdf.length);
    expect(response.status).toBe(400);
    expect((await response.json()).error).toContain("PowerPoint");
  });

  it("weist eine erfundene Upload-Kennung ab", async () => {
    const { POST } = await import("@/app/api/admin/missions/slide-template/route");
    const response = await POST(
      new Request(`${ENDPOINT}?phase=part&upload=../../etc&index=0&name=x.pptx`, {
        method: "POST",
        body: new Uint8Array([1, 2, 3]),
      }),
    );
    expect(response.status).toBe(400);
  });
});
