import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import {
  commitParts,
  deleteMedia,
  discardParts,
  mediaSize,
  readMediaRange,
  storePart,
} from "@/lib/media/storage";
import { rateLimit } from "@/lib/rate-limit";
import {
  ARCHIVE_PROBE_BYTES,
  MAX_PART_BYTES,
  MAX_PARTS,
  MAX_SLIDE_TEMPLATE_BYTES,
  SLIDE_TEMPLATE_MIME,
  SLIDE_TEMPLATE_TOO_LARGE,
  isUploadId,
  safeTemplateName,
  slideTemplateKeys,
  slideTemplateUrl,
  templateExtension,
  verifyTemplateArchive,
} from "@/lib/slide-templates";

export const runtime = "nodejs";

// Upload einer Foliensvorlage (PowerPoint) je Sprache. Nur Admin, Same-Origin,
// rate-limitiert.
//
// Der Upload läuft in zwei Schritten:
//
//   ?phase=part   — ein Teilstück von wenigen MB. Jede Anfrage ist für sich
//                   wiederholbar; nichts hängt an einer einzigen langen
//                   Verbindung, die unterwegs abreißen kann.
//   ?phase=commit — die Teile werden zur Datei zusammengesetzt, und **danach**
//                   wird geprüft, was tatsächlich in der Ablage liegt: Größe
//                   gegen die angekündigte Größe, ZIP-Signatur am Anfang,
//                   Schlussmarke am Ende, Präsentationsteil im Verzeichnis.
//                   Erst wenn das stimmt, wird die Vorlage hinterlegt.
//
// Das ist der Kern der Sache: Eine abgebrochene Übertragung sieht am Anfang
// völlig gesund aus. Ohne die Schlussprüfung gilt eine halbe Datei als Erfolg —
// und PowerPoint scheitert später daran, sie zu reparieren.
//
// Am PowerPoint selbst wird nichts verarbeitet: gespeichert, wie es kam.

function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    if (originHost === request.headers.get("host")) return true;
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (site && new URL(site).host === originHost) return true;
    return false;
  } catch {
    return false;
  }
}

/** Zielname in der Ablage. Aus der Upload-Kennung, damit alle Teile ihn teilen. */
function targetName(uploadId: string, fileName: string): string {
  return `${uploadId}.${templateExtension(fileName) ?? "pptx"}`;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Ungültiger Ursprung." }, { status: 403 });
  }
  // Großzügig: eine 42-MB-Vorlage sind rund elf Teile, und ein misslungener
  // Versuch soll den nächsten nicht blockieren.
  const limit = rateLimit(`slide-template:${user.oid ?? "admin"}`, 400, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zu viele Uploads. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const query = new URL(request.url).searchParams;
  const uploadId = query.get("upload") ?? "";
  if (!isUploadId(uploadId)) {
    return NextResponse.json({ error: "Upload-Kennung fehlt oder ist ungültig." }, { status: 400 });
  }
  const fileName = safeTemplateName(query.get("name") ?? "");
  const target = targetName(uploadId, fileName);

  return query.get("phase") === "commit"
    ? commit(query, uploadId, target, fileName)
    : part(request, query, uploadId, target);
}

/** Ein Teilstück entgegennehmen und in der Ablage zwischenlegen. */
async function part(
  request: Request,
  query: URLSearchParams,
  uploadId: string,
  target: string,
): Promise<Response> {
  const index = Number(query.get("index"));
  if (!Number.isInteger(index) || index < 0 || index >= MAX_PARTS) {
    return NextResponse.json({ error: "Teilnummer fehlt oder ist ungültig." }, { status: 400 });
  }

  let data: Buffer;
  try {
    data = Buffer.from(await request.arrayBuffer());
  } catch (error) {
    console.error("[slide-template] Teil konnte nicht gelesen werden:", error);
    return NextResponse.json({ error: "Teil konnte nicht gelesen werden." }, { status: 400 });
  }
  if (data.byteLength === 0) {
    return NextResponse.json({ error: "Leeres Teilstück." }, { status: 400 });
  }
  if (data.byteLength > MAX_PART_BYTES) {
    return NextResponse.json({ error: "Teilstück zu groß." }, { status: 413 });
  }
  // Angekündigte Länge gegen tatsächlich gelesene: schon hier fällt auf, wenn
  // unterwegs etwas verloren geht — und zwar für jedes Teil einzeln.
  const announced = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(announced) && announced > 0 && announced !== data.byteLength) {
    return NextResponse.json(
      { error: "Teilstück kam unvollständig an. Bitte erneut versuchen." },
      { status: 400 },
    );
  }

  try {
    await storePart(target, uploadId, index, data);
    return NextResponse.json({ index, bytes: data.byteLength });
  } catch (error) {
    console.error("[slide-template] Teil konnte nicht abgelegt werden:", error);
    return NextResponse.json(
      { error: "Teil konnte nicht gespeichert werden (Storage nicht erreichbar). Bitte erneut versuchen." },
      { status: 502 },
    );
  }
}

