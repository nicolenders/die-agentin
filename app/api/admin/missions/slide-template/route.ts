import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { isLocale } from "@/lib/i18n/config";
import { storeFile } from "@/lib/media/storage";
import { rateLimit } from "@/lib/rate-limit";
import {
  MAX_SLIDE_TEMPLATE_BYTES,
  SLIDE_TEMPLATE_MIME,
  isLegacyPowerPoint,
  isOfficePresentation,
  safeTemplateName,
  slideTemplateKeys,
  slideTemplateUrl,
  templateExtension,
} from "@/lib/slide-templates";

export const runtime = "nodejs";

// Upload einer Foliensvorlage (PowerPoint) je Sprache. Nur Admin, Same-Origin,
// rate-limitiert. Der echte Typ wird über den Inhalt geprüft (ZIP-Signatur plus
// `ppt/presentation.xml`), die Datei unverändert in der Medienablage gespeichert
// und ihr Pfad als Seiteneinstellung hinterlegt — eine Vorlage je Sprache, die
// für alle Einsätze gilt. Am PowerPoint selbst wird nichts verarbeitet.

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

  let form: FormData;
  try {
    form = await request.formData();
  } catch (error) {
    console.error("[slide-template] formData konnte nicht gelesen werden:", error);
    return NextResponse.json(
      { error: "Die Datei konnte nicht gelesen werden (evtl. zu groß). Bitte kleinere Vorlage wählen." },
      { status: 400 },
    );
  }

  const locale = String(form.get("locale") ?? "");
  if (!isLocale(locale)) {
    return NextResponse.json({ error: "Sprache fehlt oder ist unbekannt." }, { status: 400 });
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Keine Datei übermittelt." }, { status: 400 });
  }
  if (file.size > MAX_SLIDE_TEMPLATE_BYTES) {
    return NextResponse.json({ error: "Die Datei ist größer als 20 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (isLegacyPowerPoint(buffer)) {
    return NextResponse.json(
      { error: "Das ist das alte PowerPoint-Format (.ppt). Bitte als .pptx oder .potx speichern." },
      { status: 400 },
    );
  }
  if (!isOfficePresentation(buffer)) {
    return NextResponse.json(
      { error: "Nur PowerPoint-Dateien (.pptx oder .potx) sind erlaubt." },
      { status: 400 },
    );
  }

  const originalName = safeTemplateName(file instanceof File ? file.name : "");
  const ext = templateExtension(originalName) ?? "pptx";

  try {
    const stored = await storeFile(`${randomUUID()}.${ext}`, buffer, SLIDE_TEMPLATE_MIME[ext]);
    const keys = slideTemplateKeys(locale);
    // Zwei Zeilen, ein Zustand: erst der Name, dann der Pfad. So zeigt der Pfad
    // nie auf eine Vorlage, deren Name noch der alten Datei gehört.
    await db.siteSetting.upsert({
      where: { key: keys.name },
      create: { key: keys.name, value: originalName },
      update: { value: originalName },
    });
    await db.siteSetting.upsert({
      where: { key: keys.path },
      create: { key: keys.path, value: stored.path },
      update: { value: stored.path },
    });
    return NextResponse.json({
      locale,
      path: stored.path,
      fileName: originalName,
      url: slideTemplateUrl({ locale, path: stored.path, fileName: originalName }),
    });
  } catch (error) {
    console.error("[slide-template] Ablage fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Vorlage konnte nicht gespeichert werden (Storage oder Datenbank nicht erreichbar). Bitte erneut versuchen." },
      { status: 502 },
    );
  }
}
