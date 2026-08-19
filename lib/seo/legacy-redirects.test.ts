import { describe, it, expect } from "vitest";
import { legacyTarget } from "./legacy-redirects";

// Der Altbestand ist der teuerste Teil des Umzugs: die Backlinks des
// WordPress-Blogs hängen an diesen URLs. Jede Zeile hier ist eine Zusage an
// Google, die nicht still kaputtgehen darf.

describe("legacyTarget", () => {
  it("führt die Blog-Übersicht auf die Depeschen", () => {
    expect(legacyTarget("/blog")).toEqual({ path: "/depeschen", status: 301 });
    expect(legacyTarget("/blog/")).toEqual({ path: "/depeschen", status: 301 });
  });

  it("führt die Über-mich-Seiten auf die Legende", () => {
    for (const p of ["/about-me/", "/about", "/kontakt/", "/contact"]) {
      expect(legacyTarget(p)).toEqual({ path: "/legende", status: 301 });
    }
  });

  it("führt Schlagwort- und Kategorie-Archive auf die Depeschenliste", () => {
    for (const p of ["/tag/pnp/", "/category/microsoft-365/", "/kategorie/intranet", "/page/3/"]) {
      expect(legacyTarget(p)).toEqual({ path: "/depeschen", status: 301 });
    }
  });

  it("führt das Autorenarchiv auf die Legende", () => {
    expect(legacyTarget("/author/nicole/")).toEqual({ path: "/legende", status: 301 });
  });

  it("meldet gelöschte Beiträge als endgültig weg", () => {
    // Der Blog ist vollständig gelöscht, nichts wird migriert. Ein Redirect auf
    // `/depeschen/<slug>` wäre ein Versprechen auf einen Inhalt, den es nie
    // geben wird.
    expect(legacyTarget("/2021/05/12/teams-live-events/")).toEqual({ status: 410 });
    // Variante ohne Tagessegment.
    expect(legacyTarget("/2019/11/sharepoint-suche/")).toEqual({ status: 410 });
    // Mit angehängter Kommentarseite.
    expect(legacyTarget("/2021/01/10/channel-calendar/comment-page-2/")).toEqual({ status: 410 });
  });

  it("führt Datumsarchive weiterhin auf die Liste — sie waren Übersichten", () => {
    for (const p of ["/2021/", "/2021/05/", "/2021/05/12/"]) {
      expect(legacyTarget(p), p).toEqual({ path: "/depeschen", status: 301 });
    }
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
    expect(legacyTarget("/de/blog/")).toEqual({ path: "/de/depeschen", status: 301 });
  });

  it("ignoriert Groß-/Kleinschreibung", () => {
    expect(legacyTarget("/Blog/")).toEqual({ path: "/depeschen", status: 301 });
  });

  it("lässt heutige Pfade unberührt", () => {
    for (const p of ["/", "/de", "/de/einsaetze", "/de/depeschen/eine-depesche", "/admin", "/api/track", "/depeschen", "/legende"]) {
      expect(legacyTarget(p)).toBeNull();
    }
  });

  it("erzeugt keine Weiterleitung auf sich selbst", () => {
    // Sonst entstünde eine Schleife: Ziel und Quelle müssen sich unterscheiden.
    for (const p of ["/blog", "/tag/x", "/about-me", "/2020/01/"]) {
      const target = legacyTarget(p);
      expect(target?.path).not.toBe(p);
    }
  });
});

// Diese Adressen stehen nachweislich im Suchmaschinen-Index der Domain (über
// eine Websuche ermittelt, weil die Live-Site aus der Ausführungsumgebung nicht
// erreichbar war). Keine ausgedachten Beispiele — genau diese Zeichenketten
// müssen ankommen.
describe("Belegte Adressen aus dem Index", () => {
  const BELEGT: Array<[string, string]> = [
    ["/blog/", "/depeschen"],
    ["/about-me/", "/legende"],
    ["/category/collaboration/", "/depeschen"],
    ["/category/mixed-reality/", "/depeschen"],
    ["/category/microsoft-365/", "/depeschen"],
    ["/tag/modernworkplace/", "/depeschen"],
    ["/tag/microsoftteams/", "/depeschen"],
    ["/tag/learningpathways/", "/depeschen"],
    ["/tag/teamwork/", "/depeschen"],
    ["/tag/deutsch/", "/depeschen"],
    ["/tag/pnp/", "/depeschen"],
    ["/tag/intranet/", "/depeschen"],
    ["/tag/community/", "/depeschen"],
  ];

  for (const [from, to] of BELEGT) {
    it(`${from} → ${to}`, () => {
      expect(legacyTarget(from)).toEqual({ path: to, status: 301 });
    });
  }

  // Dieselbe Herkunft, andere Behandlung: Diese Beiträge sind gelöscht.
  const BELEGT_GELOESCHT = [
    "/2019/11/10/use-cases-for-private-channels-in-microsoft-teams/",
    "/2019/12/01/org-wide-teams-and-their-purpose/",
    "/2020/01/02/improve-your-teamwork-with-a-collaboration-platform-my-checklist-for-a-tool-service-selection/",
    // WordPress hängt an Beiträge mit vielen Kommentaren eigene Seiten an; auch
    // die stehen im Index.
    "/2021/01/10/channel-calendar-app-in-microsoft-teams/comment-page-1/",
  ];

  for (const from of BELEGT_GELOESCHT) {
    it(`${from} → 410`, () => {
      expect(legacyTarget(from)).toEqual({ status: 410 });
    });
  }
});