/** Teile zusammensetzen, das Ergebnis prüfen und erst dann hinterlegen. */
async function commit(
  query: URLSearchParams,
  uploadId: string,
  target: string,
  fileName: string,
): Promise<Response> {
  const locale = query.get("locale") ?? "";
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Sprache fehlt oder ist unbekannt." }, { status: 400 });
  }
  const parts = Number(query.get("parts"));
  const expectedSize = Number(query.get("size"));
  if (!Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS) {
    return NextResponse.json({ error: "Anzahl der Teile fehlt oder ist ungültig." }, { status: 400 });
  }
  if (!Number.isInteger(expectedSize) || expectedSize < 1) {
    return NextResponse.json({ error: "Dateigröße fehlt oder ist ungültig." }, { status: 400 });
  }
  if (expectedSize > MAX_SLIDE_TEMPLATE_BYTES) {
    return NextResponse.json({ error: SLIDE_TEMPLATE_TOO_LARGE }, { status: 413 });
  }

  const ext = templateExtension(fileName) ?? "pptx";
  let storedPath: string;
  try {
    const stored = await commitParts(target, uploadId, parts, SLIDE_TEMPLATE_MIME[ext]);
    storedPath = stored.path;
  } catch (error) {
    console.error("[slide-template] Teile konnten nicht zusammengesetzt werden:", error);
    await discardParts(uploadId);
    return NextResponse.json(
      { error: "Die Teile konnten nicht zusammengesetzt werden. Bitte erneut hochladen." },
      { status: 502 },
    );
  }

  // Prüfen, was wirklich in der Ablage liegt — nicht, was wir geschickt haben.
  const size = await mediaSize(storedPath);
  if (size == null) {
    await deleteMedia(storedPath);
    return NextResponse.json(
      { error: "Die abgelegte Datei ist nicht auffindbar. Bitte erneut hochladen." },
      { status: 502 },
    );
  }
  const head = (await readMediaRange(storedPath, 0, ARCHIVE_PROBE_BYTES)) ?? new Uint8Array();
  const tailStart = Math.max(0, size - ARCHIVE_PROBE_BYTES);
  const tail =
    (await readMediaRange(storedPath, tailStart, Math.min(ARCHIVE_PROBE_BYTES, size))) ??
    new Uint8Array();

  const verdict = verifyTemplateArchive({ size, expectedSize, head, tail });
  if (!verdict.ok) {
    await deleteMedia(storedPath);
    return NextResponse.json({ error: verdict.error }, { status: 400 });
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
        create: { key: keys.bytes, value: String(size) },
        update: { value: String(size) },
      }),
      db.siteSetting.upsert({
        where: { key: keys.path },
        create: { key: keys.path, value: storedPath },
        update: { value: storedPath },
      }),
    ]);
  } catch (error) {
    console.error("[slide-template] Vorlage konnte nicht hinterlegt werden:", error);
    await deleteMedia(storedPath);
    return NextResponse.json(
      { error: "Vorlage konnte nicht hinterlegt werden (Datenbank nicht erreichbar). Bitte erneut versuchen." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    locale,
    path: storedPath,
    fileName,
    bytes: size,
    url: slideTemplateUrl({ locale, path: storedPath, fileName, bytes: size }),
  });
}
