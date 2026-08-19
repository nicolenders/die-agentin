#!/usr/bin/env node
// Zieht je Route die Angaben, die für Barrierefreiheit und SEO zählen, und
// meldet die Auffälligkeiten. Braucht nur `fetch` — kein Browser, deshalb auch
// gegen entfernte Server einsetzbar.
//
//   node .claude/skills/mehrrollen-check/scripts/page-audit.mjs \
//     --base http://localhost:3000 \
//     --routes /de,/de/liste,/en
//
// Zusätzlich lassen sich Alt-Adressen auf ihre Weiterleitungskette prüfen:
//
//   node .claude/skills/mehrrollen-check/scripts/page-audit.mjs \
//     --base http://localhost:3000 --chains /blog/,/tag/x/,/2019/12/01/beitrag/
//
// Eine Kette, die im 404 endet, ist der teuerste Fehler bei einem Relaunch —
// im Quelltext sieht sie unauffällig aus.

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i > -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const BASE = arg("base", "http://localhost:3000").replace(/\/$/, "");
const ROUTES = arg("routes", "").split(",").map((r) => r.trim()).filter(Boolean);
const CHAINS = arg("chains", "").split(",").map((r) => r.trim()).filter(Boolean);
const LANG = arg("accept-language", "de-DE,de;q=0.9");

const strip = (html) => html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
const unescape = (s) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#(\d+);/g, (_, d) => String.fromCharCode(Number(d)));

function meta(html, attr, value) {
  const re = new RegExp(`<meta[^>]*${attr}=["']${value}["'][^>]*content=["']([^"']*)["']`, "i");
  const alt = new RegExp(`<meta[^>]*content=["']([^"']*)["'][^>]*${attr}=["']${value}["']`, "i");
  return unescape((re.exec(html) ?? alt.exec(html))?.[1] ?? "");
}

/** Folgt der Weiterleitungskette Schritt für Schritt und gibt sie zurück. */
async function chain(url, max = 8) {
  const hops = [];
  let current = url;
  for (let i = 0; i < max; i++) {
    const res = await fetch(current, {
      redirect: "manual",
      headers: { "Accept-Language": LANG },
    });
    hops.push({ url: current, status: res.status });
    const location = res.headers.get("location");
    if (!location) break;
    current = new URL(location, current).toString();
  }
  return hops;
}

let findings = 0;

if (ROUTES.length) {
  console.log("=== Seiten ===");
  const descriptions = new Map();
  const canonicals = new Map();

  for (const route of ROUTES) {
    const url = `${BASE}${route}`;
    let html;
    let status;
    try {
      const res = await fetch(url, { headers: { "Accept-Language": LANG } });
      status = res.status;
      html = await res.text();
    } catch (error) {
      console.log(`\n${route}\n  NICHT ERREICHBAR: ${error.message}`);
      findings++;
      continue;
    }

    const body = html.includes("<body") ? html.slice(html.indexOf("<body")) : html;
    const headings = [...body.matchAll(/<(h[1-6])[^>]*>([\s\S]*?)<\/\1>/gi)].map((m) => ({
      level: Number(m[1][1]),
      text: strip(m[2]).slice(0, 50),
    }));

    const issues = [];
    if (status >= 400) issues.push(`Status ${status}`);

    const h1 = headings.filter((h) => h.level === 1);
    if (h1.length === 0) issues.push("keine h1");
    if (h1.length > 1) issues.push(`${h1.length} h1`);

    // Sprung um mehr als eine Stufe — bricht die Gliederung für Screenreader.
    for (let i = 1; i < headings.length; i++) {
      const from = headings[i - 1].level;
      const to = headings[i].level;
      if (to > from + 1) {
        issues.push(`Überschriftensprung h${from} → h${to} ("${headings[i].text}")`);
        break;
      }
    }

    const title = unescape(strip(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? ""));
    if (!title) issues.push("kein title");

    const description = meta(html, "name", "description");
    if (!description) issues.push("keine meta description");
    else if (descriptions.has(description)) {
      issues.push(`Description doppelt (wie ${descriptions.get(description)})`);
    } else descriptions.set(description, route);

    const canonical = unescape(
      /<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i.exec(html)?.[1] ?? "",
    );
    if (!canonical) issues.push("kein canonical");
    else {
      if (!canonical.endsWith(route)) issues.push(`canonical zeigt auf ${canonical}`);
      if (canonicals.has(canonical)) {
        issues.push(`canonical doppelt (wie ${canonicals.get(canonical)})`);
      } else canonicals.set(canonical, route);
    }

    const lang = /<html[^>]*lang=["']([^"']+)["']/i.exec(html)?.[1];
    if (!lang) issues.push("kein lang am html-Element");

    if (issues.length) {
      findings += issues.length;
      console.log(`\n${route}`);
      console.log(`  Gliederung: ${headings.map((h) => `h${h.level}`).join(" ") || "—"}`);
      for (const issue of issues) console.log(`  • ${issue}`);
    }
  }
}

if (CHAINS.length) {
  console.log("\n=== Weiterleitungsketten ===");
  for (const route of CHAINS) {
    const hops = await chain(`${BASE}${route}`);
    const last = hops[hops.length - 1];
    const path = hops.map((h) => h.status).join(" → ");
    const target = last.url.replace(BASE, "");
    const broken = last.status >= 400 && last.status !== 410;
    if (broken) findings++;
    const mark = broken ? "  ✗" : "   ";
    console.log(`${mark} ${route.padEnd(46)} ${path}  → ${target}`);
    if (broken) console.log(`      endet im ${last.status} — Alt-Adresse ohne Ziel`);
  }
}

if (!findings) console.log("\nkeine Befunde");
process.exit(findings ? 1 : 0);
