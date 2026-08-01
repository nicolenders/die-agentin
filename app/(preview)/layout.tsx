import type { Metadata } from "next";
import "@/styles/globals.scss";

// Root-Layout der teilbaren Vorschau (eigene Route Group). Immer noindex —
// Vorschauen sind nicht öffentlich auffindbar.
export const metadata: Metadata = {
  title: "Vorschau · Die Agentin",
  robots: { index: false, follow: false },
};

export default function PreviewRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="de">
      <body>{children}</body>
    </html>
  );
}
