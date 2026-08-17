import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { getSessionUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import { deleteMedia, storeStream } from "@/lib/media/storage";
import { rateLimit } from "@/lib/rate-limit";
import {
  MAX_SLIDE_TEMPLATE_BYTES,
  PresentationScanner,
  SLIDE_TEMPLATE_MIME,
  SLIDE_TEMPLATE_TOO_LARGE,
  safeTemplateName,
  slideTemplateKeys,
  slideTemplateUrl,
  templateExtension,
} from "@/lib/slide-templates";

export const runtime = "nodejs";

// Upload einer Foliensvorlage (PowerPoint) je Sprache. Nur Admin, Same-Origin,
// rate-limitiert.
//
// Die Datei kommt als roher Anfragekörper, nicht als Formulardatei: `formData()`
// liest den gesamten Upload in den Speicher, und eine Corporate-Vorlage wiegt
// 40 MB und mehr — in einer Container-App mit 0,5 GiB ist das der Unterschied
// zwischen „funktioniert" und „Instanz weg". Stattdessen fließt der Strom durch
// eine Prüfung (ZIP-Signatur plus `ppt/presentation.xml`) direkt in die Ablage;
// im Speicher liegen nur die Blöcke, die gerade unterwegs sind. Sprache und
// Dateiname stehen in der Query.
//
// Verarbeitet wird am PowerPoint nichts — gespeichert, wie es kam.

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

/** Fehlerkennung des Größenwächters — vom Speicherfehler zu unterscheiden. */
const TOO_LARGE = "SLIDE_TEMPLATE_TOO_LARGE";

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Ungültiger Ursprung." }, { status: 403 });
  }
  const limit = rateLimit(`slide-template:${user.oid ?? "admin"}`, 20, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zu viele Uploads. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const query = new URL(request.url).searchParams;
  const locale = query.get("locale") ?? "";
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Sprache fehlt oder ist unbekannt." }, { status: 400 });
  }

  // Angekündigte Größe zuerst: dann steht die Absage fest, bevor überhaupt
  // etwas geschrieben wird.
  const announced = Number(request.headers.get("content-length") ?? "");
  if (Number.isFinite(announced) && announced > MAX_SLIDE_TEMPLATE_BYTES) {
    return NextResponse.json({ error: SLIDE_TEMPLATE_TOO_LARGE }, { status: 413 });
  }
  if (!request.body) {
    return NextResponse.json({ error: "Keine Datei übermittelt." }, { status: 400 });
  }

  const fileName = safeTemplateName(query.get("name") ?? "");
  const ext = templateExtension(fileName) ?? "pptx";
  const target = `${randomUUID()}.${ext}`;

  // Der Wächter sieht jeden Block genau einmal: er prüft den Typ mit und bricht
  // ab, sobald die Obergrenze überschritten ist.
  const scanner = new PresentationScanner();
  const guard = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      scanner.push(chunk);
      if (scanner.bytes > MAX_SLIDE_TEMPLATE_BYTES) {
        callback(new Error(TOO_LARGE));
        return;
      }
      callback(null, chunk);
    },
  });

  const source = Readable.fromWeb(request.body as Parameters<typeof Readable.fromWeb>[0]);
  source.on("error", (error) => guard.destroy(error));

  try {
    const stored = await storeStream(target, source.pipe(guard), SLIDE_TEMPLATE_MIME[ext]);

    const verdict = scanner.verdict();
    if (!verdict.ok) {
      await deleteMedia(stored.path);
      return NextResponse.json({ error: verdict.error }, { status: 400 });
    }

    const keys = slideTemplateKeys(locale);
    // Zwei Zeilen, ein Zustand: gemeinsam oder gar nicht — sonst zeigte der Pfad
    // auf eine Vorlage, deren Name noch der alten Datei gehört.
    await db.$transaction([
      db.siteSetting.upsert({
        where: { key: keys.name },
        create: { key: keys.name, value: fileName },
        update: { value: fileName },
      }),
      db.siteSetting.upsert({
        where: { key: keys.path },
        create: { key: keys.path, value: stored.path },
        update: { value: stored.path },
      }),
    ]);
    return NextResponse.json({
      locale,
      path: stored.path,
      fileName,
      url: slideTemplateUrl({ locale, path: stored.path, fileName }),
    });
  } catch (error) {
    // Was schon geschrieben wurde, wird weggeräumt — eine halbe Vorlage in der
    // Ablage wäre schlimmer als gar keine.
    await deleteMedia(target);
    // Am Zähler und nicht an der Fehlermeldung entschieden: welchen Fehler die
    // Ablage daraus macht, ist ihre Sache.
    if (scanner.bytes > MAX_SLIDE_TEMPLATE_BYTES) {
      return NextResponse.json({ error: SLIDE_TEMPLATE_TOO_LARGE }, { status: 413 });
    }
    console.error("[slide-template] Ablage fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Vorlage konnte nicht gespeichert werden (Storage oder Datenbank nicht erreichbar). Bitte erneut versuchen." },
      { status: 502 },
    );
  }
}
