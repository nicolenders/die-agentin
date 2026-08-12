# docs/AUDIT.md — Bestandsaufnahme (Phase 1.1)

Stand: 2026-08-11. Rein lesende Aufnahme des Ist-Zustands vor dem Umbau
„Die Agentin". Grundlage für die Phasen 2–14. Quelle ist der tatsächliche Code,
nicht die SPEC.

---

## 1. Technischer Rahmen

| Punkt | Befund |
|---|---|
| Framework | Next.js **16.2.12**, **App Router** (Route Groups `(site)`, `(admin)`, `(preview)`) |
| React | 19.2 |
| Sprache | TypeScript `strict` + `noUncheckedIndexedAccess` |
| Node | `>=22` (engines), lokal v22 |
| Styling | SCSS + CSS Modules, Tokens als CSS Custom Properties in `styles/_tokens.scss` |
| ORM / DB | **Prisma 6.19** + Azure SQL (`provider = "sqlserver"`) |
| Auth | **Auth.js v5** (`next-auth@5.0.0-beta.32`), Provider Microsoft Entra ID |
| Editor | TipTap 3 (`@tiptap/*`) |
| Karte | `d3-geo` + `world-atlas` (gebündeltes TopoJSON) + `topojson-client` |
| Weitere | `sharp` (Bildvarianten), `@azure/storage-blob`, `@azure/identity`, `zod` |
| Middleware | **`proxy.ts`** im Root (Next-16-Nachfolger von `middleware.ts`, exportiert `proxy`) |

Keine zusätzlichen UI-Bibliotheken, kein Utility-CSS-Framework, keine
State-Management-Bibliothek. Entspricht CLAUDE.md.

## 2. i18n

- Konfiguration `lib/i18n/config.ts`: `locales = ["de","en"]`, `defaultLocale = "de"`.
- Auflösung über `proxy.ts`: `/` und alle Pfade ohne Sprachpräfix → Redirect auf
  `/de` bzw. `/en`. `Accept-Language` nur beim ersten Besuch, danach trägt der
  Pfad die Sprache (kein Cookie).
- Übersetzungen als **typisierte Wörterbücher** in `lib/i18n/dictionaries/de.ts`
  (Quellsprache, definiert den `Dictionary`-Typ) und `en.ts`. Zugriff über
  `getDictionary(locale)` (`lib/i18n/index.ts`).
- Inhalts-Zweisprachigkeit über `*Translation`-Tabellen je Entität mit
  `state = MISSING | AI_DRAFT | REVIEWED`. Öffentliche Seiten zeigen nur
  `REVIEWED`; sonst DE-Fallback mit sichtbarem Hinweis (`pickTranslation` in
  `lib/content/pick.ts`).
- **Slugs** sind pro Sprache identisch benannt (deutsche Routen, z. B.
  `/en/einsaetze/<slug>`). **Lokalisierte englische Slugs existieren noch nicht**
  (Phase 13.1 / SPEC §8 offen).

## 3. Datenmodell (`prisma/schema.prisma`)

Entitäten: `Post` (+`PostTranslation`), `Dossier` (+`DossierTranslation`),
`Mission` (+`MissionTranslation`, `MissionPhoto`), `Talk`
(+`TalkTranslation`, `TalkDelivery`), `Publication` (+`PublicationTranslation`),
`Certification`, `Taxonomy`, `Tag`/`PostTag`, `MediaAsset`, `LegendContent`,
`HomeContent`, `FocusTopic`, `ChannelAccount`, `ChannelTask`, `Redirect`,
`LegalDoc`, `SiteSetting`, `AuditLog`.

Beobachtungen mit Relevanz für den Umbau:

- **Keine `Identity`-Entität.** Themen/Rollen sind heute implizit (Taxonomien
  `kind = DOSSIER|TALK|CERTIFICATION`, globale Werkzeugliste in `LegendContent.toolsJson`).
  → Phase 2 legt `Identity` neu an.
- **Enums als `String`** (SQL-Server-Connector kann keine nativen Prisma-Enums,
  ADR 0004). Zulässige Werte zentral in `lib/domain.ts` (`isOneOf`-Validierung).
  Statuswerte: `ContentStatus = DRAFT|SCHEDULED|PUBLISHED|ARCHIVED` existiert
  bereits; `Certification` hat aber **kein** `status`-Feld (nur `acquiredOn`,
  `validUntil`) → Phase 5.3 ergänzt `PLANNED|ACHIEVED|EXPIRED`.
- `Post.type = SIGNAL|NOTE|BACKSTAGE`, `Dossier` separat. → Phase 3 führt beide
  zu `Dispatch` zusammen.
