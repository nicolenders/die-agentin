import { describe, it, expect } from "vitest";
import { legacyTarget } from "./legacy-redirects";

// Der Altbestand ist der teuerste Teil des Umzugs: die Backlinks des
// WordPress-Blogs hängen an diesen URLs. Jede Zeile hier ist eine Zusage an
// Google, die nicht still kaputtgehen darf.

describe("legacyTarget", () => {
  it("führt die Blog-Übersicht auf die Depeschen", () => {
    expect(legacyTarget("/blog")).toEqual({ path: "/de/depeschen", status: 301 });
    expect(legacyTarget("/blog/")).toEqual({ path: "/de/depeschen", status: 301 });
  });

  it("führt die Über-mich-Seiten auf die Legende", () => {
    for (const p of ["/about-me/", "/about", "/kontakt/", "/contact"]) {
      expect(legacyTarget(p)).toEqual({ path: "/de/legende", status: 301 });
    }
  });

  it("führt Schlagwort- und Kategorie-Archive auf die Depeschenliste", () => {
    for (const p of ["/tag/pnp/", "/category/microsoft-365/", "/kategorie/intranet", "/page/3/"]) {
      expect(legacyTarget(p)).toEqual({ path: "/de/depeschen", status: 301 });
    }
  });

  it("führt das Autorenarchiv auf die Legende", () => {
    expect(legacyTarget("/author/nicole/")).toEqual({ path: "/de/legende", status: 301 });
  });

  it("übernimmt den Slug aus Datums-Permalinks", () => {
    expect(legacyTarget("/2021/05/12/teams-live-events/")).toEqual({
      path: "/de/depeschen/teams-live-events",
      status: 301,
    });
    // Variante ohne Tagessegment.
    expect(legacyTarget("/2019/11/sharepoint-suche/")).toEqual({
      path: "/de/depeschen/sharepoint-suche",
      status: 301,
    });
  });

  it("führt WordPress-Feeds und -Sitemaps auf die neuen Pfade", () => {
    expect(legacyTarget("/feed/")).toEqual({ path: "/feed.xml", status: 301 });
    expect(legacyTarget("/blog/feed/")).toEqual({ path: "/feed.xml", status: 301 });
    expect(legacyTarget("/comments/feed")).toEqual({ path: "/feed.xml", status: 301 });
    expect(legacyTarget("/wp-sitemap.xml")).toEqual({ path: "/sitemap.xml", status: 301 });
  });

  it("meldet technische WordPress-Pfade als endgültig weg", () => {
    for (const p of ["/wp-admin/", "/wp-login.php", "/xmlrpc.php", "/wp-content/uploads/x.png"]) {
      expect(legacyTarget(p)).toEqual({ status: 410 });
    }
  });

  it("behält ein vorhandenes Sprachpräfix", () => {
    expect(legacyTarget("/en/blog/")).toEqual({ path: "/en/depeschen", status: 301 });
    expect(legacyTarget("/en/tag/pnp")).toEqual({ path: "/en/depeschen", status: 301 });
  });

  it("ignoriert Groß-/Kleinschreibung", () => {
    expect(legacyTarget("/Blog/")).toEqual({ path: "/de/depeschen", status: 301 });
  });

  it("lässt heutige Pfade unberührt", () => {
    for (const p of ["/", "/de", "/de/einsaetze", "/de/depeschen/eine-depesche", "/admin", "/api/track"]) {
      expect(legacyTarget(p)).toBeNull();
    }
  });

  it("erzeugt keine Weiterleitung auf sich selbst", () => {
    // Sonst entstünde eine Schleife: Ziel und Quelle müssen sich unterscheiden.
    for (const p of ["/blog", "/tag/x", "/about-me", "/2020/01/01/x"]) {
      const target = legacyTarget(p);
      expect(target?.path).not.toBe(p);
    }
  });
});
