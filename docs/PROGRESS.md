# Fortschritt

Bei Beginn einer neuen Sitzung zuerst hier weiterlesen. Der obere Teil verfolgt
den **Umbau „Die Agentin"** (CLAUDE_TASKS.md, 14 Phasen + Anhang A); darunter
steht die ältere Bau-Historie **M0–M8** (SPEC-Meilensteine).

---

# Umbau „Die Agentin" — 14 Phasen

Branch: `claude/claude-tasks-phases-8kzdg2` (durch die Ausführungsumgebung
vorgegebener Push-Zweig; CLAUDE_TASKS.md nannte `feature/agentin-umbau`).
Ein Commit pro Phase, Format `feat(phase-NN): …`. Vor jedem Commit: `lint`,
`typecheck`, `test` grün.

## Phasen-Checkliste

- [x] **Phase 1** — Audit + Sofortmaßnahmen (`docs/AUDIT.md`)
- [x] **Phase 2** — Identitäten (Decknamen): Datenmodell + Admin
- [x] **Phase 3** — Signale + Dossiers → Depeschen (öffentlich + Admin)
- [ ] **Phase 4** — Publikationsdatum, Archiv, Redaktionsplan
- [ ] **Phase 5** — Adminbereich: Aufräumen + Ergänzungen
- [ ] **Phase 6** — GitHub-Integration
- [ ] **Phase 7** — Kontakt: LinkedIn + E-Mail
- [ ] **Phase 8** — Sessionize-Backfill
- [ ] **Phase 9** — Einsatzakte mit Belegmaterial
- [ ] **Phase 10** — Briefings/Publikationen/Ausbildung ins Narrativ
- [ ] **Phase 11** — Rechtstexte (DE + EN)
- [ ] **Phase 12** — Frontend-Redesign
- [ ] **Anhang A** — Speaker-Kit („Akte")
- [ ] **Phase 13** — SEO + Auffindbarkeit für KI-Systeme
- [ ] **Phase 14** — Domain-Migration + Cutover

## Erledigt

**Phase 1 — Audit + Sofortmaßnahmen**
- `docs/AUDIT.md` geschrieben (vollständige Bestandsaufnahme nach 1.1).
- 1.2(a) noindex nach Host: `proxy.ts` setzt `X-Robots-Tag: noindex, nofollow`
  für jeden Host ≠ `PUBLIC_SITE_HOST` (neue ENV, `lib/site.ts`), inkl.
  robots.txt/sitemap/Feeds (Matcher verbreitert).
- 1.2(b) canonical-Basis: `metadataBase` aus `siteOrigin()` (host-unabhängig).
  Per-Route-canonical + volle hreflang bewusst nach **Phase 13** verschoben.
- 1.2(c) toter CTA `/legende`: `href="#"` entfernt; Button zeigt auf Kontakt-URL
  bzw. hinterlegtes LinkedIn-Profil, sonst ausgeblendet.
- 1.2(d) Karte: untersucht — die Karte rendert echte DB-Daten, „Beispieldaten"
  war ein bedingungsloses Label; entfernt. Details in `docs/AUDIT.md` §9(d).

**Phase 2 — Identitäten (Decknamen)**
- Schema: `Identity`, `IdentityAttribute`, `Tool` (+ n:m zu Mission, Talk,
  Publication, Certification, Tool). Verboten-Felder bewusst weggelassen.
  Migration `20260811120000_identities` (offline via `migrate diff` erzeugt).
- `lib/identities.ts` (Anzeige-Fallback Deckname→Rolle, Kontrastprüfung) mit
  Unit-Tests; `lib/queries/identities.ts` (Admin + öffentlich).
- Admin: Menüpunkt „Identitäten", Übersicht (Reihenfolge ↑/↓, Veröffentlichen/
  Zurückziehen, Löschschutz bei Verknüpfung), Editor mit Tabs (Stammdaten,
  Beschreibung, Bilder, Darstellung, Werkzeuge, Merkmale, Verknüpftes, SEO),
  Validierung (Rolle DE + Akzentfarbe blockierend; Warnungen im Formular).
