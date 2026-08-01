// Einfaches Fixed-Window-Rate-Limiting (SPEC §9, §13). In-Memory, also
// PRO INSTANZ — bei mehreren Replicas kein globales Limit. Für die Admin-/
// Upload-Routen (genau ein vertrauenswürdiger Nutzer) ist das eine
// Verteidigung gegen entlaufene Clients / kompromittierte Sessions, keine
// Abwehr verteilter Angriffe. Ein globales Limit bräuchte einen geteilten
// Speicher (z. B. Redis) — bewusst nicht eingeführt.

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * Prüft und verbucht einen Zugriff für `key`. Erlaubt `limit` Zugriffe je
 * `windowMs`. `now` ist injizierbar für Tests.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): RateLimitResult {
  const existing = buckets.get(key);
  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }
  if (existing.count >= limit) {
    return {
      ok: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }
  existing.count += 1;
  return { ok: true, remaining: limit - existing.count, retryAfterSeconds: 0 };
}

/** Nur für Tests: setzt den Zustand zurück. */
export function __resetRateLimits(): void {
  buckets.clear();
}
