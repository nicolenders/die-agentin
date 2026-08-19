# docs/CUTOVER.md — Domain-Migration & Cutover (Phase 14)

`nicolenders.com` trug jahrelang den WordPress.com-Blog „Nicole's Microsoft 365 &
Azure Playground". Diese Checkliste bringt die neue Next.js-Seite live.
Reihenfolge einhalten. **STOP-Schritte** macht Nicole selbst (DNS, Azure, Entra,
Search Console).

## Ausgangslage (Stand 19.08.2026 — Nicoles Entscheidung)

**Der Altbestand ist gelöscht, nicht umgezogen.** Alle Inhalte des Blogs — Seiten,
Beiträge, Bilder — wurden entfernt, das WordPress.com-Abo gekündigt. Es wird
**nichts migriert**. Weitergeführt wird allein die Domain, mit der neuen Seite
auf Azure.

Das ändert die Aufgabe: Es geht nicht mehr darum, Rang und Backlinks
*mitzunehmen*, sondern darum, die **veralteten Einträge zügig aus dem Index zu
bekommen** und die Adressen, deren Funktion fortbesteht, sauber zu übergeben.

Damit sind mehrere Punkte dieses Dokuments gegenstandslos geworden; sie stehen
unten als erledigt bzw. entfallen markiert, damit nachvollziehbar bleibt, warum.

## Was umgesetzt ist

Die Alt-URL-Behandlung liegt als getesteter Code in `lib/seo/legacy-redirects.ts`
und greift in `proxy.ts`, vor der Sprachweiche. Zwei Klassen:

| Alt-Adresse | Antwort | Begründung |
|---|---|---|
| `/blog/`, `/tag/…`, `/category/…`, `/page/N`, Datumsarchive (`/2021/`, `/2021/05/`) | **301** → `/depeschen` | Waren Listen ihrer Beiträge. Die Liste gibt es weiterhin. |
| `/about-me/`, `/about`, `/kontakt`, `/contact`, `/author/…` | **301** → `/legende` | Über-mich-Seite → Über-mich-Seite. |
| `/speaking`, `/talks` · `/books`, `/buecher` | **301** → `/einsaetze` · `/publikationen` | Gleiche Funktion. |
| `/feed/`, `/blog/feed/`, `/comments/feed` | **301** → `/feed.xml` | Feed → Feed. |
| `/wp-sitemap*.xml` | **301** → `/sitemap.xml` | Sitemap → Sitemap. |
| Beitrags-Permalinks `/JJJJ/MM[/TT]/slug/`, auch `…/comment-page-N/` | **410 Gone** | Der Beitrag ist gelöscht. Es gibt keine Entsprechung — nur eine Liste, und eine Liste ist kein Artikel. |
| `/wp-admin`, `/wp-login.php`, `/xmlrpc.php`, `/wp-content/…`, `/wp-json`, `/trackback` | **410 Gone** | Technische Pfade ohne Gegenstück. |

**Warum 410 und nicht 301 auf die Depeschenliste.** Ein Redirect auf
`/depeschen/<slug>` wäre ein Versprechen auf einen Inhalt, den es nie geben wird
— der 301 endete dauerhaft im 404, für Google dasselbe wie ein 404, nur mit
einem Aufruf mehr davor. Und hundert Beiträge gesammelt auf eine Listenseite zu
schicken ist ein Umzug, der keiner ist; Google wertet Weiterleitungen auf einen
erkennbar anderen Inhalt als Soft-404 und behandelt sie wie 404. Bleibt die
ehrliche Antwort: 410 sagt „gelöscht, endgültig" und nimmt die Adresse am
schnellsten aus dem Index — genau das Ziel.

**Der 410 ist trotzdem eine Seite.** Für Suchmaschinen zählt nur der Statuscode,
aber hier landet auch ein Mensch mit einem Lesezeichen von 2019. Er bekommt eine
lokalisierte Seite (`lib/seo/gone-page.ts`), die sagt, was passiert ist, und auf
Depeschen, Einsätze und Startseite verweist.

**Die Ziele tragen kein Sprachpräfix.** Der alte Blog war englischsprachig;
`/de/…` als festes Ziel hätte sein Publikum auf deutsche Seiten geschickt. Der
301 zeigt auf den sprachlosen Pfad, die vorhandene Sprachweiche verhandelt
danach — und der dauerhafte Sprung bleibt cachebar (siehe `docs/ARCHITEKTUR.md`
§6.4).

