import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { normalizePath } from "@/lib/analytics/path";
import {
  bufferPageview,
  takeBufferedPageviews,
  returnBufferedPageviews,
  type BufferedPageview,
} from "@/lib/analytics/buffer";

export { normalizePath } from "@/lib/analytics/path";

// geoip-lite lädt beim ersten Zugriff ~150 MB Daten. Erst zur Laufzeit und nur
// einmal je Prozess laden (nicht beim Modul-Import, damit der Build nicht darüber
// stolpert). Fehlt das Paket/die Daten, fällt die Länder-Zuordnung auf „XX".
let geoipLookup: ((ip: string) => { country?: string } | null) | null = null;
async function lookupCountry(ip: string | null): Promise<string> {
  if (!ip) return "XX";
  try {
    if (!geoipLookup) {
      const mod = (await import("geoip-lite")) as unknown as {
        default?: { lookup: (ip: string) => { country?: string } | null };
        lookup?: (ip: string) => { country?: string } | null;
      };
      const fn = mod.default?.lookup ?? mod.lookup;
      if (!fn) return "XX";
      geoipLookup = fn;
    }
    return geoipLookup(ip)?.country ?? "XX";
  } catch {
    return "XX";
  }
}

// Datensparsame, first-party Reichweiten-Erfassung (kein Drittanbieter, keine
// Cookies, keine gespeicherte IP). Aus IP + tagesbezogenem Salt entsteht ein
// nicht umkehrbarer Besucher-Hash für eine ungefähre Unique-Zählung; die IP
// selbst wird nur transient zur groben Länder-Zuordnung genutzt und verworfen.

const BOT_RE =
  /bot|crawl|spider|slurp|bingpreview|facebookexternalhit|embedly|quora|pinterest|slackbot|vkshare|whatsapp|flipboard|tumblr|redditbot|headless|lighthouse|monitoring|uptime|curl|wget|python-requests/i;

function clientIp(h: Headers): string | null {
  const xff = h.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return h.get("x-real-ip") ?? h.get("x-client-ip") ?? null;
}

function salt(): string {
  return process.env.ANALYTICS_SALT ?? "die-agentin-reach-v1";
}

export async function recordPageview(opts: { rawPath: string; headers: Headers }): Promise<void> {
  const ua = opts.headers.get("user-agent") ?? "";
  if (!ua || BOT_RE.test(ua)) return;
  // Do Not Track / Global Privacy Control respektieren.
  if (opts.headers.get("dnt") === "1" || opts.headers.get("sec-gpc") === "1") return;

  const norm = normalizePath(opts.rawPath);
  if (!norm) return;

  const ip = clientIp(opts.headers);
  const country = await lookupCountry(ip);
  const now = new Date();
  const dayStr = now.toISOString().slice(0, 10); // UTC-Tag
  const day = new Date(`${dayStr}T00:00:00.000Z`);
  const visitorHash = createHash("sha256")
    .update(`${salt()}|${ip ?? "unknown"}|${dayStr}`)
    .digest("hex");

  // Nicht sofort schreiben, sondern sammeln: Der Schreibzugriff würde die
  // pausierte, serverlose Datenbank wecken und für die Dauer des
  // Auto-Pause-Delays wachhalten — ein einzelner Besucher hätte damit eine
  // Viertelstunde Rechenzeit ausgelöst. Der Job schreibt gebündelt weg
  // (lib/jobs/tick-plan.ts, docs/decisions/0032-kosten-der-laufzeit.md).
  bufferPageview({
    day,
    path: norm.path,
    locale: norm.locale,
    section: norm.section,
    country: country.slice(0, 2).toUpperCase() || "XX",
    visitorHash,
  });
}

/**
 * Schreibt die gesammelten Aufrufe in einem Rutsch weg. Aufrufer ist der
 * Job-Tick, und zwar nur dann, wenn die Datenbank ohnehin geweckt wird.
 *
 * Schlägt das Schreiben fehl, kommen die Einträge zurück in den Zwischen-
 * speicher — der nächste Lauf versucht es erneut, statt die Zahlen zu verlieren.
 */
export async function flushPageviews(): Promise<number> {
  const entries = takeBufferedPageviews();
  if (entries.length === 0) return 0;
  try {
    await db.pageview.createMany({ data: entries });
    return entries.length;
  } catch (error) {
    // `createMany` ist beim SQL-Server-Connector nicht in jeder Konstellation
    // verfügbar. Dann eben einzeln — es geht um eine Handvoll Zeilen je Lauf.
    console.warn(
      "[analytics] Sammelschreiben fehlgeschlagen, schreibe einzeln:",
      error instanceof Error ? error.message : error,
    );
    return writeOneByOne(entries);
  }
}

/**
 * Einzeln schreiben. Was nach einem Fehler übrig ist, geht zurück in den
 * Zwischenspeicher — der nächste Lauf nimmt es erneut, statt es zu verlieren.
 */
async function writeOneByOne(entries: BufferedPageview[]): Promise<number> {
  let written = 0;
  for (let i = 0; i < entries.length; i += 1) {
    try {
      await db.pageview.create({ data: entries[i]! });
      written += 1;
    } catch {
      returnBufferedPageviews(entries.slice(i));
      return written;
    }
  }
  return written;
}