- Seed: 4 Identitäten (`published=false`), Decknamen leer (STOP), Beschreibungen
  als `ENTWURF`.

**Phase 3 — Depeschen (Dispatch)**
- Schema `Dispatch`/`DispatchTranslation` (+ n:m Identity/Taxonomy/Tag),
  `format` NOTE|ANALYSIS|REFERENCE|BACKSTAGE, `ChannelTask.dispatchId`.
  Migration `20260811130000_dispatches` (additiv, Post/Dossier bleiben erhalten).
- Sichtbarer Name aus **einem** i18n-Key `dispatch.name`/`namePlural`.
- Nav 8→5 (HQ · Einsätze · Identitäten · Depeschen · Legende); Publikationen/
  Ausbildung im Footer, Briefings im Einsätze-Bereich (Phase 10.1 folgt).
- Öffentlich: `/depeschen` (Format-Filter), `/depeschen/<slug>`; Identitäts-
  Seiten `/identitaeten` + `/<slug>` (3.4). HQ/Feeds/Sitemap auf Depeschen.
- 301-Redirects `/signale`,`/dossiers` → `/depeschen` in `proxy.ts`.
- Admin: Menüpunkt „Depeschen" mit Liste + Editor (Format, Status, Zeitplan
  Berlin, DE/EN, Identitäten, Fachgebiete, Quelle, Hero).
- Seed: 5 Depeschen (Format aus altem Typ abgeleitet).

**Aus Phase 3 vertagt (Folgepunkte):**
- **Daten-Migration Bestand:** Post/Dossier-Zeilen in `Dispatch` kopieren (idem-
  potentes Skript mit Dry-Run) — nötig nur für echte Bestandsdaten. Seed schreibt
  bereits direkt `Dispatch`. Post/Dossier-Tabellen bleiben (abwärtskompatibel),
  Alt-Admin (`beitraege`/`editor`/`dossiers`) aus der Nav entfernt, Routen noch da.
- KI-Rohübersetzung (Foundry) für Depeschen-EN wie beim alten Dossier-Editor.
- Zeitgesteuertes Veröffentlichen (SCHEDULED→PUBLISHED) → Phase 4.

## Offen (aus Phase 1, in späteren Phasen zu erledigen)

- Per-Route `canonical` + vollständige `hreflang` (auch Detailseiten) → Phase 13.1.
- Echte Einsatzdaten statt Seed (die Karte zeigt bis dahin Seed-Missionen) → Phase 8.
- Lokalisierte englische Slugs → Phase 13.1.

**Aus Phase 2 vertagt (Folgepunkte, kein Blocker):**
- Öffentliche Identitäts-Seiten (`/identitaeten`, `/identitaeten/<slug>`) → Phase 3.4.
- Identität ↔ Depesche (n:m) → Phase 3.
- Bildzuschnitt (1:1 / 4:5) in der Medienverwaltung — aktuell Auswahl ohne Crop.
- DE/EN als Nebeneinander statt Umschalter je Feld; Drag & Drop als ↑/↓-Buttons.
- Globale Werkzeugliste der Legende aus Identitäts-Werkzeugen speisen → Phase 12.
- TipTap-Beschreibung wird roh gespeichert; serverseitige Sanitisierung wie bei
  Posts als Härtung nachziehen.

## Braucht Input von Nicole (Anhang B)

