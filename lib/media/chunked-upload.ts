import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth/guard";
import { rateLimit } from "@/lib/rate-limit";
import { isSameOrigin } from "@/lib/http/same-origin";
import {
  ARCHIVE_PROBE_BYTES,
  MAX_PART_BYTES,
  MAX_PARTS,
  MAX_SLIDE_TEMPLATE_BYTES,
  SLIDE_TEMPLATE_TOO_LARGE,
  verifyTemplateArchive,
} from "@/lib/slide-templates";
import { commitParts, deleteMedia, discardParts, mediaSize, readMediaRange, storePart } from "./storage";

// Der mehrteilige Upload großer PowerPoint-Dateien — einmal gebaut, von zwei
// Stellen genutzt: den Vorlagen in der Medienverwaltung und den Foliensätzen an
// einem Briefing. Beide brauchen dasselbe: kurze, einzeln wiederholbare
// Anfragen statt einer langen Verbindung, und am Ende die Prüfung dessen, was
// tatsächlich in der Ablage liegt (siehe docs/decisions/0013-foliensvorlagen.md).

/** Prüft Anmeldung, Ursprung und Häufigkeit. Gibt eine Antwort zurück, wenn abgelehnt. */
export async function guardUpload(request: Request, bucket: string): Promise<Response | null> {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Ungültiger Ursprung." }, { status: 403 });
  }
  // Großzügig: eine 42-MB-Datei sind rund elf Teile, und ein misslungener
  // Versuch soll den nächsten nicht blockieren.
  const limit = rateLimit(`${bucket}:${user.oid ?? "admin"}`, 400, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zu viele Uploads. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }
  return null;
}

/** Ein Teilstück entgegennehmen und in der Ablage zwischenlegen. */
export async function receivePart(
  request: Request,
  target: string,
  uploadId: string,
  rawIndex: string | null,
): Promise<Response> {
  const index = Number(rawIndex);
  if (!Number.isInteger(index) || index < 0 || index >= MAX_PARTS) {
    return NextResponse.json({ error: "Teilnummer fehlt oder ist ungültig." }, { status: 400 });
  }

  let data: Buffer;
  try {
    data = Buffer.from(await request.arrayBuffer());
  } catch (error) {
    console.error("[upload] Teil konnte nicht gelesen werden:", error);
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
    console.error("[upload] Teil konnte nicht abgelegt werden:", error);
    return NextResponse.json(
      { error: "Teil konnte nicht gespeichert werden (Storage nicht erreichbar). Bitte erneut versuchen." },
      { status: 502 },
    );
  }
}

export type AssembleResult =
  | { ok: true; path: string; size: number }
  | { ok: false; status: number; error: string };

/**
 * Setzt die Teile zusammen und prüft **die abgelegte Datei**: Größe gegen die
 * angekündigte Größe, ZIP-Signatur am Anfang, Schlussmarke am Ende,
 * Präsentationsteil im Verzeichnis. Bei jedem Zweifel wird gelöscht statt
 * hinterlegt — eine halbe Datei ist schlimmer als gar keine.
 */
export async function assembleAndVerify(options: {
  target: string;
  uploadId: string;
  parts: number;
  expectedSize: number;
  contentType: string;
}): Promise<AssembleResult> {
  const { target, uploadId, parts, expectedSize, contentType } = options;
  if (!Number.isInteger(parts) || parts < 1 || parts > MAX_PARTS) {
    return { ok: false, status: 400, error: "Anzahl der Teile fehlt oder ist ungültig." };
  }
  if (!Number.isInteger(expectedSize) || expectedSize < 1) {
    return { ok: false, status: 400, error: "Dateigröße fehlt oder ist ungültig." };
  }
  if (expectedSize > MAX_SLIDE_TEMPLATE_BYTES) {
    return { ok: false, status: 413, error: SLIDE_TEMPLATE_TOO_LARGE };
  }

  let storedPath: string;
  try {
    const stored = await commitParts(target, uploadId, parts, contentType);
    storedPath = stored.path;
  } catch (error) {
    console.error("[upload] Teile konnten nicht zusammengesetzt werden:", error);
    await discardParts(uploadId);
    return {
      ok: false,
      status: 502,
      error: "Die Teile konnten nicht zusammengesetzt werden. Bitte erneut hochladen.",
    };
  }

  const size = await mediaSize(storedPath);
  if (size == null) {
    await deleteMedia(storedPath);
    return {
      ok: false,
      status: 502,
      error: "Die abgelegte Datei ist nicht auffindbar. Bitte erneut hochladen.",
    };
  }
  const head = (await readMediaRange(storedPath, 0, ARCHIVE_PROBE_BYTES)) ?? new Uint8Array();
  const tailStart = Math.max(0, size - ARCHIVE_PROBE_BYTES);
  const tail =
    (await readMediaRange(storedPath, tailStart, Math.min(ARCHIVE_PROBE_BYTES, size))) ??
    new Uint8Array();

  const verdict = verifyTemplateArchive({ size, expectedSize, head, tail });
  if (!verdict.ok) {
    await deleteMedia(storedPath);
    return { ok: false, status: 400, error: verdict.error ?? "Datei abgelehnt." };
  }
  return { ok: true, path: storedPath, size };
}
