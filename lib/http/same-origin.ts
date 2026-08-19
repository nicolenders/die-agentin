// Herkunftsprüfung für zustandsändernde Requests (Defense-in-Depth gegen CSRF,
// zusätzlich zu SameSite=Lax des Session-Cookies).
//
// Stand vorher dreimal wortgleich in den Route Handlern (Medien, Folien,
// Teil-Uploads). Drei Kopien einer Sicherheitsprüfung sind drei Stellen, an
// denen eine Verschärfung vergessen werden kann — deshalb hier, einmal.

/**
 * Kommt der Request vom eigenen Ursprung?
 *
 * Ein fehlender `Origin`-Header gilt als in Ordnung: Browser senden ihn bei
 * zustandsändernden fetch-Aufrufen, Nicht-Browser-Clients (Jobs, curl) gar
 * nicht. Die eigentliche Autorisierung leistet die Rollenprüfung davor, nicht
 * diese Funktion.
 */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    const originHost = new URL(origin).host;
    if (originHost === request.headers.get("host")) return true;
    // Hinter einem Proxy trägt `Host` ggf. den internen Namen — deshalb auch
    // den konfigurierten öffentlichen Host akzeptieren.
    const forwarded = request.headers.get("x-forwarded-host");
    if (forwarded && originHost === forwarded) return true;
    const site = process.env.NEXT_PUBLIC_SITE_URL;
    if (site && new URL(site).host === originHost) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Strengere Variante für öffentliche Endpunkte ohne Anmeldung: hier ist ein
 * fehlender `Origin` KEIN Freibrief, weil es keine zweite Hürde dahinter gibt.
 */
export function isSameOriginStrict(request: Request): boolean {
  if (!request.headers.get("origin")) return false;
  return isSameOrigin(request);
}
