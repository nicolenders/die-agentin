import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// axe-core über die Hauptrouten in beiden Sprachen (SPEC §17): 0 kritische
// Verstöße als Gate. Routenliste nach dem Umbau aktualisiert (Depeschen statt
// Signale/Dossiers, neue Identitäten- und Akte-Seiten).
const ROUTES = [
  "",
  "depeschen",
  "identitaeten",
  "einsaetze",
  "briefings",
  "publikationen",
  "ausbildung",
  "akte",
  "legende",
];
const LOCALES = ["de", "en"] as const;

for (const locale of LOCALES) {
  for (const route of ROUTES) {
    const path = `/${locale}${route ? `/${route}` : ""}`;
    test(`a11y: ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
        .analyze();
      const critical = results.violations.filter((v) => v.impact === "critical");
      expect(critical, JSON.stringify(critical, null, 2)).toEqual([]);
    });
  }
}
