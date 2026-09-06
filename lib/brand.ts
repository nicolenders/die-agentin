import type { Metadata, Viewport } from "next";

// Marken-Icons an EINER Stelle: öffentliche Seiten und Zentrale verweisen beide
// hierher. Alle Dateien entstehen aus dem Logo-Kit über `node scripts/brand-icons.mjs`.
//
// Warum mehrere Fassungen? Weil Leser unterschiedliche Browser, Geräte und
// Oberflächen mitbringen:
//
//   * favicon.ico (16/32/48) — alte Browser, Lesezeichen, Feed-Reader; viele
//     fragen /favicon.ico blind ab, unabhängig von den <link>-Tags.
//   * PNG-Kacheln — moderne Browser. Die Kachel bringt ihren eigenen dunklen
//     Grund mit; damit bleibt die Marke auf hellem wie dunklem Browser-Chrome
//     sichtbar (eine freigestellte Leuchtgrafik würde auf Dunkel verschwinden).
//   * apple-touch-icon — iOS/iPadOS legen Transparenz auf Schwarz und runden
//     selbst; deshalb randlos und deckend.
//   * maskable (im Manifest) — Android beschneidet Icons je nach Hersteller zu
//     Kreis, Squircle oder Rechteck; die Marke sitzt dort im sicheren Bereich.

/** Freigestellte Bildmarke für dunkle Flächen (Kopfzeile, Zentrale). */
export const BRAND_MARK = "/brand/mark-128.png";

/** Große freigestellte Fassung, z. B. für das Social-Sharing-Bild. */
export const BRAND_MARK_LARGE = "/brand/mark-512.png";

export const brandIcons: Metadata["icons"] = {
  icon: [
    { url: "/favicon.ico", sizes: "16x16 32x32 48x48" },
    { url: "/brand/icon-tile-32.png", type: "image/png", sizes: "32x32" },
    { url: "/brand/icon-tile-192.png", type: "image/png", sizes: "192x192" },
    { url: "/brand/icon-tile-512.png", type: "image/png", sizes: "512x512" },
  ],
  apple: [{ url: "/brand/apple-touch-icon.png", sizes: "180x180" }],
};

// Farbe der Browser-Oberfläche (Adressleiste auf Android, Kopfleiste in
// installierten Fenstern). Die Seite ist durchgehend dunkel gehalten — deshalb
// dieselbe Farbe für beide Systemeinstellungen, statt in der hellen Einstellung
// eine helle Leiste über eine dunkle Seite zu setzen.
export const brandViewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#05010d" },
    { media: "(prefers-color-scheme: dark)", color: "#05010d" },
  ],
  colorScheme: "dark",
};

// Ausweichnamen der Website für `WebSite.alternateName` (JSON-LD).
//
// Der Wunschname ist „Die Agentin“. Der ist im Deutschen aber nicht eindeutig:
// ein Gattungsbegriff, zugleich der Titel eines Spielfilms von 2019. Vergibt
// eine Suchmaschine ihn deshalb nicht, braucht sie eine Alternative — sonst
// bildet sie sich selbst eine aus Titel und Domain. Reihenfolge = Präferenz.
export const SITE_ALTERNATE_NAMES = ["Nicole Enders", "nicolenders.com"];
