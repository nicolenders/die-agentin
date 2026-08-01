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
  webServer: {
    command: "npm run dev",
    url: "http://localhost:3000/de",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