| Was | Für Phase | Status |
|---|---|---|
| Decknamen der Identitäten (DE/EN) | 2 | offen |
| Beschreibungstexte der Identitäten | 2 | offen |
| Identitätsbilder (Portrait + Umschlag) | 12 | offen |
| Akzentfarbe je Identität bestätigen | 2 | offen |
| Ladungsfähige Anschrift | 11 | offen |
| Kontakt-E-Mail-Adresse | 11 | offen |
| GitHub-Account-URL | 6 | offen |
| Sessionize- + MVP-Profil-URLs (`sameAs`) | 13 | offen |
| Bestätigte Veranstaltungsdaten für unklare Einsätze | 8 | offen |
| Neuer LinkedIn-Datenexport (letzter war leer) | 8 | offen |
| Freigabe der `REVIEW`-Zeilen in der Redirect-Map | 14 | offen |
| `PUBLIC_SITE_HOST` produktiv auf `nicolenders.com` setzen | 14 | offen |
| Überarbeitung aller `ENTWURF`-Texte | laufend | offen |
| Bio-Entwürfe (Anhang A.1) prüfen, ⚠-Angaben bestätigen | Anhang A | offen |
| DNS-, Azure-, Search-Console-Aktionen | 14 | offen |

---

# Bau-Historie — Umsetzung M0–M8

Diese Datei wird nach jedem Meilenstein aktualisiert. Bei Beginn einer neuen
Sitzung zuerst hier weiterlesen.

## Arbeitsstand

| Meilenstein | Status |
|---|---|
| M0 — Fundament | ✅ erledigt |
| M1 — Daten und Auth | ✅ erledigt |
| M2 — Editor und Beiträge | ✅ erledigt |
| M3 — Veröffentlichung und Zeitsteuerung | ✅ erledigt |
| M4 — Dossiers und Zweisprachigkeit | ✅ erledigt |
| M5 — Einsätze und Karte | ✅ erledigt |
| M6 — Briefings, Publikationen, Ausbildung | ✅ erledigt |
| M7 — Kanäle | ✅ erledigt |
| M8 — Betrieb | ✅ erledigt |

## Branch

Entwickelt wird auf `claude/milestones-m0-m8-y84x6k` (durch die Ausführungs-
umgebung vorgegebener Push-Zweig). Die Spezifikation nannte `feat/initial-build`;
der Zweigname weicht ab, der Inhalt und die Commit-Disziplin (ein Commit pro
Meilenstein) bleiben wie beauftragt.

Vor jedem Commit sind `npm run lint`, `npm run typecheck` und `npm run test` grün.

---

## M0 — Fundament ✅

**Umgesetzt**
- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript `strict` mit
  `noUncheckedIndexedAccess`.
- SCSS + CSS Modules. Design-Tokens aus SPEC §10 in `styles/_tokens.scss` als
  CSS Custom Properties, globales Design-System in `styles/globals.scss`
  (aus dem Leser-Mockup übernommen).
- Zweisprachigkeit-Grundgerüst: `lib/i18n/` mit DE als Quellsprache, EN als
  typgeprüftes Wörterbuch. `proxy.ts` (Next-16-Nachfolger von `middleware.ts`)
  leitet `/` und pfad­lose Aufrufe auf `/de` bzw. `/en` um (Accept-Language nur
  beim ersten Besuch).
- Layout mit Kopfzeile (Marke, Navigation, Sprachumschalter, Mobilmenü),
  Fußzeile (Inhalts-/Über-/Rechts-Links) und Skip-Link.
- HQ-Startseite in DE und EN erreichbar, statisch gerendert (kein DB-Zugriff,
  SPEC §2.1).
- `Dockerfile` (mehrstufig, standalone output) und `docker-compose.yml`
  (App + SQL Server 2022 im Container).
- Prisma-Grundgerüst (`prisma/schema.prisma` mit Datasource/Generator),
  `lib/db.ts` Singleton mit Retry für den DB-Kaltstart.
- Sicherheits-Header in `next.config.ts` (HSTS, nosniff, Referrer-Policy,
  Permissions-Policy; `/admin/**` als `noindex`). CSP mit Nonce folgt in M8.
- `.env.example` mit allen Variablen aus SPEC §16 (nur Platzhalter).

