import { NextRequest, NextResponse } from "next/server";
import { locales, defaultLocale } from "./lib/i18n/config";

// Locale-Routing (SPEC §5): `/` und alle Pfade ohne Sprachpräfix werden auf
// `/de` bzw. `/en` umgeleitet. Accept-Language wird nur beim ersten Besuch
// berücksichtigt; danach trägt der Pfad die Sprache, kein Cookie nötig.

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

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return NextResponse.next();

  const locale = pickLocale(request);
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  // Nicht angefasst werden: API-Routen, Admin (nicht lokalisiert), Next-Interna,
  // maschinenlesbare Dateien und alles mit Dateiendung.
  matcher: [
    "/((?!api|admin|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml|feed.xml|feed.en.xml|.*\\.).*)",
  ],
};