Geprüft von `lib/seo/legacy-redirects.test.ts`, `lib/seo/gone-page.test.ts` und
den Alt-URL-Tests in `tests/e2e/smoke.spec.ts` — darunter achtzehn Adressen, die
nachweislich im Suchindex stehen, wortwörtlich als Fixtures.

## 14.1 URL-Inventar — **entfällt**

Sollte aus der WordPress.com-Sitemap gefüllt werden. Die gibt es nicht mehr; die
Site ist gelöscht. `data/legacy-urls.csv` bleibt als leere Vorlage liegen.

Was an Adressen bekannt ist, stammt aus dem Suchindex und steht als Testfixture
im Code. Ein **Search-Console-Export** wäre weiterhin nützlich — er zeigt, welche
Alt-URLs noch Impressionen bekommen, und ob eine davon ein Ziel verdient, das
die Tabelle noch nicht kennt. Kein Blocker für den Cutover.

## 14.2 Redirect-Map — **erledigt, anders als geplant**

Geplant war eine CSV, die zur Laufzeit geladen wird. Umgesetzt ist stattdessen
eine getestete Tabelle in TypeScript: versioniert, in genau einer Reihenfolge
gültig, und jede Zeile durch einen Test gedeckt. Eine CSV, die von keinem Code
gelesen wird, war der Zustand vorher — sie hat nichts bewirkt.

`data/redirects.csv` bleibt als Arbeitsliste für den Fall, dass später einzelne
Adressen doch ein eigenes Ziel bekommen sollen. Der Weg dahin ist ein Eintrag in
`EXACT` in `lib/seo/legacy-redirects.ts` plus eine Testzeile.

## 14.3 „Kalte Akten" — **entfällt**

Gedacht als indexierbares Archiv für migrierte, aber ungepflegte Altbeiträge.
Es wird nichts migriert, also gibt es nichts zu archivieren.

## 14.4 Cutover-Checkliste (Reihenfolge, mit Rollback-Punkt)

1. **Custom Domain + Managed Certificate** auf der Container App einrichten
   (Bicep/Portal, `infra/`). — **STOP (Nicole/Azure)**
2. **`PUBLIC_SITE_HOST`** auf `nicolenders.com` setzen (Container-App-ENV) —
   damit greifen noindex-Middleware und canonical automatisch richtig herum.
   **← Rollback-Punkt:** Zurücksetzen stellt den vorherigen Zustand her.
3. **DNS-TTL vorher senken** (z. B. auf 300 s), dann Wechsel auf die Container-App.
   — **STOP (Nicole/DNS)**
4. **Verifikation:** `robots.txt`, `sitemap.xml`, `canonical`, `hreflang`,
   Stichproben aus der Tabelle oben — je eine 301 (`/blog/`, `/about-me/`) und
   eine 410 (ein Beitrags-Permalink) —, OG-Vorschau über den LinkedIn Post
   Inspector.
5. **Search Console:** beide Properties anlegen, Sitemap einreichen,
   Adressänderung beantragen. — **STOP (Nicole/Search Console)**
6. **WordPress.com:** erledigt — Inhalte gelöscht, Abo gekündigt. Nur noch
   sicherstellen, dass die Domain dort nicht mehr gebunden ist, bevor die DNS
   umgestellt wird. — **STOP (Nicole)**
7. **410-/404-Monitoring** in den ersten Wochen (Log Analytics / Search
   Console). Erwartet wird eine Welle von 410 auf Beitrags-Permalinks — das ist
   der beabsichtigte Verlauf, nicht ein Fehler. Sie sollte über einige Wochen
   abklingen, während Google die Adressen aus dem Index nimmt. Was auffallen
   soll: ein **404** auf einer Alt-Adresse. Das hieße, die Tabelle kennt ein
   Muster nicht — dann gehört es ergänzt.

## Rollback

Solange `PUBLIC_SITE_HOST` und DNS umschaltbar sind, ist der Rollback ein
Zurücksetzen dieser beiden Werte. Zusätzlich erlaubt der Container-Apps-Revision-
Modus „multiple" einen Traffic-Switch auf die vorherige Revision (M8).

## Was Nicole vor dem Merge / Cutover tun muss

Siehe die Tabelle „Braucht Input von Nicole" in `docs/PROGRESS.md` (Anhang B).