**Getroffene Annahmen / Entscheidungen** (siehe `docs/decisions/0003-…`)
- Mehrere Root-Layouts über Route Groups `(site)` / `(admin)`, damit
  `<html lang>` je Sprache korrekt gesetzt wird und öffentliche Seiten statisch
  bleiben.
- Fonts: Familien (Poppins/Inter/JetBrains Mono) werden per CSS referenziert,
  mit System-Fallback. Die self-hosted `.woff2`-Dateien (SPEC §10) liegen noch
  nicht vor — **offener Punkt**, bis sie in `app/fonts/` ergänzt und via
  `next/font/local` registriert werden. Kein Google-CDN, kein Laufzeit-Request.
- Versionen zur Werkzeug-Stabilität gepinnt: Prisma 6.19, TypeScript 5.9.
  ESLint 9 mit nativer Flat-Config aus `eslint-config-next` 16.

**Offene Punkte**
- ~~Self-hosted Font-Dateien ergänzen.~~ ✅ erledigt: Poppins/Inter/JetBrains
  Mono liegen als woff2 in `app/fonts/` und werden über `next/font/local`
  (`lib/fonts.ts`) self-hosted eingebunden — keine Google-Requests, kein CDN.
- HQ-Zähler/Vorschau später aus der DB speisen (aktuell Platzhalter aus dem
  Mockup, erfundene Beispieldaten).

**Fertig-Kriterium erfüllt:** `npm run dev` und `npm run build` laufen lokal,
die Startseite ist in DE (`/de`) und EN (`/en`) erreichbar; der Container-Build
ist über den mehrstufigen `Dockerfile` definiert.

---

## M1 — Daten und Auth ✅

**Umgesetzt**
- Vollständiges Prisma-Schema (SPEC §3.1 + `Publication`, `Certification`,
  `Taxonomy`, `Tag`/`PostTag`, `Redirect`, `AuditLog`). Erste Migration
  (`prisma/migrations/…_init`) offline via `prisma migrate diff` erzeugt.
- `lib/domain.ts`: App-seitige Enums als String-Unions (SQL-Server-Anpassung,
  siehe 0004) mit `isOneOf`-Validierung. Unit-getestet.
- Auth.js v5 (`auth.ts`) mit Microsoft-Entra-ID-Provider, JWT-Session,
  Autorisierung über Allow-List von Entra Object IDs (`lib/auth/allowlist.ts`,
  unit-getestet). `requireAdmin()`/`getSessionUser()` als serverseitige Guards.
- Admin-Shell: eigene Route Group `(admin)` mit Sidebar-Navigation aus dem
  Mockup, Topbar, Anmeldeseite. Geschützter Bereich `(protected)`: nicht
  angemeldet → Anmeldung, angemeldet ohne Allow-List-Eintrag → **403**
  (`forbidden()`), passend zur M1-Abnahme.
- Dashboard liest Kennzahlen aus der DB mit „DB wird geweckt"-Fallback.
- Seed (`prisma/seed.ts`) mit erfundenen Beispieldaten (Taxonomien, Tags, 4
  Talks + Deliveries für das Ranking, 8 Missionen, 4 Beiträge, 1 Dossier,
  Publikationen, Zertifizierungen, Kanäle).

**Vorab-Aufgabe §3.2** in `docs/decisions/0002-db-auth.md` dokumentiert:
ohne echten Azure-Zugang **Fallback** (SQL-Auth, Passwort nur im Key Vault via
Secret-Referenz); der Managed-Identity-Pfad ist klar als **zu verifizieren**
markiert.

**Annahmen / Entscheidungen**
- Enums als String gegen SQL Server (0004).
- Migration offline generiert; gegen eine echte DB mit `prisma migrate dev`
  bzw. `deploy` zu verifizieren (in dieser Umgebung lief keine DB).

**Offene Punkte**
- `npm run db:migrate` + `npm run db:seed` gegen laufende DB einmal ausführen
  (docker compose). Entra-App-Registrierung + `ADMIN_OBJECT_IDS` setzen.

