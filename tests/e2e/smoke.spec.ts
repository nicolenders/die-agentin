import { test, expect } from "@playwright/test";

// Rauch-Test der öffentlichen Hauptrouten (SPEC §17). Prüft, dass die Seiten in
// DE und EN erreichbar sind und Kernelemente rendern.

test("Startseite leitet auf /de um", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/de$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("HQ ist in EN erreichbar", async ({ page }) => {
  await page.goto("/en");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

for (const path of ["depeschen", "identitaeten", "einsaetze", "briefings", "publikationen", "ausbildung", "akte"]) {
  test(`Route /de/${path} lädt`, async ({ page }) => {
    const res = await page.goto(`/de/${path}`);
    expect(res?.status()).toBeLessThan(400);
  });
}

// Alt-URLs aus der Signale/Dossiers-Ära leiten auf Depeschen um (Phase 3).
for (const path of ["signale", "dossiers"]) {
  test(`Alt-Route /de/${path} leitet auf /de/depeschen um`, async ({ page }) => {
    await page.goto(`/de/${path}`);
    await expect(page).toHaveURL(/\/de\/depeschen/);
  });
}

// Audit 1.2/1.3: Jede öffentliche Route liefert eine eigene Meta-Description
// und genau ein canonical auf sich selbst. Vorher erbten sieben Routen die
// Description der Startseite.
const PUBLIC_ROUTES = [
  "",
  "depeschen",
  "identitaeten",
  "einsaetze",
  "briefings",
  "publikationen",
  "ausbildung",
  "akte",
  "legende",
  "impressum",
  "datenschutz",
  "barrierefreiheit",
];

for (const locale of ["de", "en"] as const) {
  test(`Meta-Descriptions sind je Route eigen (${locale})`, async ({ page }) => {
    const seen = new Map<string, string>();
    for (const route of PUBLIC_ROUTES) {
      const path = `/${locale}${route ? `/${route}` : ""}`;
      await page.goto(path);
      const description = await page
        .locator('head meta[name="description"]')
        .getAttribute("content");
      expect(description, `${path} hat keine Meta-Description`).toBeTruthy();
      const duplicate = seen.get(description!);
      expect(duplicate, `${path} wiederholt die Description von ${duplicate}`).toBeUndefined();
      seen.set(description!, path);
    }
  });

  test(`Canonical zeigt je Route auf sich selbst (${locale})`, async ({ page }) => {
    for (const route of PUBLIC_ROUTES) {
      const path = `/${locale}${route ? `/${route}` : ""}`;
      await page.goto(path);
      const canonicals = page.locator('head link[rel="canonical"]');
      await expect(canonicals).toHaveCount(1);
      expect(await canonicals.getAttribute("href")).toContain(path);
    }
  });
}

test("Skip-Link ist als erstes fokussierbares Element vorhanden", async ({ page }) => {
  await page.goto("/de");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toContainText(/Zum Inhalt springen|Skip to content/);
});
