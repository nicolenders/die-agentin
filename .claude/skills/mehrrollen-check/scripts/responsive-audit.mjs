#!/usr/bin/env node
// Misst die Darstellung in mehreren Bildschirmbreiten gegen einen laufenden
// Server. Findet, was beim Durchklicken übersehen wird: Seiten, die sich seitlich
// schieben lassen, Elemente über dem Rand, abgeschnittener Text, zu kleine
// Tippziele.
//
// Aufruf aus dem Projektwurzelverzeichnis (braucht @playwright/test aus den
// Projektabhängigkeiten):
//
//   node .claude/skills/mehrrollen-check/scripts/responsive-audit.mjs \
//     --base http://localhost:3000 \
//     --routes /de,/de/liste,/en \
//     --widths 380,768,1440
//
// Gibt nur Befunde aus. Keine Ausgabe außer "keine Befunde" heißt: sauber.

import { chromium } from "@playwright/test";

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const BASE = arg("base", "http://localhost:3000").replace(/\/$/, "");
const ROUTES = arg("routes", "/").split(",").map((r) => r.trim()).filter(Boolean);
const WIDTHS = arg("widths", "380,768,1440").split(",").map((w) => Number(w.trim()));
const LOCALE = arg("locale", "de-DE");
// WCAG 2.2 AA (SC 2.5.8) verlangt mindestens 24x24 CSS-Pixel für Tippziele.
const MIN_TARGET = Number(arg("min-target", "24"));

/**
 * Läuft im Browser. Sammelt alles in einem Durchgang, damit die Seite nicht
 * mehrfach abgefragt werden muss. Nimmt ein einzelnes Objekt entgegen —
 * `page.evaluate` reicht nur ein Argument durch.
 */
function collect({ viewport, minTarget }) {
  const out = { overflow: null, offenders: [], clipped: [], tinyTargets: [] };

  const describe = (el) => {
    const cls = typeof el.className === "string" ? el.className.trim() : "";
    const first = cls ? cls.split(/\s+/).slice(0, 2).join(".") : "";
    return `${el.tagName.toLowerCase()}${el.id ? `#${el.id}` : ""}${first ? `.${first}` : ""}`;
  };

  const root = document.documentElement;
  if (root.scrollWidth > viewport + 1) {
    out.overflow = { scrollWidth: root.scrollWidth, viewport };
  }

  for (const el of Array.from(document.querySelectorAll("body *"))) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    // Fest positionierte Elemente dürfen bewusst am Rand kleben.
    if (style.position === "fixed") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;

    if (rect.right > viewport + 1) {
      // Steckt es in etwas, das selbst scrollen darf? Breite Tabellen und
      // Codeblöcke in einem scrollbaren Rahmen sind in Ordnung.
      let scrollable = false;
      for (let p = el.parentElement; p; p = p.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(p).overflowX)) {
          scrollable = true;
          break;
        }
      }
      if (!scrollable && out.offenders.length < 8) {
        out.offenders.push({ el: describe(el), right: Math.round(rect.right) });
      }
    }

    if (
      el.scrollWidth > el.clientWidth + 2 &&
      el.clientWidth > 0 &&
      style.overflowX === "hidden" &&
      out.clipped.length < 8
    ) {
      out.clipped.push({
        el: describe(el),
        needs: el.scrollWidth,
        has: el.clientWidth,
      });
    }
  }

  const interactive = "a, button, input:not([type=hidden]), select, textarea, [role=button]";
  for (const el of Array.from(document.querySelectorAll(interactive))) {
    const style = getComputedStyle(el);
    if (style.display === "none" || style.visibility === "hidden") continue;
    const rect = el.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) continue;
    if ((rect.width < minTarget || rect.height < minTarget) && out.tinyTargets.length < 10) {
      out.tinyTargets.push({
        el: describe(el),
        text: (el.textContent || "").trim().slice(0, 30),
        w: Math.round(rect.width),
        h: Math.round(rect.height),
      });
    }
  }

  return out;
}

const browser = await chromium.launch();
let found = 0;

for (const width of WIDTHS) {
  const context = await browser.newContext({
    viewport: { width, height: 800 },
    locale: LOCALE,
    isMobile: width < 900,
    hasTouch: width < 900,
  });
  const page = await context.newPage();

  for (const route of ROUTES) {
    let result;
    try {
      await page.goto(`${BASE}${route}`, { waitUntil: "networkidle", timeout: 30_000 });
      result = await page.evaluate(collect, { viewport: width, minTarget: MIN_TARGET });
    } catch (error) {
      console.log(`\n### ${width}px  ${route}`);
      console.log(`  NICHT ERREICHBAR: ${error.message.split("\n")[0]}`);
      found++;
      continue;
    }

    const hits =
      (result.overflow ? 1 : 0) +
      result.offenders.length +
      result.clipped.length +
      result.tinyTargets.length;
    if (!hits) continue;
    found += hits;

    console.log(`\n### ${width}px  ${route}`);
    if (result.overflow) {
      console.log(
        `  QUERSCROLL: Dokument ${result.overflow.scrollWidth} px bei ${result.overflow.viewport} px Fenster`,
      );
    }
    for (const o of result.offenders) {
      console.log(`  ragt hinaus: ${o.el} (rechte Kante ${o.right})`);
    }
    for (const c of result.clipped) {
      console.log(`  abgeschnitten: ${c.el} (braucht ${c.needs}, hat ${c.has})`);
    }
    for (const t of result.tinyTargets) {
      console.log(`  Tippziel ${t.w}x${t.h} (< ${MIN_TARGET}): ${t.el} "${t.text}"`);
    }
  }

  await context.close();
}

await browser.close();
if (!found) console.log("keine Befunde");
process.exit(found ? 1 : 0);
