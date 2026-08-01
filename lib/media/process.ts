import sharp from "sharp";

// Bildverarbeitung (SPEC M2, §13): Metadaten (EXIF/GPS) entfernen, mehrere
// Größen als WebP erzeugen. Standortdaten aus Konferenzfotos gehören nicht ins
// Netz — sharp verwirft Metadaten standardmäßig (kein withMetadata()).

export const VARIANT_WIDTHS = [480, 960, 1600] as const;

export interface ProcessedVariant {
  w: number;
  format: "webp";
  buffer: Buffer;
}

export interface ProcessedImage {
  width: number;
  height: number;
  variants: ProcessedVariant[];
}

export async function processImage(input: Buffer): Promise<ProcessedImage> {
  const image = sharp(input, { failOn: "error" }).rotate(); // rotate() wendet EXIF-Orientierung an und verwirft sie
  const meta = await image.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;

  // Zielbreiten: die responsiven Stufen unterhalb der Originalbreite plus eine
  // Variante in Originalgröße (gedeckelt auf die größte Stufe). So bleibt für
  // mittelgroße Bilder (z. B. 700 px) die volle Auflösung erhalten, statt nur
  // eine kleine Stufe zu behalten. Kein Hochskalieren.
  const maxWidth = VARIANT_WIDTHS[VARIANT_WIDTHS.length - 1] ?? 1600;
  const effectiveWidth = width || maxWidth;
  const targets = new Set<number>(VARIANT_WIDTHS.filter((w) => w < effectiveWidth));
  targets.add(Math.min(effectiveWidth, maxWidth));

  const variants: ProcessedVariant[] = [];
  for (const w of [...targets].sort((a, b) => a - b)) {
    const buffer = await sharp(input)
      .rotate()
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    variants.push({ w, format: "webp", buffer });
  }

  return { width, height, variants };
}
