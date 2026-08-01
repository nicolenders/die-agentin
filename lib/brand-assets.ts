import { existsSync } from "node:fs";
import { join } from "node:path";

// Markenbilder (Hero, Porträt, Cover …). Prinzip: Zero-Config — liegt die Datei
// unter `public/brand/<name>`, wird sie ausgeliefert; sonst zeigt die UI einen
// gestalteten Platzhalter (siehe BrandImage + docs/BILDPROMPTS.md).
//
// Nur in Server-Komponenten verwenden (Dateisystemzugriff).
export function brandAsset(fileName: string): string | null {
  const candidates = [fileName, ...alternativeExtensions(fileName)];
  for (const name of candidates) {
    if (existsSync(join(process.cwd(), "public", "brand", name))) {
      return `/brand/${name}`;
    }
  }
  return null;
}

// Erlaubt, dass die generierte Datei .jpg, .png oder .webp sein darf.
function alternativeExtensions(fileName: string): string[] {
  const base = fileName.replace(/\.[^.]+$/, "");
  return ["jpg", "jpeg", "png", "webp", "avif"]
    .map((ext) => `${base}.${ext}`)
    .filter((name) => name !== fileName);
}
