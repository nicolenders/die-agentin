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

  const variants: ProcessedVariant[] = [];
  for (const w of VARIANT_WIDTHS) {
    if (width && w > width && variants.length > 0) break; // nicht hochskalieren
    const buffer = await sharp(input)
      .rotate()
      .resize({ width: Math.min(w, width || w), withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer();
    variants.push({ w: Math.min(w, width || w), format: "webp", buffer });
  }

  return { width, height, variants };
}
