import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import { deleteMedia, discardParts } from "@/lib/media/storage";
import { assembleAndVerify, guardUpload, receivePart } from "@/lib/media/chunked-upload";
import {
  SLIDE_TEMPLATE_MIME,
  isUploadId,
  safeTemplateName,
  templateExtension,
} from "@/lib/slide-templates";

export const runtime = "nodejs";

// Upload des Foliensatzes zu einem Briefing, je Sprache eine Datei. Technisch
// derselbe Weg wie bei den Vorlagen (Teilstücke, Prüfung der abgelegten Datei);
// der Unterschied liegt darin, wo das Ergebnis landet: an diesem Briefing,
// nicht in den Seiteneinstellungen.
//
// Bei einem Einsatz wird daraus der Download in der dort gewählten
// Vortragssprache — gepflegt wird der Foliensatz also genau einmal, am
// Briefing, und nicht bei jedem Einsatz neu.

export async function POST(request: Request) {
  const denied = await guardUpload(request, "talk-slides");
  if (denied) return denied;

  const query = new URL(request.url).searchParams;
  const uploadId = query.get("upload") ?? "";
  if (!isUploadId(uploadId)) {
    return NextResponse.json({ error: "Upload-Kennung fehlt oder ist ungültig." }, { status: 400 });
  }
  const fileName = safeTemplateName(query.get("name") ?? "");
  const ext = templateExtension(fileName) ?? "pptx";
  const target = `${uploadId}.${ext}`;

  if (query.get("phase") !== "commit") {
    return receivePart(request, target, uploadId, query.get("index"));
  }

  const locale = query.get("locale") ?? "";
  if (!isLocale(locale)) {
    await discardParts(uploadId);
    return NextResponse.json({ error: "Sprache fehlt oder ist unbekannt." }, { status: 400 });
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
    // Zwischenstücke nicht liegen lassen, wenn es kein Ziel für sie gibt.
    await discardParts(uploadId);
    return NextResponse.json(
      { error: "Briefing nicht gefunden. Erst anlegen, dann Folien hinterlegen." },
      { status: 404 },
    );
  }

  const result = await assembleAndVerify({
    target,
    uploadId,
    parts: Number(query.get("parts")),
    expectedSize: Number(query.get("size")),
    contentType: SLIDE_TEMPLATE_MIME[ext],
  });
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: result.status });
  }

  try {
    await db.talkSlideDeck.upsert({
      where: { talkId_locale: { talkId, locale } },
      create: { talkId, locale, blobPath: result.path, fileName, bytes: result.size },
      update: { blobPath: result.path, fileName, bytes: result.size },
    });
  } catch (error) {
    console.error("[talk-slides] Foliensatz konnte nicht hinterlegt werden:", error);
    await deleteMedia(result.path);
    return NextResponse.json(
      { error: "Foliensatz konnte nicht hinterlegt werden (Datenbank nicht erreichbar). Bitte erneut versuchen." },
      { status: 502 },
    );
  }

  return NextResponse.json({ talkId, locale, path: result.path, fileName, bytes: result.size });
}