**Fertig-Kriterium:** Login-Fluss steht (Entra ID), `/admin` liefert ohne
Allow-List-Eintrag 403, Seed-Daten sind definiert und einspielbar.

---

## M2 — Editor und Beiträge ✅

**Umgesetzt**
- Inhaltsmodell (`lib/content/schema.ts`) mit allen Node-Typen aus SPEC §4.
- **Sanitizer** (`lib/content/sanitize.ts`): unbekannte/kontextfremde Nodes und
  Marks werden beim Speichern verworfen, Links auf `rel=noopener` gezwungen,
  `javascript:`-URLs entfernt. Umfangreich unit-getestet.
- **Renderer** (`components/content/RenderDocument.tsx`): bildet Node-Typen auf
  React-Komponenten ab, **kein** `dangerouslySetInnerHTML`. Wird von der
  öffentlichen Seite UND der Editor-Vorschau genutzt → identische Darstellung.
- TipTap-Editor mit Toolbar, DE/EN-Umschaltung, Marginalbild links/rechts pro
  Absatz, Bild/Link-Karte-Einfügen, Leservorschau mit Geräteumschalter
  (Desktop/Tablet/Smartphone) und Sprache.
- Medienbibliothek: Upload-API (`/api/admin/media`) mit Magic-Byte-Prüfung,
  Größenlimit, EXIF/GPS-Entfernung und WebP-Varianten (sharp); Alt-Text-Pflicht
  (außer dekorativ). MediaPicker-Modal im Editor.
- Öffentliche Beitragsseiten: Feed `/[locale]/signale` (Typfilter) und Detail
  `/[locale]/signale/[slug]` mit Fallback-Hinweis (SPEC §8).
- Veröffentlichungs-Prüfliste (`lib/content/checklist.ts`) und Zeit-Umrechnung
  Europe/Berlin ↔ UTC (`lib/time.ts`) — beide unit-getestet.
- Cache-Tag-Infrastruktur (`lib/cache.ts`); Publish invalidiert gezielt.
- Admin-Beitragsliste (`/admin/beitraege`) mit echten Daten.

**Annahmen / Entscheidungen**
- Medienablage lokal unter `public/uploads/`; Azure-Blob-Upload braucht
  `@azure/storage-blob` — offener Punkt (ADR 0005).
- Öffentliche Beitragsseiten vorerst `force-dynamic` mit gecachten Datenzugriffen
  (kein Build-DB verfügbar). Volles ISR-Prerendering, sobald eine Build-DB
  bereitsteht.

**Fertig-Kriterium:** Ein Beitrag mit allen Bausteinen kann erfasst, gespeichert
und in Vorschau wie öffentlicher Ansicht durch denselben Renderer identisch
dargestellt werden.

---

## M3 — Veröffentlichung und Zeitsteuerung ✅

**Umgesetzt**
- **Idempotenter Publish-Job** (`lib/publish/publish.ts`): verarbeitet
  `status = SCHEDULED AND publishAt <= now`. Die Transition läuft über
  `updateMany` mit `status: SCHEDULED` als Bedingung — eine zweite Ausführung
  ändert nichts (kein Doppelversand).
- **Job-Endpunkt** `/api/jobs/run` (POST), geschützt per `JOB_SHARED_SECRET`
  (konstantzeitiger Vergleich). Lokaler Scheduler `scripts/scheduler.mjs` ruft
  ihn alle 5 Min. auf; produktiv der Container Apps Job (Bicep in M8).
- Beim Veröffentlichen: Cache-Tags invalidiert, `ChannelTask`s je verbundenem
  Kanal eingereiht (LinkedIn PENDING, übrige MANUAL_OPEN), `AuditLog` geschrieben.
- **Feeds** `/feed.xml` und `/feed.en.xml` (Builder `lib/feed.ts`, unit-getestet,
  XML-escaped), **Sitemap** `/sitemap.xml`, **robots.txt** (Admin ausgeschlossen).
