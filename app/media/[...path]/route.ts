import { NextResponse } from "next/server";
import { readMedia } from "@/lib/media/storage";
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

  const buffer = await readMedia(name);
  if (!buffer) {
    return new NextResponse("Not found", { status: 404 });
  }

  // `?dl=<Dateiname>` liefert die Datei als Download mit sprechendem Namen
  // (Foliensvorlagen, Folien-PDFs). Ohne den Parameter bleibt alles wie bisher.
  const download = new URL(request.url).searchParams.get("dl");

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": contentType(name),
      "Cache-Control": "public, max-age=31536000, immutable",
      ...(download ? { "Content-Disposition": contentDisposition(download) } : {}),
    },
  });
}
