// Cache vorwärmen.
//
// Zwei Dinge treffen hier aufeinander: Die Datenbank pausiert (kostet sonst
// Geld), und ein Leser darf davon nichts merken. Öffentliche Zugriffe laufen
// über den getaggten Cache (lib/cache.ts) — nur ein Treffer daneben erreicht
// die Datenbank, und wenn die gerade schläft, wartet der Leser 30 bis 60
// Sekunden auf das Aufwachen.
//
// Also wird der Cache gefüllt, wenn die Datenbank ohnehin wach ist: nach dem
// Start eines Containers (die Migration hat sie geweckt) und am Ende eines
// vollständigen Job-Laufs. Die Liste der Seiten kommt aus der Sitemap — die
// weiß bereits, was öffentlich ist, und muss hier nicht doppelt gepflegt werden.

/** Mehr Seiten als das wärmt niemand — der Rest lädt beim ersten Aufruf. */
export const WARM_LIMIT = 200;

/** Zieht die Adressen aus einer Sitemap. Reine Textarbeit, ohne Netz. */
export function parseSitemapLocs(xml: string, limit = WARM_LIMIT): string[] {
  const locs: string[] = [];
  const re = /<loc>\s*([^<\s]+)\s*<\/loc>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(xml)) !== null) {
    locs.push(match[1]!);
    if (locs.length >= limit) break;
  }
  return locs;
}

/**
 * Rechnet die Adressen der Sitemap auf die lokal erreichbare Basis um. Die
 * Sitemap nennt die kanonische Domain; gewärmt wird über 127.0.0.1, damit der
 * Aufruf im Container bleibt und keine öffentliche Runde dreht.
 */
export function toLocalUrls(locs: readonly string[], base: string): string[] {
  const root = base.replace(/\/+$/, "");
  const seen = new Set<string>();
  for (const loc of locs) {
    let path: string;
    try {
      path = new URL(loc).pathname;
    } catch {
      path = loc.startsWith("/") ? loc : `/${loc}`;
    }
    seen.add(`${root}${path}`);
  }
  return [...seen];
}

async function get(url: string, timeoutMs: number): Promise<boolean> {
  try {
    const res = await fetch(url, {
      headers: { "x-warmup": "1", "user-agent": "die-agentin-warmup" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    // Body verwerfen, aber lesen — sonst bleibt die Verbindung hängen.
    await res.arrayBuffer();
    return res.ok;
  } catch {
    return false;
  }
}

export interface WarmResult {
  warmed: number;
  failed: number;
}

/**
 * Wärmt Startseiten und alle Seiten der Sitemap. Fehler sind hier kein Drama:
 * eine nicht gewärmte Seite lädt beim ersten Aufruf eben selbst.
 */
export async function warmSite(
  base: string,
  options: { limit?: number; concurrency?: number; timeoutMs?: number } = {},
): Promise<WarmResult> {
  const { limit = WARM_LIMIT, concurrency = 3, timeoutMs = 30_000 } = options;
  const root = base.replace(/\/+$/, "");

  let urls: string[] = [`${root}/de`, `${root}/en`];
  try {
    const res = await fetch(`${root}/sitemap.xml`, {
      headers: { "x-warmup": "1", "user-agent": "die-agentin-warmup" },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (res.ok) {
      const merged = toLocalUrls(parseSitemapLocs(await res.text(), limit), root);
      if (merged.length > 0) urls = merged;
    }
  } catch {
    // Ohne Sitemap bleiben die beiden Startseiten — besser als nichts.
  }

  let warmed = 0;
  let failed = 0;
  const queue = [...urls];
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      if (await get(url, timeoutMs)) warmed += 1;
      else failed += 1;
    }
  });
  await Promise.all(workers);
  return { warmed, failed };
}

/** Basisadresse innerhalb des Containers. */
export function localBase(): string {
  return `http://127.0.0.1:${process.env.PORT ?? 3000}`;
}
