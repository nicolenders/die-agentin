import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { openMedia } from "@/lib/media/storage";
import { contentDisposition } from "@/lib/media/url";
import { SLIDE_TEMPLATE_MIME } from "@/lib/slide-templates";

export const runtime = "nodejs";

// Öffentlicher Medien-Proxy. Streamt Bilder aus dem Blob-Container (per Managed
// Identity) bzw. lokal aus public/uploads — so werden Medien unabhängig von der
// öffentlichen Blob-Zugänglichkeit ausgeliefert und bleiben Same-Origin (CSP).
// Blob-Namen enthalten die Asset-ID → Inhalt ist unveränderlich, lange cachebar.

const CONTENT_TYPES: Record<string, string> = {
  webp: "image/webp",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  avif: "image/avif",
  gif: "image/gif",
  svg: "image/svg+xml",
  pdf: "application/pdf",
  pptx: SLIDE_TEMPLATE_MIME.pptx,
  potx: SLIDE_TEMPLATE_MIME.potx,
};

function contentType(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  return CONTENT_TYPES[ext] ?? "application/octet-stream";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ path: string[] }> },
) {
  const { path } = await params;
  const name = (path ?? []).join("/");
  // Pfad-Traversal und leere Namen ablehnen.
  if (!name || name.includes("..") || name.startsWith("/")) {
    return new NextResponse("Not found", { status: 404 });
  }

  // Als Strom, nicht als Puffer: eine 40-MB-Vorlage würde sonst zweimal
  // vollständig im Speicher liegen (einmal gelesen, einmal für die Antwort).
  const media = await openMedia(name);
  if (!media) {
    return new NextResponse("Not found", { status: 404 });
  }

  // `?dl=<Dateiname>` liefert die Datei als Download mit sprechendem Namen
  // (Foliensvorlagen, Folien-PDFs). Ohne den Parameter bleibt alles wie bisher.
  const download = new URL(request.url).searchParams.get("dl");

  return new NextResponse(Readable.toWeb(media.stream) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": contentType(name),
      // Die harte Policy für diesen Pfad (`default-src 'none'; sandbox`) und
      // `nosniff` stehen in next.config.ts: Header aus der Konfiguration
      // überschreiben, was hier gesetzt wird — hier stünden sie wirkungslos.
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(media.size != null ? { "Content-Length": String(media.size) } : {}),
      ...(download ? { "Content-Disposition": contentDisposition(download) } : {}),
    },
  });
}
