import { createHmac, timingSafeEqual } from "node:crypto";

// Signierte, zeitlich begrenzte Vorschau-Token (SPEC §6). Ein Token erlaubt es,
// einen unveröffentlichten Beitrag über `/preview/[token]` zu zeigen (z. B. für
// Veranstalter), 7 Tage gültig. Signatur per HMAC mit AUTH_SECRET.

const DEFAULT_TTL_MS = 7 * 24 * 3600 * 1000;

interface PreviewPayload {
  kind: "post" | "dossier" | "mission";
  id: string;
  exp: number; // Ablauf als Unix-ms
}

function secret(): string {
  return process.env.AUTH_SECRET ?? "insecure-dev-secret";
}

function b64url(input: Buffer | string): string {
  return Buffer.from(input).toString("base64url");
}

function sign(data: string): string {
  return createHmac("sha256", secret()).update(data).digest("base64url");
}

/** Erzeugt ein Vorschau-Token. `now` injizierbar für Tests. */
export function createPreviewToken(
  kind: PreviewPayload["kind"],
  id: string,
  now: number = Date.now(),
  ttlMs: number = DEFAULT_TTL_MS,
): string {
  const payload: PreviewPayload = { kind, id, exp: now + ttlMs };
  const body = b64url(JSON.stringify(payload));
  return `${body}.${sign(body)}`;
}

/** Prüft ein Vorschau-Token. Gibt die Payload zurück oder null. */
export function verifyPreviewToken(
  token: string,
  now: number = Date.now(),
): PreviewPayload | null {
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [body, mac] = parts;
  if (!body || !mac) return null;

  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(Buffer.from(body, "base64url").toString()) as PreviewPayload;
    if (typeof payload.exp !== "number" || payload.exp < now) return null;
    if (payload.kind !== "post" && payload.kind !== "dossier" && payload.kind !== "mission") {
      return null;
    }
    return payload;
  } catch {
    return null;
  }
}
