import localFont from "next/font/local";

// Self-hosted Schriften (SPEC §10): Poppins (Display), Inter (Fließtext),
// JetBrains Mono (Daten/Meta). Über next/font/local ausgeliefert — keine
// Requests an Google-Server, kein Font-CDN, kein Layout-Shift. Die woff2-Dateien
// liegen als Repo-Assets in app/fonts/.

export const poppins = localFont({
  src: [
    { path: "../app/fonts/poppins-400.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/poppins-600.woff2", weight: "600", style: "normal" },
    { path: "../app/fonts/poppins-800.woff2", weight: "800", style: "normal" },
  ],
  variable: "--font-poppins",
  display: "swap",
  fallback: ["Century Gothic", "system-ui", "sans-serif"],
});

export const inter = localFont({
  src: "../app/fonts/inter-variable.woff2",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

export const jetbrainsMono = localFont({
  src: "../app/fonts/jetbrains-mono-variable.woff2",
  weight: "100 800",
  variable: "--font-jetbrains",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
});

/** Alle Font-CSS-Variablen — auf das <body>-Element anwenden. */
export const fontVariables = `${poppins.variable} ${inter.variable} ${jetbrainsMono.variable}`;
