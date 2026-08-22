import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { discardParts, deleteMedia } from "@/lib/media/storage";
import { assembleAndMeasure, guardUpload, receivePart } from "@/lib/media/chunked-upload";
import { isUploadId, SLIDE_TEMPLATE_PART_BYTES } from "@/lib/slide-templates";
import {
  ATTACHMENT_TOO_LARGE,
  MAX_ATTACHMENT_BYTES,
  attachmentContentType,
  attachmentExtension,
  guessAttachmentKind,
  safeAttachmentName,
  toAttachmentKind,
} from "@/lib/briefings/attachments";

export const runtime = "nodejs";

// Upload von Material zu einem Briefing: Anleitungen, Notizen, Demo-Dateien,
// Videos. Derselbe mehrteilige Weg wie bei den Foliensätzen — ein Demo-Video
// wiegt schnell ein paar hundert MB, und in Stücken ist jeder Fehlschlag klein
// und wiederholbar.
//
// Zwei Unterschiede zum Foliensatz-Upload:
//  1. Geprüft wird nur die GRÖSSE der abgelegten Datei. Ob ein MP4 wirklich ein
//     MP4 ist, lässt sich hier nicht sinnvoll feststellen — die Sperre ist die
//     Liste zugelassener Endungen.
//  2. Es gibt beliebig viele Anhänge je Briefing, kein Upsert je Sprache.

/** Wie viele Teile eine Datei an der Obergrenze braucht, plus Reserve. */
const MAX_ATTACHMENT_PARTS = Math.ceil(MAX_ATTACHMENT_BYTES / SLIDE_TEMPLATE_PART_BYTES) + 1;

export async function POST(request: Request) {
  const denied = await guardUpload(request, "talk-attachment");
  if (denied) return denied;

  const query = new URL(request.url).searchParams;
  const uploadId = query.get("upload") ?? "";
  if (!isUploadId(uploadId)) {
    return NextResponse.json({ error: "Upload-Kennung fehlt oder ist ungültig." }, { status: 400 });
  }

  const fileName = safeAttachmentName(query.get("name") ?? "");
  const ext = attachmentExtension(fileName);
  if (!ext) {
    await discardParts(uploadId);
    return NextResponse.json(
      {
        error:
          "Dateityp nicht zugelassen. Erlaubt sind Dokumente, Bilder, Video, Ton und ZIP — nicht aber Ausführbares oder SVG.",
      },
      { status: 415 },
    );
  }
  const target = `${uploadId}.${ext}`;

  if (query.get("phase") !== "commit") {
    return receivePart(request, target, uploadId, query.get("index"), MAX_ATTACHMENT_PARTS);
  }

  const talkId = query.get("talk") ?? "";
  if (!talkId) {
    await discardParts(uploadId);
    return NextResponse.json({ error: "Briefing fehlt." }, { status: 400 });
  }
  // Erst prüfen, ob es das Briefing gibt: sonst läge eine Datei in der Ablage,
  // zu der es keinen Eintrag geben kann.
  const talk = await db.talk.findUnique({ where: { id: talkId }, select: { id: true } }).catch(() => null);
  if (!talk) {
    await discardParts(uploadId);
    return NextResponse.json(
      { error: "Briefing nicht gefunden. Erst anlegen, dann Material hinterlegen." },
      { status: 404 },
    );
  }

  const mime = attachmentContentType(fileName);
  const result = await assembleAndMeasure({
    target,
    uploadId,
    parts: Number(query.get("parts")),
    expectedSize: Number(query.get("size")),
    contentType: mime,
    maxParts: MAX_ATTACHMENT_PARTS,
    maxBytes: MAX_ATTACHMENT_BYTES,
    tooLarge: ATTACHMENT_TOO_LARGE,
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    // Neues Material hinten anstellen: die Reihenfolge ist die des Hinzufügens,
    // bis sie von Hand geändert wird.
    const last = await db.talkAttachment.findFirst({
      where: { talkId },
      orderBy: { sortOrder: "desc" },
      select: { sortOrder: true },
    });
    const created = await db.talkAttachment.create({
      data: {
        talkId,
        kind: toAttachmentKind(query.get("kind") ?? guessAttachmentKind(fileName)),
        title: fileName,
        blobPath: result.path,
        fileName,
        mime,
        bytes: result.size,
        sortOrder: (last?.sortOrder ?? 0) + 1,
      },
    });
    return NextResponse.json({ id: created.id, path: result.path, fileName, bytes: result.size });
  } catch (error) {
    console.error("[talk-attachment] Material konnte nicht hinterlegt werden:", error);
    await deleteMedia(result.path);
    return NextResponse.json(
      { error: "Material konnte nicht hinterlegt werden (Datenbank nicht erreichbar). Bitte erneut versuchen." },
      { status: 502 },
    );
  }
}