- **Vorschau-Token** (`lib/preview/token.ts`, HMAC, 7 Tage, unit-getestet) und
  Route `/preview/[token]` für eine teilbare, nicht auffindbare Vorschau; im
  Editor per Knopf erzeugbar.

**Fertig-Kriterium:** Ein für „in 5 Minuten" terminierter Beitrag (status
SCHEDULED, publishAt) geht durch den Job ohne manuellen Eingriff live; der Job
ist idempotent.

---

## M4 — Dossiers und Zweisprachigkeit ✅

**Umgesetzt**
- Öffentliche Dossier-Seiten: Übersicht nach Kategorie `/[locale]/dossiers` und
  Detail `/[locale]/dossiers/[slug]` mit TOC, Galerie und Video-Consent (über den
  gemeinsamen Renderer aus M2).
- **Foundry-Übersetzung** (`lib/translate/`): blockweise Extraktion/Rückschreibung
  (`extract.ts`), Glossar mit Fachbegriffen (`config/glossary.json`,
  `glossary.ts`), Chat-Aufruf an Microsoft Foundry (`foundry.ts`). Ergebnis ist
  ein **KI-Entwurf** (`AI_DRAFT`), der nie automatisch veröffentlicht wird.
  Extraktion, Glossar-Prompt und Parsing sind unit-getestet.
- Dossier-Editor mit DE/EN-Tabs, Galerie/Video/TOC-Einfügen (gemeinsame
  `EditorToolbar`), „EN-Rohübersetzung vorschlagen" → Entwurf → „EN bestätigen"
  (REVIEWED) → Veröffentlichen.
- Öffentliche Seiten zeigen nur `REVIEWED`-Übersetzungen; ein `AI_DRAFT` bleibt
  intern und führt zum DE-Fallback mit sichtbarem Hinweis (SPEC §8).
- Admin-Dossierliste mit Sprach-/Status-Anzeige.

**Annahmen / Entscheidungen**
- Foundry-Aufruf ist implementiert, aber ohne echten Endpunkt **zu verifizieren**
  (ohne `FOUNDRY_*` liefert er einen klaren Fehler statt eines Fake-Ergebnisses).

**Fertig-Kriterium:** Ein Dossier existiert in DE (Seed), eine EN-Rohübersetzung
kann erzeugt, bestätigt und veröffentlicht werden; der KI-Entwurf ist bis zur
Bestätigung deutlich markiert und nicht öffentlich.

---

## M5 — Einsätze und Karte ✅

**Umgesetzt**
- Weltkarte mit **d3-geo + gebündeltem world-atlas TopoJSON** (`lib/map/geo.ts`),
  als SVG gerendert — keine Tile-Provider, keine Drittanbieter-Requests.
- `WorldMap` (Client): Jahresfilter (Alle/Geplant/Jahre), Pin-Popup, Pins
  fokussierbar mit `aria-label` „Veranstaltung, Ort, Datum" und per Enter/Space
  aktivierbar (SPEC §11).
- **Immer sichtbare Tabellenalternative** unter der Karte, serverseitig gerendert
  (die Karte ist Beiwerk, die Tabelle ist der Inhalt).
- Einsatzakte `/[locale]/einsaetze/[slug]` mit zwei Textbereichen (Veranstaltung,
  Briefing) und Fotogalerie; Sprach-Fallback-Hinweis.
- Admin-Einsatzerfassung (`MissionForm`): Kartenauswahl per Klick
  (`projection.invert`), Fadenkreuz, Felder, DE/EN-Textbereiche, Briefing-
  Zuordnung (legt `TalkDelivery` an), Foto-Upload über die Medienbibliothek.

**Fertig-Kriterium:** Karte in beiden Sprachen, Pins mit Tastatur bedienbar;
Jahresfilter, Popup und Detailseite spielen zusammen; die Tabelle ist immer
sichtbar.

