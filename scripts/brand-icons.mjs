// Leitet alle Icon-Dateien aus EINEM Original ab: dem Logo-Kit unter
// docs/die-agentin-logo-kit. Aufruf: `node scripts/brand-icons.mjs`
//
// Warum ein Skript statt handgeschnittener Dateien: Ändert sich die Marke, wird
// das Kit ausgetauscht und dieser Befehl einmal ausgeführt — alle Größen,
// Varianten und das ICO entstehen daraus neu und bleiben zueinander stimmig.
//
// Aus dem Kit stammt ein 512er-PNG: die Bildmarke auf einer dunklen, gerundeten
// Kachel, umgeben von einem violetten Verlauf (Rest des Design-Blatts). Daraus
// entstehen hier:
//
//   1. mark-*.png            Bildmarke freigestellt (Alpha aus der Leuchtkraft) —
//                            liegt auf jedem dunklen Grund richtig auf, ohne
//                            sichtbare Kachelkante. Für Kopfzeile und Zentrale.
//   2. icon-tile-*.png       gerundete Kachel mit transparenten Ecken — als
//                            Favicon/PWA-Icon auf hellem wie dunklem Browser-
//                            Chrome erkennbar.
//   3. icon-maskable-512.png randlos gefüllt, Marke im sicheren Bereich — Android
//                            beschneidet Icons selbst (Kreis, Squircle …).
//   4. apple-touch-icon.png  randlos und deckend: iOS legt Transparenz auf
//                            Schwarz und rundet die Ecken selbst.
//   5. app/favicon.ico       16/32/48 für alte Browser, Lesezeichen, Feed-Reader.

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.join(import.meta.dirname, "..");
const SOURCE = path.join(ROOT, "docs/die-agentin-logo-kit/favicon-512x512.png");
const OUT_BRAND = path.join(ROOT, "public/brand");
// favicon.ico liegt bewusst in public/ und nicht in app/: Alle Icon-Verweise
// stehen an EINER Stelle (lib/brand.ts) statt teils über Next-Dateikonventionen,
// teils über Metadaten — sonst landen doppelte <link>-Tags im Kopf.
const OUT_PUBLIC = path.join(ROOT, "public");

// Der violette Verlauf des Design-Blatts liegt außerhalb der Kachel; 30 px
// Beschnitt auf allen Seiten enden sicher innerhalb der Kachelkante.
const SOURCE_INSET = 30;

// Alpha-Kurve für das Freistellen: Pixel dunkler als LOW werden vollständig
// transparent (Kachelgrund), heller als HIGH vollständig deckend (die Marke).
// Dazwischen wird weich übergeblendet, damit der Schein erhalten bleibt.
const ALPHA_LOW = 34;
const ALPHA_HIGH = 120;

const TILE_BG_TOP = { r: 0x14, g: 0x0a, b: 0x2a };
const TILE_BG_BOTTOM = { r: 0x07, g: 0x02, b: 0x12 };

/** Bildmarke freistellen: Alpha aus dem hellsten Farbkanal je Pixel. */
async function cutOutMark() {
  const src = sharp(SOURCE).extract({
    left: SOURCE_INSET,
    top: SOURCE_INSET,
    width: 512 - 2 * SOURCE_INSET,
    height: 512 - 2 * SOURCE_INSET,
  });
  const { data, info } = await src.raw().toBuffer({ resolveWithObject: true });

  const rgba = Buffer.alloc(info.width * info.height * 4);
  for (let i = 0, o = 0; i < data.length; i += info.channels, o += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];
    const lum = Math.max(r, g, b);
    const t = Math.min(1, Math.max(0, (lum - ALPHA_LOW) / (ALPHA_HIGH - ALPHA_LOW)));
    // Smoothstep: weicher Übergang statt harter Kante am Schwellwert.
    const alpha = t * t * (3 - 2 * t);
    rgba[o] = r;
    rgba[o + 1] = g;
    rgba[o + 2] = b;
    rgba[o + 3] = Math.round(alpha * 255);
  }

  // Die Kachel des Originals hat eine helle Randlinie. Sie liegt heller als der
  // Schwellwert und bliebe sonst als Geisterkante stehen — besonders in den
  // Ecken, wo die Rundung nach innen reicht. Ein abgerundeter Maskenrahmen
  // schneidet genau diesen Rand weg; die Arme des Fadenkreuzes bleiben stehen.
  const inset = 6;
  const maskRadius = 80;
  const mask = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${info.width}" height="${info.height}">
       <rect x="${inset}" y="${inset}" width="${info.width - 2 * inset}" height="${info.height - 2 * inset}"
             rx="${maskRadius}" ry="${maskRadius}" fill="#fff"/>
     </svg>`,
  );

  // Auf den tatsächlichen Inhalt beschneiden und wieder quadratisch auffüllen,
  // damit die Marke in jeder Ausgabegröße mittig und gleich groß sitzt.
  const trimmed = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } })
    .composite([{ input: mask, blend: "dest-in" }])
    .trim({ threshold: 2 })
    .png()
    .toBuffer();
  const meta = await sharp(trimmed).metadata();
  const side = Math.max(meta.width, meta.height);
  return sharp({
    create: { width: side, height: side, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: trimmed, gravity: "center" }])
    .png()
    .toBuffer();
}

/** Gerundete Kachel als SVG — Ecken bleiben transparent. */
function tileBackground(size) {
  const radius = Math.round(size * 0.225);
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
       <defs>
         <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0" stop-color="rgb(${TILE_BG_TOP.r},${TILE_BG_TOP.g},${TILE_BG_TOP.b})"/>
           <stop offset="1" stop-color="rgb(${TILE_BG_BOTTOM.r},${TILE_BG_BOTTOM.g},${TILE_BG_BOTTOM.b})"/>
         </linearGradient>
       </defs>
       <rect width="${size}" height="${size}" rx="${radius}" ry="${radius}" fill="url(#g)"/>
     </svg>`,
  );
}

