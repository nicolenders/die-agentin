import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { storeFile } from "@/lib/media/storage";
import { assetUrl } from "@/lib/media/url";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Upload einer Foliendatei (PDF) für einen Einsatz. Nur Admin, Same-Origin,
// rate-limitiert. Der echte Typ wird über die Magic Bytes geprüft (%PDF-), die
// Datei wird unverändert in der Medienablage gespeichert (kein MediaAsset-Satz,
// damit die Bild-Mediathek sauber bleibt). Der öffentliche Einsatz bietet die
// Datei zum Download an. Verarbeitet/serialisiert wird nichts am PDF selbst.

const MAX_BYTES = 20 * 1024 * 1024; // 20 MB — passt zur Angabe im Formular.

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

/** Sicherer, kurzer Anzeigename aus dem Originaldateinamen (kein Pfad, .pdf). */
function safeName(raw: string): string {
  const base = raw.split(/[\\/]/).pop() ?? "folien.pdf";
  const cleaned = base.replace(/[^\p{L}\p{N}\-_. ]/gu, "").trim() || "folien.pdf";
  return cleaned.toLowerCase().endsWith(".pdf") ? cleaned : `${cleaned}.pdf`;
}

export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }
  if (!sameOrigin(request)) {
    return NextResponse.json({ error: "Ungültiger Ursprung." }, { status: 403 });
  }
  const limit = rateLimit(`slides:${user.oid ?? "admin"}`, 30, 5 * 60 * 1000);
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
    console.error("[slides] formData konnte nicht gelesen werden:", error);
    return NextResponse.json(
      { error: "Die Datei konnte nicht gelesen werden (evtl. zu groß). Bitte kleineres PDF wählen." },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Keine Datei übermittelt." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Die Datei ist größer als 20 MB." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  // Echten Typ prüfen: PDF beginnt mit "%PDF-".
  const header = buffer.subarray(0, 5).toString("latin1");
  if (header !== "%PDF-") {
    return NextResponse.json({ error: "Nur PDF-Dateien sind erlaubt." }, { status: 400 });
  }

  const id = randomUUID();
  const originalName =
    file instanceof File ? safeName(file.name) : safeName("folien.pdf");

  const title = (form.get("title") as string | null)?.trim() || null;

  try {
    const stored = await storeFile(`${id}.pdf`, buffer, "application/pdf");
    // Zusätzlich in der Dokumentenliste vermerken, damit die Medienverwaltung
    // („Präsentationen") die Datei kennt. Scheitert das, ist die Datei trotzdem
    // hochgeladen — der Einsatz soll deswegen nicht ins Leere laufen.
    try {
      await db.mediaDocument.create({
        data: {
          blobPath: stored.path,
          fileName: originalName,
          title,
          mime: "application/pdf",
          bytes: buffer.byteLength,
        },
      });
    } catch (error) {
      console.error("[slides] Dokumenteintrag konnte nicht angelegt werden:", error);
    }
    return NextResponse.json({
      path: stored.path,
      name: originalName,
      url: assetUrl(stored.path),
    });
  } catch (error) {
    console.error("[slides] Ablage im Storage fehlgeschlagen:", error);
    return NextResponse.json(
      { error: "Datei konnte nicht gespeichert werden (Storage nicht erreichbar). Bitte erneut versuchen." },
      { status: 502 },
    );
  }
}
