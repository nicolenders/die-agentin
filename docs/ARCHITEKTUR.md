# Architekturüberblick — nicolenders.com / „Die Agentin"

Stand: 19.08.2026 · Gliederung nach arc42 (iSAQB), gekürzt auf das, was bei
einer Website dieser Größe wirklich hilft.

`docs/SPEC.md` beschreibt, **was** die Seite können soll. Dieses Dokument
beschreibt, **wie** sie gebaut ist und **warum** — und wodurch die
Qualitätsziele nachprüfbar werden. Einzelentscheidungen stehen als ADR in
`docs/decisions/`; hier steht der Rahmen, in dem sie zusammenpassen.

---

## 1. Ziele und Randbedingungen

**Der eine Satz, aus dem alles folgt:** Eine einzelne Person pflegt diese
Website nebenbei. Jede Entscheidung wird daran gemessen, ob sie den
Wartungsaufwand für einen Menschen senkt oder erhöht.

Daraus folgen die Randbedingungen:

| Randbedingung | Konsequenz |
|---|---|
| Ein Mensch, keine Bereitschaft | Kein Betrieb, der nachts Aufmerksamkeit braucht. Fehler müssen sich selbst erklären. |
| Azure-Kostenrahmen klein | Azure SQL serverless (pausiert), Container Apps mit Scale-to-Zero. Kaltstarts sind normal, nicht Ausnahme. |
| Datenschutz ohne Kompromiss | Keine Drittanbieter-Requests ohne Einwilligung, keine externen Schriftarten, keine Analytics-Dienste. |
| Zweisprachigkeit ohne Übersetzungsbüro | DE ist Quellsprache, EN optional; fehlt EN, greift ein sichtbarer Rückfall statt einer Lücke. |
| Alte Domain mit Altbestand im Index | Der Umzug von WordPress darf Rang und Backlinks nicht verbrennen. |

---

## 2. Qualitätsziele als prüfbare Szenarien

