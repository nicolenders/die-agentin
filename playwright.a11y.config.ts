import { defineConfig, devices } from "@playwright/test";

// A11y-Konfiguration (SPEC §17): axe-core über die Hauptrouten in beiden
// Sprachen, 0 kritische Verstöße als Gate.
export default defineConfig({
  testDir: "./tests/a11y",
  fullyParallel: true,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://localhost:3000",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  // In CI gegen den Produktionsbuild (`npm run start`), lokal weiter gegen den
  // Entwicklungsserver. Sonst prüft die Pipeline eine Ausgabe, die so nie
  // ausgeliefert wird.
  webServer: {
    command: process.env.PLAYWRIGHT_WEB_SERVER === "start" ? "npm run start" : "npm run dev",
    url: "http://localhost:3000/de",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
