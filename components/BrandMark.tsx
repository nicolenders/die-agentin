import { BRAND_MARK } from "@/lib/brand";

// Die Bildmarke („Die Agentin") als wiederkehrendes Erkennungszeichen: Kopfzeile,
// Fußzeile, Zentrale, Anmeldung. Bewusst als <img> ohne next/image — die Datei ist
// klein, hat eine feste Größe und soll ohne Optimierungs-Umweg sofort da sein.
//
// Standardmäßig dekorativ (alt=""), weil daneben immer „DIE AGENTIN" im Klartext
// steht. Wo die Marke allein steht, gehört ein `alt` übergeben.
export default function BrandMark({
  size = 38,
  alt = "",
  className,
}: {
  size?: number;
  alt?: string;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={BRAND_MARK}
      alt={alt}
      width={size}
      height={size}
      className={className}
      decoding="async"
      style={{ display: "block", width: size, height: size }}
    />
  );
}