/** Marke auf einen Untergrund setzen; `scale` = Anteil der Kantenlänge. */
async function compose(markPng, size, scale, background) {
  const inner = Math.round(size * scale);
  const mark = await sharp(markPng).resize(inner, inner, { fit: "contain" }).png().toBuffer();
  return sharp(background)
    .composite([{ input: mark, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toBuffer();
}

/**
 * ICO aus fertigen PNG-Kacheln bauen. Das Format ist schlicht: 6-Byte-Kopf,
 * je Bild ein 16-Byte-Verzeichniseintrag, danach die PNG-Daten am Stück.
 * Spart eine Extra-Abhängigkeit nur fürs Verpacken.
 */
function buildIco(pngs) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserviert
  header.writeUInt16LE(1, 2); // Typ 1 = Icon
  header.writeUInt16LE(pngs.length, 4);

  const directory = Buffer.alloc(16 * pngs.length);
  let offset = header.length + directory.length;
  pngs.forEach(({ size, data }, i) => {
    const e = i * 16;
    directory.writeUInt8(size >= 256 ? 0 : size, e); // 0 bedeutet 256
    directory.writeUInt8(size >= 256 ? 0 : size, e + 1);
    directory.writeUInt8(0, e + 2); // Farbpalette: keine
    directory.writeUInt8(0, e + 3); // reserviert
    directory.writeUInt16LE(1, e + 4); // Ebenen
    directory.writeUInt16LE(32, e + 6); // Bit je Pixel
    directory.writeUInt32LE(data.length, e + 8);
    directory.writeUInt32LE(offset, e + 12);
    offset += data.length;
  });

  return Buffer.concat([header, directory, ...pngs.map((p) => p.data)]);
}

async function main() {
  await mkdir(OUT_BRAND, { recursive: true });
  const mark = await cutOutMark();

  // 1. Freigestellte Marke in zwei Größen (Kopfzeile bzw. große Darstellung).
  for (const size of [128, 512]) {
    await sharp(mark)
      .resize(size, size)
      .png({ compressionLevel: 9 })
      .toFile(path.join(OUT_BRAND, `mark-${size}.png`));
  }

  // 2. Gerundete Kacheln (Favicon-PNG, PWA).
  const tiles = {};
  for (const size of [32, 48, 180, 192, 512]) {
    tiles[size] = await compose(mark, size, 0.74, tileBackground(size));
    await writeFile(path.join(OUT_BRAND, `icon-tile-${size}.png`), tiles[size]);
  }
  // 16 px: die Marke füllt mehr Fläche, sonst zerfällt sie im Reiter.
  tiles[16] = await compose(mark, 16, 0.86, tileBackground(16));
  await writeFile(path.join(OUT_BRAND, "icon-tile-16.png"), tiles[16]);

  // 3. Maskable (Android schneidet selbst zu — Marke bleibt im sicheren Bereich).
  const solid512 = await sharp({
    create: { width: 512, height: 512, channels: 4, background: { ...TILE_BG_BOTTOM, alpha: 1 } },
  })
    .png()
    .toBuffer();
  await writeFile(path.join(OUT_BRAND, "icon-maskable-512.png"), await compose(mark, 512, 0.6, solid512));

  // 4. Apple: deckend, ohne eigene Rundung.
  const solid180 = await sharp({
    create: { width: 180, height: 180, channels: 4, background: { ...TILE_BG_BOTTOM, alpha: 1 } },
  })
    .png()
    .toBuffer();
  await writeFile(path.join(OUT_BRAND, "apple-touch-icon.png"), await compose(mark, 180, 0.76, solid180));

  // 5. favicon.ico für alte Browser und Lesezeichen.
  const ico = buildIco([
    { size: 16, data: tiles[16] },
    { size: 32, data: tiles[32] },
    { size: 48, data: tiles[48] },
  ]);
  await writeFile(path.join(OUT_PUBLIC, "favicon.ico"), ico);

  console.log("Icons erzeugt in public/brand/ und public/favicon.ico");
}

await main();
