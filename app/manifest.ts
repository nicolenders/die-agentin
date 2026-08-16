import type { MetadataRoute } from "next";

// Web-App-Manifest: erlaubt das Ablegen der Seite auf dem Startbildschirm und
// gibt Android/Chrome die Icons und Farben vor. Bewusst schlank — die Seite ist
// eine Website, keine App: kein Service Worker, keine Offline-Fassung.
export const dynamic = "force-static";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Die Agentin — nicolenders.com",
    short_name: "Die Agentin",
    description: "Microsoft AI & Modern Work. Keine losen Enden.",
    start_url: "/de",
    scope: "/",
    display: "standalone",
    background_color: "#05010d",
    theme_color: "#05010d",
    lang: "de",
    icons: [
      { src: "/brand/icon-tile-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-tile-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // „maskable": Android beschneidet Icons je nach Hersteller zu Kreis,
      // Squircle oder Rechteck. Diese Fassung ist randlos gefüllt und hält die
      // Marke im sicheren Bereich, damit nichts abgeschnitten wird.
      { src: "/brand/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
