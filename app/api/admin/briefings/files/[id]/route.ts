import { NextResponse } from "next/server";
import { Readable } from "node:stream";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth/guard";
import { openMedia } from "@/lib/media/storage";
import { contentDisposition } from "@/lib/media/url";
import { isPreviewable } from "@/lib/briefings/attachments";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Ausgabe einer Material-Datei. Anders als Bilder und Foliensätze läuft das
// NICHT über den öffentlichen Medien-Proxy: Notizen und Demo-Dateien sind
// interne Arbeitsablage, und eine schwer zu erratende Adresse ist kein
// Zugriffsschutz. Hier steht die Rollenprüfung davor.
//
// Ausgeliefert wird als Download. Nur Bilder dürfen im Browser erscheinen
// (Vorschau in der Liste); alles andere — auch PDF und HTML-ähnliches — geht
// als Anhang heraus und wird damit nie im Ursprung der Anwendung gerendert.

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return new NextResponse("Kein Zugriff.", { status: 403 });
  }

  const { id } = await params;
  const attachment = await db.talkAttachment
    .findUnique({ where: { id }, select: { blobPath: true, fileName: true, mime: true } })
    .catch(() => null);
  if (!attachment) {
    return new NextResponse("Nicht gefunden.", { status: 404 });
  }

  const name = attachment.blobPath.startsWith("uploads/")
    ? attachment.blobPath.slice("uploads/".length)
    : attachment.blobPath;
  if (!name || name.includes("..") || name.startsWith("/")) {
    return new NextResponse("Nicht gefunden.", { status: 404 });
  }

  const media = await openMedia(name);
  if (!media) {
    return new NextResponse("Datei nicht in der Ablage.", { status: 404 });
  }

  const inline = new URL(request.url).searchParams.get("inline") === "1" && isPreviewable(attachment.mime);

  return new NextResponse(Readable.toWeb(media.stream) as ReadableStream<Uint8Array>, {
    headers: {
      "Content-Type": attachment.mime,
      "X-Content-Type-Options": "nosniff",
      // Interne Datei: nicht in Zwischenspeichern ablegen, die andere sehen.
      "Cache-Control": "private, no-store",
      ...(media.size != null ? { "Content-Length": String(media.size) } : {}),
      "Content-Disposition": inline
        ? `inline; filename="vorschau"`
        : contentDisposition(attachment.fileName),
    },
  });
}
