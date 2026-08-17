import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import { deleteMedia, discardParts } from "@/lib/media/storage";
import { assembleAndVerify, guardUpload, receivePart } from "@/lib/media/chunked-upload";
import {
  SLIDE_TEMPLATE_MIME,
  isUploadId,
  safeTemplateName,
  slideTemplateKeys,
  slideTemplateUrl,
  templateExtension,
} from "@/lib/slide-templates";

export const runtime = "nodejs";

// Upload einer Foliensvorlage (PowerPoint) je Sprache — der leere Rahmen im
// Corporate Design, gepflegt unter Medien → Vorlagen.
//
// Zwei Schritte, wie in `lib/media/chunked-upload.ts` beschrieben:
//   ?phase=part   — ein Teilstück von wenigen MB, einzeln wiederholbar
//   ?phase=commit — zusammensetzen, die abgelegte Datei prüfen, dann hinterlegen
//
// Am PowerPoint selbst wird nichts verarbeitet: gespeichert, wie es kam.

export async function POST(request: Request) {
  const denied = await guardUpload(request, "slide-template");
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

  const keys = slideTemplateKeys(locale);
  try {
    // Drei Zeilen, ein Zustand: gemeinsam oder gar nicht — sonst zeigte der Pfad
    // auf eine Vorlage, deren Name noch der alten Datei gehört.
    await db.$transaction([
      db.siteSetting.upsert({
        where: { key: keys.name },
        create: { key: keys.name, value: fileName },
        update: { value: fileName },
      }),
      db.siteSetting.upsert({
        where: { key: keys.bytes },
        create: { key: keys.bytes, value: String(result.size) },
        update: { value: String(result.size) },
      }),
      db.siteSetting.upsert({
        where: { key: keys.path },
        create: { key: keys.path, value: result.path },
        update: { value: result.path },
      }),
    ]);
  } catch (error) {
    console.error("[slide-template] Vorlage konnte nicht hinterlegt werden:", error);
    await deleteMedia(result.path);
    return NextResponse.json(
      { error: "Vorlage konnte nicht hinterlegt werden (Datenbank nicht erreichbar). Bitte erneut versuchen." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    locale,
    path: result.path,
    fileName,
    bytes: result.size,
    url: slideTemplateUrl({ locale, path: result.path, fileName, bytes: result.size }),
  });
}
