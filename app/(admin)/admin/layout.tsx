import type { Metadata } from "next";
import "@/styles/globals.scss";
import "@/styles/admin.scss";

// Root-Layout des Admin-Bereichs (eigene Route Group, eigenes <html>).
// Immer noindex (SPEC §5, §13).
export const metadata: Metadata = {
  title: "Zentrale · Die Agentin",
  robots: { index: false, follow: false },
};

export default function AdminRootLayout({
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
