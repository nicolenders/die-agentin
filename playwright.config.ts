import { defineConfig, devices } from "@playwright/test";

// E2E-Konfiguration (SPEC §17). Startet die App lokal und prüft die
// Hauptflüsse. In CI wird der Browser über `playwright install` bereitgestellt.
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "line" : "list",
  use: {
    baseURL: "http://localhost:3000",
    // Deutschsprachiger Primärnutzer: setzt Accept-Language de-DE, damit `/`
    // deterministisch auf `/de` weiterleitet (SPEC §5: DE ist Quellsprache).
    // Ohne das folgt der Browser-Default (en-US) und `/` ginge auf `/en`.
    locale: "de-DE",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/de",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