---

## M6 — Briefings, Publikationen, Ausbildung ✅

**Umgesetzt**
- **Ranking** (`lib/queries/ranking.ts`): reine, unit-getestete Funktion, die
  `TalkDelivery`s je Vortrag in einem frei wählbaren Zeitraum zählt und nach
  Sprache (DE/EN) aufteilt, absteigend sortiert. Datum der letzten Durchführung
  inklusive.
- Öffentlicher Vortragskatalog `/[locale]/briefings` nach Kategorie mit
  Sprachverfügbarkeit und Ranking mit Start-/Enddatum-Filter (URL-Parameter,
  ohne JS bedienbar).
- Öffentliche Publikationsseite (Bücher als Karten, weitere als Tabelle) und
  Ausbildungsseite (Zertifizierungen nach Kategorie, Mehrfachauszeichnungen über
  das `series`-Feld, z. B. MVP).
- Admin: Briefing-Verwaltung mit pflegbaren Kategorien (anlegen/umbenennen),
  neuem Briefing und Ranking-Auswertung; Publikations-/Zertifizierungs-Erfassung
  (FormData-Server-Actions, progressiv bedienbar).

**Fertig-Kriterium:** Das Ranking liefert über einen frei gewählten Zeitraum
korrekte Zahlen inklusive Sprachaufteilung (durch Unit-Tests abgesichert).

---

## M7 — Kanäle ✅

**Umgesetzt**
- **LinkedIn-OAuth** (Authorization Code Flow): Routen `authorize`/`callback`
  mit State-Schutz; Token-Austausch und Post über `/rest/posts`
  (`lib/channels/linkedin.ts`). Ausgehende Aufrufe nur an LinkedIn.
- **Automatischer Versand** (`lib/channels/process.ts`): drei Versuche mit
  exponentiellem Backoff, danach FAILED mit sichtbarer Meldung; ohne gültige
  Verbindung Rückfall auf MANUAL_OPEN. Wird vom Job-Endpunkt mitausgeführt.
- **Ein-Klick-Freigabe** für X/Instagram/Facebook (`ManualShareCard`): fertiger
  Text, „Text kopieren", „Teilen" über die Web Share API, „Erledigt".
- Kanalstatus-Seite mit Verbinden/Trennen/Aktivieren, **Ablaufwarnung** (14
  Tage, `lib/channels/expiry.ts`, unit-getestet) und Wiederholung
  fehlgeschlagener Aufgaben.
- Dashboard zeigt Kanal-Fehler und die LinkedIn-Ablaufwarnung.
- **Secret-Ablage** (`lib/secrets.ts`): Tokens nie im Repo/DB/Log; produktiv Key
  Vault (offener Punkt, ADR 0006), in der Entwicklung flüchtig im Speicher.

**Annahmen / Entscheidungen (ADR 0006)**
- Ohne echte LinkedIn-App/Key-Vault ist der reale Versand **zu verifizieren**;
  die Struktur ist vollständig und verhält sich ehrlich (Rückfall auf Ein-Klick).

**Fertig-Kriterium:** Der Versandpfad für LinkedIn ist vollständig; für die
übrigen Kanäle liegt beim Veröffentlichen eine ausführbare Ein-Klick-Aufgabe
bereit.

---

## M8 — Betrieb ✅

**Umgesetzt**
- **Bicep** (`infra/main.bicep`) für alle Ressourcen aus SPEC §14: Managed
  Identity, Log Analytics, Container Registry, Key Vault (RBAC), Storage
  (media/uploads), Azure SQL (Free, serverless, AutoPause), Container Apps
  Environment, Web-App (min 1/max 3, Multiple-Revisions), Scheduler-Job (Cron
  alle 5 Min.), Custom Domain + Managed Certificate, Budget-Alert. **Nicht
  deployt** — `what-if` vor dem Rollout (ADR 0007).
