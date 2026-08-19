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

// Der Altbestand des WordPress-Blogs (docs/CUTOVER.md §14.2). Diese URLs stehen
// im Index von Google und tragen die Backlinks; sie liefen vor dieser Änderung
// über drei Sprünge in einen 404.
// Die Playwright-Konfiguration setzt Accept-Language auf de-DE, deshalb endet
// die Kette hier auf `/de/…`; ein englischer Browser landet über dieselbe
// Sprachweiche auf `/en/…`.
const LEGACY_TO_TARGET: Array<[string, RegExp]> = [
  ["/blog/", /\/de\/depeschen$/],
  ["/about-me/", /\/de\/legende$/],
  ["/tag/pnp/", /\/de\/depeschen$/],
  ["/tag/modernworkplace/", /\/de\/depeschen$/],
  ["/category/collaboration/", /\/de\/depeschen$/],
  ["/category/microsoft-365/", /\/de\/depeschen$/],
  ["/author/nicole/", /\/de\/legende$/],
];

for (const [from, target] of LEGACY_TO_TARGET) {
  test(`Alt-URL ${from} landet nicht im 404`, async ({ page }) => {
    const res = await page.goto(from);
    expect(res?.status(), `${from} antwortet mit ${res?.status()}`).toBeLessThan(400);
    await expect(page).toHaveURL(target);
  });
}

test("WordPress-Feed führt auf den neuen Feed", async ({ request }) => {
  const res = await request.get("/feed/");
  expect(res.status()).toBeLessThan(400);
  expect(res.url()).toContain("/feed.xml");
});

test("Technische WordPress-Pfade melden 410, nicht 404", async ({ request }) => {
  // Mit Umleitungen: Next normalisiert einen abschließenden Slash vorab per 308.
  // Entscheidend ist, worauf die Kette endet — 410 („endgültig weg") statt 404.
  for (const path of ["/wp-admin/", "/wp-login.php", "/xmlrpc.php", "/wp-content/uploads/x.png"]) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(410);
  }
});

// Der alte Blog ist vollständig gelöscht, es wird nichts migriert. Für die
// Beiträge gibt es deshalb kein Ziel — nur die Wahrheit.
const GELOESCHTE_BEITRAEGE = [
  "/2019/11/10/use-cases-for-private-channels-in-microsoft-teams/",
  "/2019/12/01/org-wide-teams-and-their-purpose/",
  "/2021/01/10/channel-calendar-app-in-microsoft-teams/comment-page-1/",
];

test("Gelöschte Beiträge melden 410 statt in einen 404 weiterzuleiten", async ({ request }) => {
  for (const path of GELOESCHTE_BEITRAEGE) {
    const res = await request.get(path);
    expect(res.status(), path).toBe(410);
  }
});

test("Die 410-Seite bietet einen Weg weiter und ist keine nackte Fehlerzeile", async ({ page }) => {
  const res = await page.goto(GELOESCHTE_BEITRAEGE[0]!);
  expect(res?.status()).toBe(410);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await expect(page.getByRole("link", { name: /Depeschen/i })).toBeVisible();
  // Der Weg muss auch funktionieren, nicht nur dastehen.
  await page.getByRole("link", { name: /Depeschen/i }).click();
  await expect(page).toHaveURL(/\/de\/depeschen$/);
});

test("Die 410-Seite spricht die Sprache des Besuchers", async ({ browser }) => {
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();
  await page.goto(GELOESCHTE_BEITRAEGE[1]!);
  await expect(page.locator("html")).toHaveAttribute("lang", "en");
  await context.close();
});

test("Datumsarchive bleiben Übersichten und führen auf die Liste", async ({ page }) => {
  await page.goto("/2021/05/");
  await expect(page).toHaveURL(/\/de\/depeschen$/);
});

test("Alt-Route /signale setzt den 301 an den Anfang, nicht hinter die Sprachweiche", async ({
  request,
}) => {
  // Vorher: 307 auf `/de/signale` (eine Adresse, die selbst noch eine Regel
  // braucht), erst danach der 301. Jetzt trägt der erste Sprung das Signal und
  // zeigt auf einen Pfad, den es wirklich gibt.
  const res = await request.get("/signale", { maxRedirects: 0 });
  expect(res.status()).toBe(301);
  expect(res.headers()["location"]).toContain("/depeschen");
});

test("Der signaltragende Sprung einer Alt-URL ist ein 301, kein 307", async ({ request }) => {
  // Nur die Adressen, deren Funktion fortbesteht. Die gelöschten Beiträge
  // gehören nicht dazu — die bekommen 410.
  // Ohne abschließenden Schrägstrich: den normalisiert Next vorab per 308 weg,
  // und geprüft werden soll der Sprung danach.
  for (const path of ["/blog", "/about-me", "/tag/pnp", "/category/collaboration", "/2019/12"]) {
    const res = await request.get(path, { maxRedirects: 0 });
    expect(res.status(), path).toBe(301);
  }
});

test("Ein englischer Browser landet über eine Alt-URL auf der englischen Seite", async ({
  browser,
}) => {
  // Der alte Blog war englischsprachig. Ein hart auf `/de/…` gesetztes Ziel
  // hätte genau dieses Publikum auf deutsche Seiten geschickt.
  const context = await browser.newContext({ locale: "en-US" });
  const page = await context.newPage();
  await page.goto("/blog/");
  await expect(page).toHaveURL(/\/en\/depeschen$/);
  await context.close();
});
