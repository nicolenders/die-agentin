import localFont from "next/font/local";

// Self-hosted Schriften (SPEC §10): Poppins (Display), Inter (Fließtext),
// JetBrains Mono (Daten/Meta). Über next/font/local ausgeliefert — keine
// Requests an Google-Server, kein Font-CDN, kein Layout-Shift. Die woff2-Dateien
// liegen als Repo-Assets in app/fonts/.
//
// Bewusst STATISCHE Schnitte statt variabler Schriften. Chrome bettet eine
// variable Schrift beim Drucken nicht als echte Schrift ein, sondern zeichnet
// jeden Buchstaben als Pfad („Type 3“). Im PDF sieht das ungleichmäßig aus —
// senkrechte Striche wie in „I“, „l“ und Bindestrichen wirken je nach Zeile
// unterschiedlich dick —, und der Text lässt sich schlechter durchsuchen. Für
// den Lebenslauf, der als PDF einer Bewerbung beiliegt, ist das nicht
// hinnehmbar. Die Schnitte sind aus denselben variablen Dateien erzeugt, sehen
// also unverändert aus.

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
  src: [
    { path: "../app/fonts/inter-400.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/inter-500.woff2", weight: "500", style: "normal" },
    { path: "../app/fonts/inter-600.woff2", weight: "600", style: "normal" },
    { path: "../app/fonts/inter-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-inter",
  display: "swap",
  fallback: ["system-ui", "-apple-system", "Segoe UI", "sans-serif"],
});

export const jetbrainsMono = localFont({
  src: [
    { path: "../app/fonts/jetbrains-mono-400.woff2", weight: "400", style: "normal" },
    { path: "../app/fonts/jetbrains-mono-700.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-jetbrains",
  display: "swap",
  fallback: ["ui-monospace", "SFMono-Regular", "Consolas", "monospace"],
});

/** Alle Font-CSS-Variablen — auf das <body>-Element anwenden. */
export const fontVariables = `${poppins.variable} ${inter.variable} ${jetbrainsMono.variable}`;
