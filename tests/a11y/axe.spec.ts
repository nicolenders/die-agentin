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
      // `serious` gehört mit ins Gate. Vorher fiel nur `critical` durch — und
      // damit rutschten fehlende Namen, zu schwache Kontraste und kaputte
      // Beschriftungen glatt durch, obwohl genau die den Screenreader
      // unbrauchbar machen.
      const blocking = results.violations.filter(
        (v) => v.impact === "critical" || v.impact === "serious",
      );
      expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([]);
    });

    // Audit 6.1: Fast alle Unterseiten hatten ihre H1 als Eyebrow gesetzt —
    // 10,5px Mono-Versalie. Diese Regeln liegen außerhalb der WCAG-Tags oben
    // und werden deshalb eigens geprüft, zusammen mit der Anzahl.
    //
    // `heading-order` ist jetzt dabei: die Fußzeile setzte ihre
    // Spaltenüberschriften als <h4>, wodurch die Gliederung auf JEDER Seite von
    // h1 auf h4 sprang. Ursache behoben (SiteFooter), Regel scharf gestellt —
    // damit die Altlast nicht stillschweigend zurückkommt.
    test(`Überschriftenstruktur: ${path}`, async ({ page }) => {
      await page.goto(path);
      const results = await new AxeBuilder({ page })
        .withRules(["page-has-heading-one", "empty-heading", "heading-order"])
        .analyze();
      expect(results.violations, JSON.stringify(results.violations, null, 2)).toEqual([]);
      await expect(page.locator("main h1")).toHaveCount(1);
    });
  }
}
