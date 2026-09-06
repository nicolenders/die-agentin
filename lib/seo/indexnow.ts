// IndexNow — neue und geänderte Seiten aktiv melden, statt auf den nächsten
// Crawl zu warten.
//
// Warum das hier steht: Bing speist nicht nur die eigene Ergebnisliste, sondern
// auch Copilot, ChatGPT-Suche und Perplexity. Für eine Website, deren Thema
// Microsoft AI ist, ist das der Kanal, in dem sie vorkommen muss. Die Sitemap
// ist der vollständige Katalog; IndexNow ist die Änderungsmeldung dazu.
//
// Ein Aufruf an einen Endpunkt genügt — die teilnehmenden Suchmaschinen teilen
// die Meldungen untereinander.
//
// Betrieb: Ohne `INDEXNOW_KEY` passiert nichts. Das ist der Normalzustand
// lokal und auf Staging; nur die Produktionsumgebung bekommt den Schlüssel.
// Der Schlüssel ist kein Geheimnis (er liegt öffentlich unter der
// Schlüssel-URL) — er belegt nur, dass wer meldet, auch Zugriff auf die Domain
// hat.

import { canonicalHost, siteOrigin } from "@/lib/site";

const ENDPOINT = "https://api.indexnow.org/indexnow";

/** Pfad, unter dem der Schlüssel öffentlich abrufbar ist. */
export const INDEXNOW_KEY_PATH = "/indexnow-key.txt";

/** Höchstzahl URLs je Meldung. Das Protokoll erlaubt 10.000; so viele hat diese Website nie. */
const MAX_URLS = 100;

/** Wie lange auf den Endpunkt gewartet wird, bevor abgebrochen wird. */
const TIMEOUT_MS = 4000;

/**
 * Der konfigurierte Schlüssel, oder leer.
 *
 * Erlaubt sind laut Protokoll 8 bis 128 Zeichen aus `a-z A-Z 0-9 -`. Ein
 * Schlüssel außerhalb dieses Rahmens wird verworfen statt gemeldet: eine
 * abgelehnte Meldung wäre stiller Leerlauf.
 */
export function indexNowKey(): string {
  const key = process.env.INDEXNOW_KEY?.trim() ?? "";
  return /^[A-Za-z0-9-]{8,128}$/.test(key) ? key : "";
}

export interface IndexNowPayload {
  host: string;
  key: string;
  keyLocation: string;
  urlList: string[];
}

/**
 * Baut die Meldung, oder gibt `null` zurück, wenn nichts zu melden ist.
 *
 * IndexNow nimmt ausschließlich URLs an, die auf dem gemeldeten Host liegen.
 * Enthält die Liste fremde URLs, wird die ganze Meldung abgelehnt — deshalb
 * werden sie hier aussortiert und nicht mitgeschickt.
 *
 * Angenommen wird nur zweierlei: eine absolute URL auf dem kanonischen Host oder
 * ein Pfad mit führendem Schrägstrich. Alles andere fliegt raus. `new URL(x,
 * basis)` allein reicht dafür nicht — es macht aus jeder Zeichenkette einen
 * gültigen relativen Pfad, aus `"ht!tp://"` also eine Unterseite dieser Website.
 * Gemeldete URLs, die es nicht gibt, kosten Vertrauen beim Empfänger.
 */
export function buildPayload(urls: string[]): IndexNowPayload | null {
  const key = indexNowKey();
  const host = canonicalHost();
  if (!key || !host) return null;

  const seen = new Set<string>();
  for (const raw of urls) {
    if (seen.size >= MAX_URLS) break;
    const candidate = raw.trim();
    const isPath = candidate.startsWith("/");
    const isAbsolute = /^https:\/\//i.test(candidate);
    if (!isPath && !isAbsolute) continue;
    try {
      const url = new URL(candidate, siteOrigin());
      if (url.host !== host || url.protocol !== "https:") continue;
      seen.add(url.toString());
    } catch {
      // Unbrauchbare Eingabe überspringen, statt die Meldung zu kippen.
    }
  }
  if (seen.size === 0) return null;

  return { host, key, keyLocation: `${siteOrigin()}${INDEXNOW_KEY_PATH}`, urlList: [...seen] };
}

export interface IndexNowResult {
  /** Anzahl gemeldeter URLs. 0 heißt: nicht gemeldet. */
  submitted: number;
  /** Grund, wenn nichts gemeldet wurde oder die Meldung fehlschlug. */
  reason?: string;
}

/**
 * Meldet URLs an IndexNow. Wirft nie.
 *
 * Der Aufruf sitzt in der Veröffentlichung. Eine Suchmaschine, die gerade nicht
 * antwortet, darf keine Depesche daran hindern, online zu gehen — der
 * Fehlschlag wird zurückgegeben, nicht geworfen. Die Sitemap bleibt der
 * verlässliche Weg; IndexNow ist die Abkürzung.
 */
export async function submitToIndexNow(urls: string[]): Promise<IndexNowResult> {
  const payload = buildPayload(urls);
  if (!payload) return { submitted: 0, reason: "IndexNow nicht konfiguriert oder keine meldbare URL." };

  try {
    const response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!response.ok) {
      return { submitted: 0, reason: `IndexNow antwortete mit ${response.status}.` };
    }
    return { submitted: payload.urlList.length };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unbekannt";
    return { submitted: 0, reason: `IndexNow nicht erreichbar: ${message}` };
  }
}

/**
 * Die URLs, die sich mit einer Depesche ändern: die Depesche selbst in beiden
 * Sprachen, die Übersichtsseiten und das HQ (dort stehen die drei jüngsten).
 */
export function dispatchUrls(slugs: { de?: string | null; en?: string | null }): string[] {
  const origin = siteOrigin();
  const urls: string[] = [`${origin}/de`, `${origin}/en`, `${origin}/de/depeschen`, `${origin}/en/depeschen`];
  if (slugs.de) urls.unshift(`${origin}/de/depeschen/${slugs.de}`);
  if (slugs.en) urls.unshift(`${origin}/en/depeschen/${slugs.en}`);
  return urls;
}
