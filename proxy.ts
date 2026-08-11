import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "./lib/i18n/config";
import { canonicalHost } from "./lib/site";

// Locale-Routing (SPEC §5) UND Host-basiertes noindex (Phase 1.2a).
//
// Locale: `/` und alle Pfade ohne Sprachpräfix werden auf `/de` bzw. `/en`
// umgeleitet. Accept-Language wird nur beim ersten Besuch berücksichtigt;
// danach trägt der Pfad die Sprache, kein Cookie nötig.
//
// noindex: Ist der angefragte Host nicht der in `PUBLIC_SITE_HOST` konfigurierte
// kanonische Host (etwa die Staging-URL *.azurecontainerapps.io), wird jede
// Antwort mit `X-Robots-Tag: noindex, nofollow` versehen — auch robots.txt,
// sitemap.xml und die Feeds. Das verhindert eine zweite indexierte Domain mit
// Duplicate Content, die beim Cutover gegen nicolenders.com konkurrieren würde.

function pickLocale(request: NextRequest): string {
  const header = request.headers.get("accept-language");
  if (header) {
    const preferred = header
      .split(",")
      .map((part) => part.split(";")[0]?.trim().slice(0, 2).toLowerCase())
      .find((code) => code && (locales as readonly string[]).includes(code));
    if (preferred) return preferred;
  }
  return defaultLocale;
}

/** Host der Anfrage (bevorzugt X-Forwarded-Host hinter dem Container-Apps-Proxy). */
function requestHost(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host") ??
    request.nextUrl.host
  ).toLowerCase();
}

/** true, wenn die Antwort auf diesem Host nicht indexiert werden darf. */
function shouldNoindex(request: NextRequest): boolean {
  const canonical = canonicalHost().toLowerCase();
  if (!canonical) return false; // kein kanonischer Host konfiguriert → nicht sperren
  const host = requestHost(request);
  // Port im Vergleich ignorieren (Staging hängt keinen Port an; lokal egal).
  return host.split(":")[0] !== canonical.split(":")[0];
}

function withRobots(request: NextRequest, response: NextResponse): NextResponse {
  if (shouldNoindex(request)) {
    response.headers.set("X-Robots-Tag", "noindex, nofollow");
  }
  return response;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Pfade, die nicht lokalisiert werden (API, Admin, maschinenlesbare Dateien,
  // Assets): kein Locale-Redirect, aber der noindex-Header muss trotzdem greifen.
  const isLocalizable =
    !/^\/(api|admin|_next)\//.test(pathname) &&
    !/^\/(robots\.txt|sitemap\.xml|feed\.xml|feed\.en\.xml|favicon\.ico|icon\.svg)$/.test(pathname) &&
    !/\.[a-zA-Z0-9]+$/.test(pathname);

  if (!isLocalizable) {
    return withRobots(request, NextResponse.next());
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return withRobots(request, NextResponse.next());

  const locale = pickLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return withRobots(request, NextResponse.redirect(url));
}

export const config = {
  // Breit gefasst, damit der noindex-Header auch robots.txt, sitemap.xml und die
  // Feeds erreicht. Ausgenommen bleiben nur Next-Interna und statische Assets.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
