import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getSessionUser } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import { validateUpload } from "@/lib/media/detect";
import { processImage } from "@/lib/media/process";
import { storeFile } from "@/lib/media/storage";
import { rateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Prüft, dass ein zustandsändernder Request vom eigenen Ursprung kommt
// (Defense-in-Depth gegen CSRF, zusätzlich zu SameSite=Lax des Session-Cookies).
function sameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // Same-Origin-fetch sendet i. d. R. Origin; Nicht-Browser-Clients ohne Origin durchlassen
  try {
    const originHost = new URL(origin).host;
    const host = request.headers.get("host");
    if (originHost === host) return true;
    // Robust hinter einem Proxy: auch die konfigurierte Site-URL akzeptieren.
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (site && new URL(site).host === originHost) return true;
    return false;
  } catch {
    return false;
  }
}

// Medienbibliothek-API (SPEC M2). Nur Admin. Upload validiert den echten Typ
// (Magic Bytes), entfernt Metadaten, erzeugt WebP-Varianten und verlangt einen
// Alt-Text (außer das Bild ist ausdrücklich dekorativ).

export async function GET() {
  const user = await getSessionUser();
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Kein Zugriff." }, { status: 403 });
  }
  try {
    const assets = await db.mediaAsset.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    return NextResponse.json(
      assets.map((a) => ({
        id: a.id,
        url: assetUrl(a.blobPath),
        altDe: a.altDe,
        altEn: a.altEn,
        width: a.width,
        height: a.height,
        decorative: a.decorative,
      })),
    );
  } catch {
    return NextResponse.json({ error: "Datenbank nicht erreichbar." }, { status: 503 });
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
  // Rate Limiting der Upload-Route (SPEC §13): 30 Uploads / 5 Min. je Nutzer.
  const limit = rateLimit(`upload:${user.oid ?? "admin"}`, 30, 5 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Zu viele Uploads. Bitte kurz warten." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSeconds) } },
    );
  }

  const form = await request.formData();
  const file = form.get("file");
  const altDe = (form.get("altDe") as string | null)?.trim() ?? "";
  const altEn = (form.get("altEn") as string | null)?.trim() || null;
  const credit = (form.get("credit") as string | null)?.trim() || null;
  const decorative = form.get("decorative") === "true";

  if (!(file instanceof Blob)) {
    return NextResponse.json({ error: "Keine Datei übermittelt." }, { status: 400 });
  }
  if (!decorative && altDe.length === 0) {
    return NextResponse.json(
      { error: "Alt-Text (DE) ist Pflicht — oder das Bild als dekorativ markieren." },
      { status: 400 },
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const check = validateUpload(new Uint8Array(buffer));
  if (!check.ok) {
    return NextResponse.json({ error: check.error }, { status: 400 });
  }

  let processed;
  try {
    processed = await processImage(buffer);
  } catch {
    return NextResponse.json({ error: "Bild konnte nicht verarbeitet werden." }, { status: 400 });
  }

  const id = randomUUID();
  try {
    const stored = [];
    for (const v of processed.variants) {
      const storedFile = await storeFile(`${id}-${v.w}.webp`, v.buffer);
      stored.push({ w: v.w, format: v.format, path: storedFile.path });
    }
    const largest = stored[stored.length - 1];
    if (!largest) {
      return NextResponse.json({ error: "Keine Bildvariante erzeugt." }, { status: 400 });
    }

    const asset = await db.mediaAsset.create({
      data: {
        id,
        blobPath: largest.path,
        width: processed.width,
        height: processed.height,
        mime: "image/webp",
        altDe: decorative ? "" : altDe,
        altEn,
        decorative,
        credit,
        variants: JSON.stringify(stored),
      },
    });

    return NextResponse.json({
      id: asset.id,
      url: assetUrl(asset.blobPath),
      altDe: asset.altDe,
      altEn: asset.altEn,
      width: asset.width,
      height: asset.height,
      decorative: asset.decorative,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Upload fehlgeschlagen.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
