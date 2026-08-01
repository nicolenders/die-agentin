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

for (const path of ["signale", "dossiers", "einsaetze", "briefings", "publikationen", "ausbildung"]) {
  test(`Route /de/${path} lädt`, async ({ page }) => {
    const res = await page.goto(`/de/${path}`);
    expect(res?.status()).toBeLessThan(400);
  });
}

test("Skip-Link ist als erstes fokussierbares Element vorhanden", async ({ page }) => {
  await page.goto("/de");
  await page.keyboard.press("Tab");
  const focused = page.locator(":focus");
  await expect(focused).toContainText(/Zum Inhalt springen|Skip to content/);
});
