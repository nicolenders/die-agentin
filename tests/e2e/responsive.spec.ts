import { test, expect } from "@playwright/test";

// Responsive-Gate. CLAUDE.md nennt in der Definition of Done drei Breiten —
// 380, 768 und 1440 px —, geprüft wurde das aber nirgends automatisch. Bei
// 380 px schob sich die Kopfzeile 8 px über den rechten Rand und JEDE Seite
// ließ sich seitlich schieben; auffallen konnte das nur von Hand.
//
// Die Prüfung ist bewusst schlicht: Ein Dokument, das breiter ist als das
// Fenster, ist auf einem Telefon immer ein Fehler. Was genau hinausragt, sagt
// die Fehlermeldung dazu, damit die Ursache nicht gesucht werden muss.

const WIDTHS = [380, 768, 1440] as const;

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
  "impressum",
];

/** Sichtbare Elemente, die über den rechten Fensterrand hinausragen. */
async function overflowing(page: import("@playwright/test").Page, viewport: number) {
  return page.evaluate((vw) => {
    const out: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const style = getComputedStyle(el);
      if (style.display === "none" || style.visibility === "hidden") continue;
      if (style.position === "fixed") continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (rect.right <= vw + 1) continue;
      // Steckt es in etwas, das selbst scrollen darf (Tabellen, Codeblöcke)?
      let scrollable = false;
      for (let parent = el.parentElement; parent; parent = parent.parentElement) {
        if (/(auto|scroll)/.test(getComputedStyle(parent).overflowX)) {
          scrollable = true;
          break;
        }
      }
      if (scrollable) continue;
      const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/)[0] : "";
      out.push(`${el.tagName.toLowerCase()}${cls ? `.${cls}` : ""} (rechts ${Math.round(rect.right)})`);
      if (out.length >= 5) break;
    }
    return out;
  }, viewport);
}

for (const width of WIDTHS) {
  test.describe(`${width} px`, () => {
    test.use({ viewport: { width, height: 800 } });

    for (const route of ROUTES) {
      const path = `/de${route ? `/${route}` : ""}`;

      test(`${path} scrollt nicht seitlich`, async ({ page }) => {
        await page.goto(path);
        const offenders = await overflowing(page, width);
        expect(offenders, `Ragt über den rechten Rand: ${offenders.join(", ")}`).toEqual([]);

        const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
        expect(scrollWidth, `Dokument ist ${scrollWidth} px breit bei ${width} px Fenster`).toBeLessThanOrEqual(
          width + 1,
        );
      });
    }
  });
}

test.describe("Mobilmenü bei 380 px", () => {
  test.use({ viewport: { width: 380, height: 800 } });

  test("öffnet, schließt mit Escape und gibt den Fokus zurück", async ({ page }) => {
    await page.goto("/de");
    const toggle = page.getByRole("button", { name: /Menü/ });
    await expect(toggle).toHaveAttribute("aria-expanded", "false");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-expanded", "true");
    await expect(page.getByRole("navigation", { name: "Hauptnavigation" })).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(toggle).toHaveAttribute("aria-expanded", "false");
    await expect(toggle).toBeFocused();
  });

  test("verdeckt die Navigation im geschlossenen Zustand auch für die Tastatur", async ({ page }) => {
    await page.goto("/de");
    // `display: none` statt nur optisch versteckt — sonst tabbt man durch
    // unsichtbare Links.
    const firstNavLink = page.getByRole("navigation", { name: "Hauptnavigation" }).getByRole("link").first();
    await expect(firstNavLink).toBeHidden();
  });
});