- **Azure-DevOps-Pipelines** (`azure-pipelines.yml` + `pipelines/templates/*`):
  validate (lint/typecheck/test/axe/audit) → build (Docker→ACR mit Git-SHA) →
  infra (what-if→deploy) → migrate (vor Traffic-Switch) → staging → production
  (manuelle Freigabe, Traffic 100 %). Rollback = Traffic-Switch (`promote.yml`).
- **Sicherheits-Header** inkl. CSP (strikte Quell-Policy; nonce-Umstellung als
  dokumentierter Folgeschritt, ADR 0007), X-Frame-Options, HSTS u. a.
- **Rechtstexte-Verwaltung** (`LegalDoc` + Migration): Admin unter
  `/admin/einstellungen`, öffentliche Seiten `/impressum`, `/datenschutz`,
  `/barrierefreiheit` — Struktur/Felder, **kein Rechtstext im Code**.
- **Lighthouse-CI** (`lighthouserc.json`, Budgets LCP < 2 s, CLS < 0,1,
  JS < 180 KB) und **axe-core** über 8 Hauptrouten in beiden Sprachen
  (`tests/a11y/axe.spec.ts`); E2E-Rauchtest (`tests/e2e/smoke.spec.ts`).

**Offene Punkte vor dem ersten Deployment**
- Entra-App-Registrierung, LinkedIn-App (+ LinkedIn-Seite), Azure-Subscription,
  Key-Vault-Secrets, Custom-Domain-Validierung, Rechtstexte-Inhalt.
- Bicep gegen echte API-Versionen mit `what-if` verifizieren; DB-Auth-Pfad
  (Managed Identity vs. Fallback) bestätigen.

**Fertig-Kriterium:** Der Weg „Commit auf main → validate → build → infra →
migrate → staging → production (manuelle Freigabe)" ist als Pipeline definiert;
Rollback ist als Traffic-Switch angelegt. Die Ausführung gegen Azure steht noch
aus (kein Azure-Zugang in dieser Umsetzung).

---

## Review-Härtung (Senior-Architektur- & Security-Review)

Nach dem PR durchgeführte, gezielte Verbesserungen:
- **Rate Limiting** der Upload-Route (`lib/rate-limit.ts`, unit-getestet;
  30 Uploads / 5 Min. je Nutzer) — schließt die von SPEC §9/§13 geforderte,
  bislang fehlende Absicherung. In-Memory (pro Instanz), bewusst dokumentiert.
- **CSRF-Härtung**: Same-Origin-Prüfung auf der Upload-Route (Defense-in-Depth
  zusätzlich zu SameSite=Lax des Session-Cookies), robust hinter Proxy.
- **Korrektheit**: `upsert`-Sentinel `"__new__"` in `savePost`/`saveDossier`/
  `saveMission` durch einen garantiert nicht kollidierenden Lookup-Wert ersetzt
  (kein versehentliches Überschreiben möglich).
- **Bildvarianten**: `processImage` behält für mittelgroße Bilder die volle
  Auflösung, statt nur eine kleine Stufe zu erzeugen.
- **Caching**: `Cache-Control` (s-maxage) auf den RSS-Feeds; Sitemap um Dossiers
  ergänzt.

Auditiert und für in Ordnung befunden: alle Server Actions und Admin-API-Routen
haben eine serverseitige Rollenprüfung als erste Zeile; kein
`dangerouslySetInnerHTML`; keine SSRF-Oberfläche (kein serverseitiger Abruf von
Nutzer-URLs); Preview-Token per HMAC; Job-Endpunkt mit konstantzeitigem
Secret-Vergleich; Upload-Validierung per Magic Bytes. Die CSP-`unsafe-inline`
(Script) bleibt der in ADR 0007 dokumentierte, bewusste Kompromiss (nonce
erzwingt durchgängig dynamisches Rendering); primäre XSS-Abwehr ist der
escapende Renderer.
