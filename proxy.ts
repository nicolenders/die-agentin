import { NextRequest, NextResponse } from "next/server";
import { canonicalHost } from "./lib/site";
import {
  isNonLocalizedPath,
  hasLocalePrefix,
  pickLocaleFrom,
  legacyDispatchTarget,
  localeFromPath,
  LOCALE_HEADER,
} from "./lib/routing";
import { legacyTarget } from "./lib/seo/legacy-redirects";
import { gonePage, goneLocale } from "./lib/seo/gone-page";

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

/** Sprache, mit der eine sprachlose Alt-URL probeweise aufgelöst wird. */
const DEFAULT_LOCALE_FOR_LEGACY = "de";

/** Nimmt das Hilfs-Präfix wieder weg, mit dem die Alt-URL aufgelöst wurde. */
function stripLocale(
  target: { path: string; search: string } | null,
): { path: string; search: string } | null {
  if (!target) return null;
  return {
    ...target,
    path: target.path.replace(new RegExp(`^/${DEFAULT_LOCALE_FOR_LEGACY}(?=/|$)`), ""),
  };
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

  // Alt-URLs Signale/Dossiers → Depeschen (301). Logik in lib/routing (getestet).
  // Auch ohne Sprachpräfix: sonst käme erst die Sprachweiche auf `/de/signale`
  // und von dort der 301 — der signaltragende Sprung läge hinter einem
  // Zwischenziel, das selbst noch eine Regel braucht. Trug die Quelle kein
  // Präfix, trägt das Ziel auch keines; die Sprachweiche verhandelt danach.
  const legacy =
    legacyDispatchTarget(pathname) ??
    stripLocale(legacyDispatchTarget(`/${DEFAULT_LOCALE_FOR_LEGACY}${pathname}`));
  if (legacy) {
    const url = request.nextUrl.clone();
    url.pathname = legacy.path;
    url.search = legacy.search;
    return withRobots(request, NextResponse.redirect(url, 301));
  }

  // Alt-URLs des WordPress-Blogs (docs/CUTOVER.md §14.2). Muss VOR der
  // Sprachweiche stehen: sonst schiebt die `/blog` erst auf `/de/blog` und die
  // Alt-URL endet nach drei Sprüngen im 404 statt beim Nachfolgeinhalt.
  const wordpress = legacyTarget(pathname);
  if (wordpress) {
    if (wordpress.status === 410 || !wordpress.path) {
      // Endgültig weg: 410 nimmt die URL schneller aus dem Index als ein 404.
      //
      // Mit gerenderter Seite, nicht nur mit dem Statuscode: Für Suchmaschinen
      // zählt allein die 410, hier landet aber auch ein Mensch mit einem alten
      // Lesezeichen oder einem Suchtreffer von 2019. Der sucht Inhalte — und es
      // gibt welche.
      const locale = goneLocale(request.headers.get("accept-language"));
      return withRobots(
        request,
        new NextResponse(gonePage(locale), {
          status: 410,
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            // Der 410 ist die Aussage, der Header wiederholt sie unmissverständlich.
            "X-Robots-Tag": "noindex",
          },
        }),
      );
    }
    const url = request.nextUrl.clone();
    url.pathname = wordpress.path;
    return withRobots(request, NextResponse.redirect(url, 301));
  }

  // Admin, API, Vorschau, Medien, Next-Interna und Dateien werden nicht
  // lokalisiert — nur durchreichen (mit noindex-Header auf Nicht-Zielhosts).
  if (isNonLocalizedPath(pathname) || hasLocalePrefix(pathname)) {
    // Sprache als Request-Header mitgeben (Audit 6.6): `not-found.tsx` erreicht
    // im App Router keine `params` und wäre sonst immer deutsch.
    const pathLocale = localeFromPath(pathname);
    if (!pathLocale) return withRobots(request, NextResponse.next());
    const headers = new Headers(request.headers);
    headers.set(LOCALE_HEADER, pathLocale);
    return withRobots(request, NextResponse.next({ request: { headers } }));
  }

  const locale = pickLocaleFrom(request.headers.get("accept-language"));
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return withRobots(request, NextResponse.redirect(url));
}

export const config = {
  // Breit gefasst, damit der noindex-Header auch robots.txt, sitemap.xml und die
  // Feeds erreicht. Ausgenommen bleiben nur Next-Interna und statische Assets.
  matcher: ["/((?!_next/static|_next/image).*)"],
};