Das war die eigentliche Lücke: Die Qualitätsmerkmale standen als Adjektive in
der SPEC („barrierefrei", „sicher", „schnell"), nicht als Szenarien, an denen
sich eine Änderung messen lässt. Ein Szenario nennt Auslöser, erwartete Reaktion
und die Stelle, an der das geprüft wird — sonst ist es eine Meinung.

Priorität 1 = geht vor, wenn zwei Ziele sich widersprechen.

| Nr. | Merkmal | Prio | Szenario | Geprüft durch |
|---|---|---|---|---|
| Q1 | Barrierefreiheit | 1 | Eine Screenreader-Nutzerin ruft eine beliebige öffentliche Route auf und erreicht den Inhalt über Sprungmarke, Landmarks und eine lückenlose Überschriftenfolge. | `tests/a11y/axe.spec.ts` — 0 Verstöße mit Wirkung `critical` **oder** `serious`, plus `heading-order`, `page-has-heading-one` |
| Q2 | Sicherheit | 1 | Ein Angreifer ohne Anmeldung findet keinen Weg, Daten zu schreiben, fremdes Skript einzuschleusen oder Kosten zu verursachen. | Rollenprüfung als erste Zeile jeder Server Action; `lib/content/sanitize.ts` (Erlaubnisliste); Rate Limit auf `/api/track` und den Uploads; CSP je Antwort |
| Q3 | Auffindbarkeit | 1 | Eine seit Jahren indexierte WordPress-URL wird aufgerufen und bekommt eine eindeutige Antwort: 301 auf die Nachfolgeseite, wenn ihre Funktion fortbesteht, sonst 410 — nie einen 404 und nie eine Kette in den 404. | `lib/seo/legacy-redirects.test.ts`, `lib/seo/gone-page.test.ts` + Alt-URL-Tests in `tests/e2e/smoke.spec.ts` |
| Q4 | Wartbarkeit | 1 | Nicole ändert einen Inhalt in der Zentrale; die öffentliche Seite zeigt ihn ohne Deployment. | Server Actions + gezielte Cache-Invalidierung (`lib/cache.ts`) |
| Q5 | Betriebsfestigkeit | 2 | Die pausierte Datenbank braucht 30–60 s zum Aufwachen; die öffentliche Seite bleibt in dieser Zeit bedienbar. | `cachedQuery` vor jedem öffentlichen Zugriff; `withDbRetry` für Schreibpfade; Ausfall führt zu leeren Listen mit erklärendem Leerzustand — **außer** bei `sitemap.xml`, die dann lieber gar nichts ausliefert (siehe 6.2) |
| Q6 | Datensparsamkeit | 2 | Ein Besucher wird gezählt, ohne dass IP oder Cookie gespeichert werden. | `lib/analytics/track.ts` — Tages-Salt, SHA-256, DNT/GPC respektiert |
| Q7 | Leistung | 3 | Die Startseite ist auf einem Mobilgerät in unter 2 s sichtbar. | `lighthouserc.json` (LCP ≤ 2 s, CLS ≤ 0,1) |
| Q8 | Darstellung am Telefon | 1 | Jede öffentliche Route ist bei 380, 768 und 1440 px vollständig lesbar und lässt sich nicht seitlich schieben. | `tests/e2e/responsive.spec.ts`; axe läuft zusätzlich in Mobilbreite (`playwright.a11y.config.ts`, Projekt `mobil`) |

Widersprüche werden bewusst zugunsten der kleineren Nummer aufgelöst. Beispiel:
Die Zwei-Klick-Lösung für YouTube (Q6) kostet Leistung und einen Klick (Q7) —
das ist beabsichtigt.

---

## 3. Kontextabgrenzung

```
                    ┌──────────────────────┐
   Besucher ───────▶│                      │
                    │  Next.js 16 (App     │──── Managed Identity ──▶ Azure Blob Storage
   Nicole ─────────▶│  Router), Node 22    │                          (Bilder, Folien)
   (Zentrale)       │  Azure Container App │
                    │                      │──── Prisma ────────────▶ Azure SQL (serverless)
   Suchmaschinen ──▶│                      │
   & KI-Crawler     └──────────┬───────────┘
                               │
              Microsoft Entra ID (Anmeldung der Zentrale)
              YouTube (nur nach Einwilligung, im Browser)
              LinkedIn (ausgehend, Spiegelung von Beiträgen)
```

Bewusst **nicht** angebunden: Analytics-Dienste, Schriftart-CDNs, Karten-Tile-Server,
Kommentardienste. Die Weltkarte rechnet mit `d3-geo` gegen mitgeliefertes TopoJSON.

---

## 4. Bausteinsicht

### Ebene 1 — Route Groups

| Baustein | Verantwortung | Nicht zuständig für |
|---|---|---|
| `app/(site)/[locale]` | Öffentliche Seiten, zweisprachig, indexierbar | Schreiben |
| `app/(admin)/admin` | Zentrale, deutschsprachig, immer `noindex` | Öffentliche Darstellung |
| `app/(preview)/preview/[token]` | Geteilte Vorschau unveröffentlichter Beiträge, `noindex` | Anmeldung |
| `app/api/*` | Jobs, Uploads, OAuth-Rückläufe, Reichweiten-Beacon | Seitenrendering |
| `proxy.ts` | Sprachweiche, Alt-URLs, `noindex` auf Fremd-Hosts | Fachlogik |

### Ebene 2 — `lib/` als fachlicher Kern

`lib/` enthält, was ohne React und ohne Datenbank prüfbar ist — hier liegt die
Testabdeckung. Die Aufteilung folgt dem Zweck, nicht der Technik:

| Ordner | Inhalt |
|---|---|
| `lib/queries/` | Lesezugriffe, jeweils in `cachedQuery` gewickelt und getaggt |
| `lib/content/` | TipTap-Schema, Bereinigung, Auswahl der Übersetzung |
| `lib/seo/` | Canonical/hreflang, Descriptions, JSON-LD, Alt-URL-Tabelle |
| `lib/media/` | Typerkennung, Bildverarbeitung, Ablage, mehrteiliger Upload |
| `lib/auth/` | Allow-List und `requireAdmin()` |
| `lib/i18n/` | Wörterbücher (DE definiert den Typ), Sprachauflösung |
| `lib/http/` | Querschnitt: Herkunftsprüfung |

**Abhängigkeitsrichtung:** `app/` → `components/` → `lib/`. Rückwärts nie.
`lib/` importiert nichts aus `app/`.

---

## 5. Laufzeitsicht

### 5.1 Ein öffentlicher Seitenaufruf

1. `proxy.ts` prüft: Alt-URL? → 301/410. Kein Sprachpräfix? → 307 auf `/de` bzw. `/en`.
   Fremder Host? → `X-Robots-Tag: noindex`.
2. Server Component lädt über `lib/queries/*`. Der Cache antwortet; nur der erste
   Aufruf nach einer Invalidierung erreicht die Datenbank.
3. Gerendert wird serverseitig. `"use client"` steht nur dort, wo Interaktion es
   erzwingt (Karte, Filter, Mobilmenü, Editor).
4. `PageviewTracker` schickt einen Beacon an `/api/track`; die Antwort ist immer
   204 und blockiert nichts.

### 5.2 Nicole veröffentlicht einen Beitrag

1. Server Action, erste Zeile `requireAdmin()`.
2. `sanitizeDocument()` verwirft, was nicht in die Erlaubnisliste gehört.
3. Schreiben über Prisma, danach `invalidateTags([...])`.
4. Der nächste Aufruf der betroffenen Seite lädt frisch.

### 5.3 Terminierte Veröffentlichung

Ein Container-Apps-Job ruft alle 5 Minuten `POST /api/jobs/run` mit einem Shared
Secret (Vergleich in konstanter Zeit). Der Aufruf weckt zugleich die pausierte
Instanz.

---

## 6. Querschnittliche Konzepte

### 6.1 Sicherheit in Schichten

Sichtbarkeit im UI ist keine Autorisierung. Es gelten vier Schichten, jede
unabhängig von den anderen:

1. **Anmeldung** — Entra ID, Session als JWT im httpOnly-Cookie.
2. **Autorisierung** — Allow-List von Object IDs, geprüft als erste Zeile jeder
   schreibenden Aktion.
3. **Eingabe** — Erlaubnislisten statt Verbotslisten: Node-Typen, Link-Schemata,
   Magic Bytes beim Upload.
4. **Ausgabe** — CSP; kein `dangerouslySetInnerHTML` auf gespeicherten Inhalten;
   Medienantworten mit eigener, harter CSP und `nosniff`.

### 6.2 Umgang mit der pausierten Datenbank

Ein Ausfall der Datenbank darf die öffentliche Seite nicht umwerfen — deshalb
liefern die Query-Funktionen im Fehlerfall leere Listen, und die Seiten zeigen
ihren Leerzustand. Das hat eine wichtige Ausnahme: **`sitemap.xml`** darf so
nicht antworten. Eine Sitemap ohne die Detailseiten ist gegenüber Google keine
leere Liste, sondern die Aussage „diese Seiten gibt es nicht mehr". Sie prüft
die Erreichbarkeit deshalb vorher und liefert im Zweifel gar nichts.

### 6.3 Zweisprachigkeit

DE ist Quellsprache und definiert den `Dictionary`-Typ; EN muss ihn erfüllen —
eine fehlende Übersetzung ist damit ein Typfehler, kein Laufzeitproblem. Inhalte
tragen je Sprache einen Zustand (`MISSING | AI_DRAFT | REVIEWED`); öffentlich
erscheint nur `REVIEWED`, sonst der DE-Text mit sichtbarem Hinweis. Sichtbare
Texte gehören nie in eine Komponente — auch nicht in Einwilligungstexte.

### 6.4 Alt-URLs

`lib/seo/legacy-redirects.ts` ist die einzige Stelle für den WordPress-Bestand,
getestet und versioniert. Ohne sinnvolles Ziel gilt 410, nicht 404: 410 nimmt die
Adresse schneller aus dem Index. Slug-Umbenennungen innerhalb der neuen Seite
laufen dagegen über die Tabelle `Redirect`, gepflegt in der Zentrale und
eingelöst von der jeweiligen Detailseite.

Zwei Regeln, die dabei leicht falsch gemacht werden:

**Der 301 kommt zuerst.** Läge er hinter der Sprachweiche, zeigte der erste
Sprung auf eine Adresse, die selbst noch eine Regel braucht. Der signaltragende
Sprung gehört an den Anfang der Kette.

**Gelöscht heißt 410, nicht Redirect.** Der alte Blog ist vollständig gelöscht
(Entscheidung vom 19.08.2026), es wird nichts migriert. Deshalb bekommen
Beitrags-Permalinks einen 410: ein Redirect auf `/depeschen/<slug>` wäre ein
Versprechen auf einen Inhalt, den es nie geben wird, und alle Beiträge auf die
Listenseite zu bündeln wertet Google als Soft-404. Adressen, deren *Funktion*
fortbesteht — Übersichten, Über-mich, Feed —, behalten ihren 301; das sind echte
Entsprechungen. Der 410 liefert dabei eine lokalisierte Seite
(`lib/seo/gone-page.ts`), weil dort auch Menschen mit alten Lesezeichen landen.

**Der 301 ist sprachneutral.** Trug die Alt-URL kein Sprachpräfix, trägt das Ziel
auch keines — die vorhandene Sprachweiche verhandelt danach, wie bei jeder
sprachlosen Adresse einschließlich `/`. Das hat zwei Gründe. Inhaltlich: der alte
Blog war englischsprachig, ein hart auf `/de/…` gesetztes Ziel hätte sein
Publikum auf deutsche Seiten geschickt. Technisch: ein 301, dessen Ziel von
`Accept-Language` abhängt, ist nicht sicher cachebar — ein geteilter Cache
lieferte sonst die Sprache des ersten Besuchers an alle weiteren aus. So bleibt
der dauerhafte Sprung sprachunabhängig und die sprachabhängige Entscheidung
steckt im temporären 307 dahinter, wo sie hingehört.

---

## 7. Entwurfsentscheidungen

Chronologisch in `docs/decisions/`. Jede Nummer ist genau einmal vergeben — das
wird von `lib/docs/decisions.test.ts` geprüft, nachdem 0015 einmal doppelt
vergeben war.

---

## 8. Qualitätssicherung

| Stufe | Umfang | Wo |
|---|---|---|
| Statisch | ESLint, `tsc --noEmit` (strict, `noUncheckedIndexedAccess`) | `npm run lint`, `npm run typecheck` |
| Unit | `lib/**` mit Abdeckungsschwelle | `npm run test:coverage` |
| E2E | Öffentliche Routen, Metadaten, Alt-URLs | `npm run test:e2e` |
| Barrierefreiheit | axe über die Hauptrouten, DE und EN, Desktop **und** Mobil | `npm run test:a11y` |
| Darstellung | 380 / 768 / 1440 px, kein Querscrollen, Mobilmenü | `npm run test:e2e` |
| Abhängigkeiten | `npm audit --audit-level=high` (sichtbar, siehe ADR 0021) | CI |

Die Browsertests laufen in CI gegen den Produktionsbuild, nicht gegen den
Entwicklungsserver — sonst prüfen sie eine Ausgabe, die so nie ausgeliefert wird.

---

## 9. Risiken und technische Schulden

| Risiko | Wirkung | Umgang |
|---|---|---|
| Testabdeckung unter der Schwelle aus SPEC §17 | Regressionen in ungeprüften `lib/queries/*` | Schwelle steht jetzt in CI und wirkt als Sperrklinke: sie darf nur steigen. Ziel 70 % bleibt. |
| `script-src 'unsafe-inline'` in der CSP | XSS wäre nicht durch die CSP gebremst | Bewusst, weil die nonce-basierte Variante dynamisches Rendering aller Seiten erzwingt (ADR 0007). Ausgeglichen durch Erlaubnislisten und den Verzicht auf `dangerouslySetInnerHTML`. |
| Rate Limit nur je Instanz (im Speicher) | Kein globales Limit bei mehreren Replicas | Bewusst: ein geteilter Speicher (Redis) wäre ein weiterer Dienst zum Pflegen. Bremst entlaufene Clients, nicht verteilte Angriffe. |
| High-Findings in `prisma` und `geoip-lite` nur per Major-Sprung behebbar | Bekannte Schwachstellen im Baum | ADR 0021, sichtbar in CI |
| Migrationen beim Start jeder Instanz | Bei mehreren Replicas ein Wettlauf; schlägt es fehl, läuft die App mit altem Schema weiter | `migrate deploy` ist idempotent; der Fehlschlag ist jetzt am Zustandsendpunkt sichtbar (`/api/health/db`) statt nur im Log |

---

## 10. Glossar

| Begriff | Bedeutung |
|---|---|
| **Depesche** | Beitrag — Meldung, Einordnung oder Nachschlagewerk (früher Signal/Dossier) |
| **Einsatz** | Auftritt bei einer Veranstaltung |
| **Briefing** | Vortragsformat, das mehrfach gehalten wird |
| **Identität** | Fachgebiet/Rolle, unter der Inhalte gebündelt werden |
| **Legende** | Die Über-mich-Seite |
| **Akte** | Speaker-Kit: Bios, Fotos, Fakten |
| **Zentrale** | Der Redaktionsbereich unter `/admin` |
