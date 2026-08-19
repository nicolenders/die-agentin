import { getDictionarySync } from "@/lib/i18n";
import { isLocale, defaultLocale, type Locale } from "@/lib/i18n/config";

// Die Seite hinter einem 410. Sie wird von der Middleware ausgeliefert, kann
// also weder Komponenten noch die gebündelte CSS-Datei nutzen — beides steht
// dort nicht zur Verfügung. Deshalb ein eigenständiges, kleines Dokument.
//
// Warum überhaupt eine Seite und nicht nur ein Statuscode: Für Suchmaschinen
// zählt allein die 410. Hier landet aber auch ein Mensch, der einen Link von
// 2019 anklickt oder ein altes Lesezeichen öffnet. Den mit einer nackten
// Fehlerzeile stehen zu lassen wäre die schlechteste Antwort — er sucht
// Inhalte, und es gibt welche.
//
// Die Farben spiegeln `styles/_tokens.scss`. Sie stehen hier als Literale, weil
// die Middleware kein SCSS auflösen kann; das ist die einzige Stelle im
// Projekt, an der das gilt, und sie ändert sich nicht mit.

const INK = "#05010d";
const TEXT = "#ede9f8";
const MUTED = "#a093c0";
const VIOLET_TEXT = "#c4a2fc";
const VIOLET_SOLID = "#7c3aed";
const LINE = "#2a1a4a";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Sprache aus dem `Accept-Language`-Header, sonst die Standardsprache. */
export function goneLocale(acceptLanguage: string | null | undefined): Locale {
  const preferred = (acceptLanguage ?? "")
    .split(",")
    .map((part) => part.split(";")[0]?.trim().slice(0, 2).toLowerCase())
    .find((code) => isLocale(code));
  return isLocale(preferred) ? preferred : defaultLocale;
}

/**
 * Vollständiges HTML-Dokument für eine endgültig entfernte Adresse.
 * `noindex` steht zusätzlich im Kopf: Der 410 erledigt das zwar, aber ein
 * Crawler, der die Seite trotzdem rendert, soll keinen Zweifel haben.
 */
export function gonePage(locale: Locale): string {
  const t = getDictionarySync(locale).errors;
  const nav = getDictionarySync(locale).nav;
  const dispatches = getDictionarySync(locale).dispatch.namePlural;

  const links = [
    { href: `/${locale}/depeschen`, label: dispatches, primary: true },
    { href: `/${locale}/einsaetze`, label: nav.einsaetze, primary: false },
    { href: `/${locale}`, label: t.backToHq, primary: false },
  ];

  return `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, follow">
<title>410 · ${escapeHtml(t.goneTitle)}</title>
<style>
  :root { color-scheme: dark; }
  body {
    margin: 0; min-height: 100vh; display: flex; align-items: center;
    background: ${INK}; color: ${TEXT};
    font: 16px/1.65 system-ui, -apple-system, "Segoe UI", sans-serif;
  }
  main { max-width: 44rem; margin: 0 auto; padding: 3rem 1.4rem; }
  .code {
    font: 600 11px/1 ui-monospace, SFMono-Regular, Consolas, monospace;
    letter-spacing: .22em; text-transform: uppercase; color: ${VIOLET_TEXT};
  }
  h1 { font-size: clamp(1.6rem, 5vw, 2.4rem); line-height: 1.2; margin: .8rem 0 0; }
  p { color: ${MUTED}; max-width: 46ch; }
  .offer { color: ${TEXT}; margin-bottom: .6rem; }
  ul { list-style: none; margin: 0; padding: 0; display: flex; flex-wrap: wrap; gap: .6rem; }
  a {
    display: inline-block; padding: .6rem 1rem; border-radius: 4px;
    border: 1px solid ${LINE}; color: ${VIOLET_TEXT}; text-decoration: none;
    font-size: .95rem;
  }
  a.primary { background: ${VIOLET_SOLID}; border-color: ${VIOLET_SOLID}; color: #fff; }
  a:focus-visible { outline: 2px solid #e879f9; outline-offset: 3px; }
</style>
</head>
<body>
<main>
  <p class="code">410 · Gone</p>
  <h1>${escapeHtml(t.goneTitle)}</h1>
  <p>${escapeHtml(t.goneHint)}</p>
  <p class="offer">${escapeHtml(t.goneOffer)}</p>
  <ul>
${links
  .map(
    (l) =>
      `    <li><a${l.primary ? ' class="primary"' : ""} href="${l.href}">${escapeHtml(l.label)}</a></li>`,
  )
  .join("\n")}
  </ul>
</main>
</body>
</html>
`;
}
