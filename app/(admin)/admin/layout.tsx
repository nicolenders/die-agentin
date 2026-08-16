import type { Metadata, Viewport } from "next";
import "@/styles/globals.scss";
import "@/styles/admin.scss";
import { fontVariables } from "@/lib/fonts";
import { brandIcons, brandViewport } from "@/lib/brand";

// Root-Layout des Admin-Bereichs (eigene Route Group, eigenes <html>).
// Immer noindex (SPEC §5, §13).
export const metadata: Metadata = {
  title: "Zentrale · Die Agentin",
  // Gleiches Icon wie öffentlich: Im Reiter neben der Website soll die Zentrale
  // erkennbar zur selben Marke gehören.
  icons: brandIcons,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = brandViewport;

export default function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
