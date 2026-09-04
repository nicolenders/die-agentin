// Justiertes Zeilenlayout für Bildergalerien („justified rows", wie es Flickr,
// Google Fotos und Unsplash benutzen).
//
// Warum nicht Raster oder Masonry: Nicole mischt Hoch- und Querformat. Ein
// starres Raster schneidet dann entweder Bilder an oder lässt Löcher; Masonry
// (`grid-template-rows: masonry`) ist Ende 2026 noch nicht überall gleich
// implementiert. Justierte Zeilen behalten jedes Seitenverhältnis unbeschnitten
// bei, lassen keine Lücke am Zeilenende und ordnen sich der Breite unter — ein
// Hochformat wird schmal, ein Querformat breit, beide gleich hoch.
//
// Diese Datei entscheidet nur, WELCHE Bilder in eine Zeile gehören. Die genaue
// Breitenverteilung innerhalb der Zeile überlässt die Komponente dem Flexbox-
// Algorithmus (`flex-grow` im Verhältnis der Seitenverhältnisse) — der rechnet
// subpixelgenau, was hier nie gelänge.

/** Seitenverhältnis, wenn die Maße eines Bildes fehlen: klassisches Querformat. */
export const FALLBACK_ASPECT = 3 / 2;

/**
 * Grenzen des Seitenverhältnisses. Ein Panorama von 6:1 würde eine Zeile allein
 * füllen und dabei zum Streifen schrumpfen; ein extremes Hochformat würde zur
 * Säule. Beides wird auf ein Maß gebracht, mit dem sich noch layouten lässt.
 */
const MIN_ASPECT = 0.5;
const MAX_ASPECT = 3;

/** Seitenverhältnis (Breite/Höhe) aus den Maßen, mit Rückfall und Deckelung. */
export function aspectRatio(width?: number | null, height?: number | null): number {
  if (!width || !height || width <= 0 || height <= 0) return FALLBACK_ASPECT;
  return Math.min(MAX_ASPECT, Math.max(MIN_ASPECT, width / height));
}

/**
 * Zielhöhe einer Zeile, abhängig von der verfügbaren Breite. Auf dem Telefon
 * soll ein Querformat allein oder zwei Hochformate nebeneinander stehen — drei
 * Bilder auf 360 px wären Briefmarken. Am großen Bildschirm sind zwei bis drei
 * Bilder je Zeile die Größe, in der man noch etwas erkennt.
 */
export function targetRowHeight(containerWidth: number): number {
  if (containerWidth < 420) return Math.round(containerWidth * 0.62);
  if (containerWidth < 760) return 240;
  return 290;
}

export interface JustifiedRow<T> {
  items: T[];
  /** Höhe der Zeile in Pixeln. */
  height: number;
  /**
   * Ob die Zeile die volle Breite füllt. Falsch nur, wenn ein einzelnes Bild
   * über die ganze Breite zur Wand würde — dann bleibt es bei der Höchsthöhe
   * und die Zeile endet früher.
   */
  full: boolean;
}

export interface JustifyOptions {
  /** Verfügbare Breite in Pixeln. */
  containerWidth: number;
  /** Abstand zwischen zwei Bildern einer Zeile, in Pixeln. */
  gap: number;
  /** Angestrebte Zeilenhöhe; ohne Angabe aus der Breite abgeleitet. */
  targetHeight?: number;
}

/**
 * Wie hoch eine Zeile höchstens werden darf, als Vielfaches der Zielhöhe. Ein
 * einzelnes Hochformat über die volle Breite wäre sonst über tausend Pixel hoch
 * — man sähe nur noch ein Bild und müsste scrollen.
 */
const MAX_HEIGHT_FACTOR = 1.5;

/** Wie viele Bilder höchstens in einer Zeile stehen dürfen. */
const MAX_PER_ROW = 8;

/**
 * Teilt Bilder in Zeilen auf, die die Breite füllen.
 *
 * Nicht gierig, sondern optimal: Ein gieriges Verfahren („nimm Bilder auf, bis
 * die Zeile zu niedrig wird") lässt Zeilenhöhen stark schwanken und hinterlässt
 * am Ende oft ein einzelnes Bild als Waise. Hier wird stattdessen die Aufteilung
 * gesucht, bei der die Summe der quadrierten Abweichungen von der Zielhöhe am
 * kleinsten ist (dynamische Programmierung über die Umbruchstellen, O(n·k)).
 * Ergebnis: gleichmäßig hohe Zeilen und ein Block mit glatter Kante.
 *
 * Die Reihenfolge der Bilder bleibt erhalten — sie ist redaktionell gepflegt
 * (`sortOrder`), Umsortieren wäre eine Anmaßung.
 */
export function justifyRows<T>(
  items: readonly T[],
  aspectOf: (item: T) => number,
  { containerWidth, gap, targetHeight }: JustifyOptions,
): JustifiedRow<T>[] {
  if (items.length === 0 || containerWidth <= 0) return [];
  const target = targetHeight ?? targetRowHeight(containerWidth);
  const aspects = items.map(aspectOf);
  const n = items.length;

  // Präfixsummen: die Summe der Seitenverhältnisse einer Zeile in O(1).
  const prefix = [0];
  for (const a of aspects) prefix.push(prefix[prefix.length - 1]! + a);

  /** Höhe der Zeile aus den Bildern [from, to). */
  const heightOf = (from: number, to: number): number => {
    const sum = prefix[to]! - prefix[from]!;
    if (sum <= 0) return 0;
    return (containerWidth - gap * (to - from - 1)) / sum;
  };

  // best[i] = geringste Gesamtabweichung für die ersten i Bilder,
  // breakAt[i] = Anfang der Zeile, die bei Bild i endet.
  const best = new Array<number>(n + 1).fill(Number.POSITIVE_INFINITY);
  const breakAt = new Array<number>(n + 1).fill(0);
  best[0] = 0;

  for (let to = 1; to <= n; to++) {
    for (let from = Math.max(0, to - MAX_PER_ROW); from < to; from++) {
      if (!Number.isFinite(best[from]!)) continue;
      const deviation = heightOf(from, to) - target;
      const cost = best[from]! + deviation * deviation;
      if (cost < best[to]!) {
        best[to] = cost;
        breakAt[to] = from;
      }
    }
  }

  // Umbruchstellen rückwärts einsammeln.
  const rows: JustifiedRow<T>[] = [];
  let to = n;
  while (to > 0) {
    const from = breakAt[to]!;
    const height = heightOf(from, to);
    const max = target * MAX_HEIGHT_FACTOR;
    const capped = height > max;
    rows.push({ items: items.slice(from, to), height: capped ? max : height, full: !capped });
    to = from;
  }
  return rows.reverse();
}