- `Taxonomy` ist eine **eigenständige Tabelle** (kein Enum/Freitext). Wichtig für
  Phase 2.4: Fachgebiete bleiben erhalten und werden den Identitäten untergeordnet.
- Sichtbarkeitsregel (`status = PUBLISHED AND publishAt <= now`) ist **nicht**
  an einer Stelle zentralisiert; sie steckt verstreut in den `lib/queries/*`
  (z. B. `getPublishedPosts`). → Phase 4.1 zentralisiert.
- Zeit: alle `DateTime` in UTC, Anzeige `Europe/Berlin` (`lib/time.ts`).

**Migrationsmechanismus:** Prisma Migrate. 12 Migrationen unter
`prisma/migrations/*` (init + inkrementell). `migration_lock.toml` auf
`sqlserver`. Seed in `prisma/seed.ts` (erfundene Beispieldaten: u. a. 8 Missionen).
**In dieser Umgebung läuft keine DB** — Migrationen wurden bisher offline per
`prisma migrate diff` erzeugt.

## 4. Metadata / SEO-Ist

- `generateMetadata` existiert im Locale-Layout (`app/(site)/[locale]/layout.tsx`)
  und pro Seite meist nur mit `title` (aus `dict.nav.*`). **Fast alle Seiten
  teilen dieselbe generische Description** (`dict.hq.lead`); nur `/signale` hat
  eine eigene. → Phase 13.1.
- **canonical:** bislang **keine** `alternates.canonical` gesetzt. `metadataBase`
  kam aus `NEXT_PUBLIC_SITE_URL` (request-/env-abhängig). → in Phase 1.2b auf den
  kanonischen Host umgestellt; per-Route-canonical folgt in Phase 13.
- **hreflang:** nur im Layout, mit **relativen Root-Pfaden** `/de`, `/en`,
  `x-default → /de`. Für Unterseiten damit **nicht korrekt** (alle Seiten zeigen
  auf die Sprach-Wurzel). → Phase 13.1.
- **JSON-LD:** **keins vorhanden** (im gerenderten Markup kein `ld+json`).
  → Phase 13.3.
- **OG-Images:** ein statisches `app/(site)/[locale]/opengraph-image.tsx`, keine
  dynamischen per-Entität. → Phase 13.2.
- `robots.txt` (`app/robots.ts`) und `sitemap.xml` (`app/sitemap.ts`) existieren
  als Route Handler, beide auf `NEXT_PUBLIC_SITE_URL`. `sitemap` deckt statische
  Routen + veröffentlichte Posts + Dossiers ab. Feeds `/feed.xml`, `/feed.en.xml`.
- **`X-Robots-Tag` / noindex nach Host:** existierte **nicht** — Staging-URL lieferte
  überall `index, follow`. → in Phase 1.2a ergänzt.

## 5. Routen

**Öffentlich** (`app/(site)/[locale]/…`, alle datengetrieben außer Rechtstexten-Rahmen):
`/[locale]` (HQ) · `/signale` + `/signale/[slug]` · `/dossiers` + `/dossiers/[slug]`
· `/einsaetze` + `/einsaetze/[slug]` · `/briefings` · `/publikationen` ·
`/ausbildung` · `/legende` · `/impressum` · `/datenschutz` · `/barrierefreiheit`.
Maschinenlesbar: `/robots.txt`, `/sitemap.xml`, `/feed.xml`, `/feed.en.xml`,
`/opengraph-image`, `/icon.svg`, `/media/[...path]`.

**Hauptnavigation (`lib/nav.ts`): 8 Punkte** — HQ, Signale, Dossiers, Einsätze,
Briefings, Publikationen, Ausbildung, Legende. → Phase 3.3 reduziert auf 5.

**Admin** (`app/(admin)/admin/(protected)/…`, alle `noindex`): Dashboard,
`beitraege`, `dossiers`, `einsaetze`, `briefings`, `publikationen`, `ausbildung`,
`legende`, `medien`, `kanaele`, `einstellungen`, `startseite`, `struktur`,
`aufklaerung`, `mobil`, `editor`. Login unter `/admin/anmelden`.

**Briefing-Detailseiten öffentlich:** es gibt `/briefings` (Katalog), aber
**keine** `/briefings/[slug]`-Detailroute. → Phase 10.1 legt sie an.

## 6. Import-Pipeline (Phase 8)

**Im Repository nicht vorhanden.** Weder ein `build.py`-Generator noch ein
`die-agentin/import`-Schema, kein `data/`-Verzeichnis, keine `_unresolved`-Datei.
Referenziert wird beides nur in `CLAUDE_TASKS.md`. → Für Phase 8 heißt das:
Schema und Importer werden neu erstellt; die Quelldaten (MVP-Export,
Sessionize, LinkedIn) muss Nicole liefern (Anhang B). Solange keine Quelldaten
vorliegen, bleibt der Backfill ein dokumentierter STOP.

