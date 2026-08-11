# docs/CUTOVER.md — Domain-Migration & Cutover (Phase 14)

`nicolenders.com` läuft heute als WordPress.com-Blog. Diese Checkliste bringt die
neue Next.js-Seite live, **ohne Ranking und Backlinks zu verbrennen**. Reihenfolge
einhalten. **STOP-Schritte** macht Nicole selbst (DNS, Azure, Entra, Search Console).

## Vorbereitung (durch Claude Code erledigt / vorbereitet)

- `PUBLIC_SITE_HOST` steuert noindex (proxy.ts) **und** canonical/OG-Basis
  (`lib/site.ts`). Der Cutover ist damit im Kern **eine Konfigurationsänderung**.
- Alt-URL-Inventar-Vorlage: `data/legacy-urls.csv`.
- Redirect-Map-Vorlage: `data/redirects.csv` (Heuristik unten, `REVIEW`-Zeilen
  markiert). Redirects `/signale`,`/dossiers` → `/depeschen` sind bereits aktiv
  (proxy.ts, Phase 3).

## 14.1 URL-Inventar (STOP: Datenquelle)

1. WordPress.com-Sitemap auslesen (`https://nicolenders.com/sitemap.xml` bzw.
   `wp-sitemap.xml`) → alle URLs nach `data/legacy-urls.csv` (`url,typ,titel,datum`).
2. Zusätzlich Search-Console-Export (Nicole liefert) einlesen — deckt URLs mit
   Backlinks/Impressions ab, die nicht in der Sitemap stehen.

## 14.2 Redirect-Map (STOP: Freigabe der REVIEW-Zeilen)

`data/redirects.csv` (`from,to,statusCode,note`), versioniert. Heuristik:

- `/about-me/` → `/de/legende` (301)
- Blog-Posts → `/de/depeschen/<slug>` (301), Format je nach Inhalt
- Kategorien → Identitäts- oder Fachgebietsseiten (301)
- Ohne sinnvolles Ziel: **410** statt Redirect auf die Startseite, pro Fall begründet

Alles Unsichere ist `REVIEW`. **Nicole geht die REVIEW-Zeilen durch, bevor sie
aktiviert werden.** Umsetzung dann in der Middleware (aus der CSV geladen) mit
Test-Suite: jede Zeile liefert den erwarteten Statuscode und Zielpfad, keine
Ketten, keine Schleifen. (Implementierung folgt, sobald die Map bestätigt ist.)

## 14.3 „Kalte Akten" (Archiv für Altinhalte)

Für migrierte, aber ungepflegte Beiträge (z. B. SharePoint-2013-Artikel): eigene
Route mit deutlich sichtbarem Stand/Pflege-Hinweis, **für Suchmaschinen
indexierbar** (die Backlinks sind der Punkt), aber **nicht** in den normalen
Depeschen-Listen. Identitäten trotzdem zuordnen. Eine kalte Akte ist ein
abgeschlossener Fall, keine Altlast. (Route noch nicht gebaut — braucht die
migrierten Inhalte; Folgepunkt.)

## 14.4 Cutover-Checkliste (Reihenfolge, mit Rollback-Punkt)

1. **Custom Domain + Managed Certificate** auf der Container App einrichten
   (Bicep/Portal, `infra/`). — **STOP (Nicole/Azure)**
2. **`PUBLIC_SITE_HOST`** auf `nicolenders.com` setzen (Container-App-ENV) —
   damit greifen noindex-Middleware und canonical automatisch richtig herum.
   **← Rollback-Punkt:** Zurücksetzen stellt den vorherigen Zustand her.
3. **DNS-TTL vorher senken** (z. B. auf 300 s), dann Wechsel auf die Container-App.
   — **STOP (Nicole/DNS)**
4. **Verifikation:** `robots.txt`, `sitemap.xml`, `canonical`, `hreflang`,
   Stichproben-Redirects (`/signale/*`, `/dossiers/*`, Alt-URLs), OG-Vorschau über
   den LinkedIn Post Inspector.
5. **Search Console:** beide Properties anlegen, Sitemap einreichen,
   Adressänderung beantragen. — **STOP (Nicole/Search Console)**
6. **WordPress.com:** entscheiden, wie lange das Altsystem erreichbar bleibt und
   wie es abgeschaltet wird. — **STOP (Nicole)**
7. **404-Monitoring** in den ersten Wochen (Log Analytics / Search Console).

## Rollback

Solange `PUBLIC_SITE_HOST` und DNS umschaltbar sind, ist der Rollback ein
Zurücksetzen dieser beiden Werte. Zusätzlich erlaubt der Container-Apps-Revision-
Modus „multiple" einen Traffic-Switch auf die vorherige Revision (M8).

## Was Nicole vor dem Merge / Cutover tun muss

Siehe die Tabelle „Braucht Input von Nicole" in `docs/PROGRESS.md` (Anhang B).
