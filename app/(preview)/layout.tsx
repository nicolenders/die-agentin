import type { Metadata, Viewport } from "next";
import "@/styles/globals.scss";
import { fontVariables } from "@/lib/fonts";
import { brandIcons, brandViewport } from "@/lib/brand";

// Root-Layout der teilbaren Vorschau (eigene Route Group). Immer noindex —
// Vorschauen sind nicht öffentlich auffindbar.
export const metadata: Metadata = {
  title: "Vorschau · Die Agentin",
  icons: brandIcons,
  robots: { index: false, follow: false },
};

export const viewport: Viewport = brandViewport;

export default function PreviewRootLayout({
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