## 7. Design-Tokens

`styles/_tokens.scss` — Farben (`--ink`, `--violet`, `--magenta`, `--signal`,
`--text`, `--muted` …), Typo (Poppins/Inter/JetBrains Mono, self-hosted über
`next/font/local` in `lib/fonts.ts`, Dateien in `app/fonts/*.woff2`), Spacing,
Radius. Einzige Farbquelle. `styles/globals.scss` trägt das Designsystem aus dem
Leser-Mockup. → Phase 12 baut hierauf auf; **Identitätsfarben** kommen hinzu.

## 8. Auth / Admin-Schutz

- `auth.ts`: Auth.js v5, Entra-ID-Provider, JWT-Session (httpOnly, SameSite=Lax,
  Secure).
- Autorisierung über **Allow-List von Entra Object IDs** (`ADMIN_OBJECT_IDS`,
  `lib/auth/allowlist.ts`, unit-getestet). Nicht gelistet → 403 (`forbidden()`),
  kein Konto wird angelegt.
- Server-Guards `requireAdmin()` / `getSessionUser()` (`lib/auth/guard.ts`).
  Alle Schreibpfade sind **Server Actions** mit serverseitiger Rollenprüfung als
  erster Zeile; Admin-API-Routen (`/api/admin/*`) ebenso. Kein
  `dangerouslySetInnerHTML` auf gespeicherten Inhalten (escapender Renderer).
- Sicherheits-Header in `next.config.ts` (HSTS, nosniff, Referrer-Policy,
  Permissions-Policy, CSP; `/admin/**` als `noindex`).

---

## 9. Sofortmaßnahmen (Phase 1.2) — Befund & Umsetzung

### (a) noindex für Nicht-Zieldomain — **umgesetzt**
Vorher: kein Host-Gate, Staging lieferte überall `index, follow`. Jetzt setzt
`proxy.ts` `X-Robots-Tag: noindex, nofollow`, wenn der Request-Host ≠
`PUBLIC_SITE_HOST` (neue ENV, `lib/site.ts`). Der Matcher wurde verbreitert, damit
der Header auch `robots.txt`, `sitemap.xml` und die Feeds erreicht. Ist
`PUBLIC_SITE_HOST` leer (Entwicklung), greift kein Gate.

### (b) canonical — **teilweise umgesetzt**
`metadataBase` kommt jetzt aus `siteOrigin()` (kanonischer Host, request-
unabhängig). Damit sind OG-/canonical-Basis host-stabil. Die **per-Route
canonical-URL und vollständige hreflang** (auch für Detailseiten) folgen in
**Phase 13.1**, wie dort beauftragt.

### (c) Toter CTA auf `/legende` — **umgesetzt**
Vorher: Button „Nachricht auf LinkedIn" mit `href="#"` (Default `contactUrl = "#"`).
Jetzt: Default `contactUrl = ""`; die Seite verlinkt auf die gepflegte
Kontakt-URL, sonst auf das hinterlegte LinkedIn-Profil (`social.linkedin`).
Ist keins gesetzt, wird der Button ausgeblendet statt ins Leere zu zeigen.
Vollständige Zwei-Kanal-Lösung (LinkedIn + E-Mail) in **Phase 7**.

### (d) „Karte: Beispieldaten" — **untersucht, Befund unten, Label entfernt**

**Befund:** Die Karte rendert **keine** gesonderten Demo-Daten. `WorldMap`
bekommt die Missionen aus `getMissions(locale)` (`lib/queries/missions.ts`),
also **echte Datenbankdaten**. Der Hinweis „Karte: Beispieldaten" /
„Map: sample data" war ein **fest verdrahtetes, bedingungsloses Label** in der
Kartenlegende (`WorldMap.tsx`), gespeist aus einem statischen String in
`einsaetze/page.tsx` — **nicht** an ein „ist das Demo?"-Flag gebunden.

Dass aktuell trotzdem Beispieldaten zu sehen sind, liegt allein am **Seed**
(`prisma/seed.ts`, 8 erfundene Missionen, in M1 als „erfundene Beispieldaten"
dokumentiert), nicht an einem Demo-Modus der Karte. Sobald echte Sessionize-
Daten importiert sind (**Phase 8**), zeigt dieselbe Karte echte Einsätze.

**Konsequenz:** Das Label wäre nach dem Backfill schlicht falsch (es würde echte
Daten als „Beispieldaten" auszeichnen). Es wurde deshalb entfernt. Die
eigentliche Auflösung — echte Daten statt Seed — ist Phase 8; bis dahin enthält
die Entwicklungs-DB weiterhin die Seed-Missionen.
