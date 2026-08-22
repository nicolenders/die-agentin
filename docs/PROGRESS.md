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
- [x] **Phase 4** — Publikationsdatum, Archiv, Redaktionsplan
- [x] **Phase 5** — Adminbereich: Aufräumen + Ergänzungen
- [x] **Phase 6** — GitHub-Integration
- [x] **Phase 7** — Kontakt: LinkedIn + E-Mail
- [~] **Phase 8** — Sessionize-Backfill (Infrastruktur fertig; Daten = STOP)
- [x] **Phase 9** — Einsatzakte mit Belegmaterial
- [~] **Phase 10** — Narrativ (10.4 fertig; Briefing-Detailseiten offen)
- [x] **Phase 11** — Rechtstexte (DE + EN)
- [~] **Phase 12** — Frontend-Redesign (Struktur/Inhalt; Motion vertagt)
- [x] **Anhang A** — Speaker-Kit („Akte") (Kern; Testimonials vertagt)
- [~] **Phase 13** — SEO (JSON-LD/robots/llms.txt fertig; OG-Images vertagt)
- [~] **Phase 14** — Cutover (Doku + Vorlagen; Aktivierung = STOP/Nicole)

## Review & Verifikation (Migration + Pipeline)

Nach dem Umbau gezielt geprüft — gegen eine **echte SQL-Server-2022-Instanz**
(Docker) und die vollständige Pipeline. Gefundene Probleme behoben:

- **`migration_lock.toml`**: `provider = "sqlserver"` → **`mssql`**. `prisma
  migrate deploy` (Pipeline-Schritt) brach sonst mit **P3019** ab (der Engine
  vergleicht den Connector-Namen `mssql` gegen den Lock). Verifiziert: alle 17
  Migrationen laufen jetzt durch.
- **Migration `20260809140000_records_kind_focus` war kaputt** (Bestand, nie
  gegen echte DB gelaufen): `UPDATE … SET [kind]` referenziert eine im selben
  Batch erst per `ALTER … ADD [kind]` angelegte Spalte → SQL-Server-Fehler 207
  „Invalid column name". Behoben mit dynamischem SQL (`EXEC(N'…')`), das erst zur
  Laufzeit kompiliert. Verifiziert.
- **`ChannelTask.postId` nullable machen** (meine Dispatch-Migration): auf echtem
  SQL Server problemlos, kein FK-Drop nötig. Verifiziert.
- **`/admin` war unerreichbar (kritische Regression aus Phase 1):** der
  verbreiterte Middleware-Matcher ließ `proxy.ts` auch auf `/admin` laufen, und
  der Ausschluss-Regex `…(api|admin|_next)\/…` verlangte einen Schrägstrich —
  der exakte Pfad `/admin` wurde deshalb fälschlich auf `/de/admin` umgeleitet
  (404). Dasselbe traf `/preview/*`. Behoben: Routing-Entscheidungen nach
  `lib/routing.ts` ausgelagert (mit `(\/|$)`-Grenze, zusätzlich `preview`/`media`
  ausgeschlossen) und mit Unit-Tests abgesichert. Verifiziert gegen die laufende
  App: `/admin` → 307 → `/admin/anmelden`; `/de/signale` → 301 → `/de/depeschen`.
  **Der Adminbereich liegt unter `/admin` (nicht `/de/admin`).**
- **UI-Konsistenz:** `IdentityAttributesField` nutzte undefinierte Klassen
  `field`/`field-label` (unstyled) → auf die Admin-Konvention `.f` umgestellt.
  Redundante, undefinierte Klasse `cardlink` entfernt (`.card:hover` liefert die
  Anhebung bereits).
- **a11y (axe):** `aria-pressed` auf Link-Chips (`/depeschen`, `/einsaetze`) ist
  ungültig (Rolle „link") → `aria-current` (CSS stylt beide identisch). axe-Suite
  gegen die laufende App: **18/18 grün, 0 kritische Verstöße**.
- **Tests aktualisiert:** a11y- und E2E-Routenlisten auf den neuen Stand
  (Depeschen/Identitäten/Akte statt Signale/Dossiers) + Redirect-Assertions;
  E2E-`locale: "de-DE"`, damit `/` deterministisch auf `/de` leitet. E2E-Smoke
  **12/12 grün**.

Verifizierter Gesamtstand: `typecheck`, `lint`, **120 Unit-Tests**, **18 axe**,
**12 E2E**, **`next build`**, `migrate deploy` (17 Migrationen) und `db:seed`
laufen alle grün; alle öffentlichen Routen liefern 200, `/de/signale` → 301 →
`/de/depeschen`, JSON-LD im HTML.

**Hinweis (nicht blockierend):** `npm audit` meldet 4 High-CVEs in `sharp`
(transitiv über Next). Der Pipeline-Schritt ist `continueOnError: true`
(„Hinweis, blockt nicht"), und der Auto-Fix erzwingt `next@16.3.0` — eine
Stack-Änderung, die laut `CLAUDE.md` nicht ohne Rückfrage erfolgt. Bewusst
offen gelassen; Nicole entscheidet über das Dependency-Update.

---

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

**Phase 4 — Status, Archiv, Redaktionsplan**
- Sichtbarkeitsregel zentral in `lib/visibility.ts` (`isPublic`, `publishedWhere`,
  `isPlanned`) mit Unit-Tests. Regel: PUBLISHED UND publishedAt ≤ now.
- Publish-Job (`lib/publish`) verarbeitet jetzt auch terminierte Depeschen
  (SCHEDULED→PUBLISHED, idempotent) und invalidiert die Depeschen-Cache-Tags —
  damit greift die Zeitsteuerung trotz Caching (Latenz ≤ revalidate 1 h bzw.
  sofort beim Job-Lauf; dokumentiert).
- Admin „Archiv" (Tabs Depeschen/Einsätze): Wiederherstellen (→DRAFT),
  endgültig löschen mit Bestätigung.
- Admin „Redaktionsplan": Tabelle (sortier-/filterbar, Auswahl in der URL) +
  Monatskalender als CSS-Grid (keine Kalenderbibliothek), eingefärbt nach
  Identitätsfarbe, „+n weitere" bei Überlauf.

**Aus Phase 4 vertagt:**
- Talk/Publication haben noch kein Status-/`ARCHIVED`-Feld → Archiv-/Plan-Tabs
  dafür fehlen (Folgeschritt: Statusfeld ergänzen). Missionen nutzen `contentStatus`.
- Drag & Drop im Kalender (nur Anzeige umgesetzt, wie in 4.3 erlaubt).
- Admin-Vorschau-Banner für nicht sichtbare Detail-URLs (Teilen via bestehendem
  `/preview/[token]`).

**Phase 5 — Admin aufräumen + ergänzen**
- 5.1 Briefings-Admin auf Tabs (Neues Briefing · Alle · Auswertung · Kategorien
  · Zielgruppen), aktiver Tab in der URL (`?tab=`), server-gerendert.
- 5.2 **STOP:** „Zeitplan & Kanäle" NICHT gelöscht — die Seite enthält
  einzigartige Funktionen (LinkedIn-OAuth, Kanal-Status, Task-Retry), nicht nur
  Social-Profile. `TODO(nicole)` in `lib/admin-nav.ts`; Nicole entscheidet.
- 5.3 Zertifizierungs-Status PLANNED|ACHIEVED|EXPIRED + `plannedFor`. Migration
  `20260811140000_cert_status`. Öffentlicher Abschnitt „In Ausbildung · laufende
  Vorbereitung" (geplante Zerts + Fokus-Themen), klar von erworbenen getrennt,
  ohne Datum/Badge. Admin-Formulare + Seed-Beispiel ergänzt.

**Aus Phase 5 vertagt:**
- „In Ausbildung" zieht Themen aus `FocusTopic` (bestehendes Radar). Der Plan
  nennt die Identitäts-`focus`-Felder — Zusammenführung als Folgeschritt.

**Phase 6 — GitHub**
- 6.1 GitHub als Social-Kanal (`SOCIAL_PLATFORMS` + Inline-SVG-Icon) — erscheint
  automatisch im Footer, in der Legende („Folgen & vernetzen") und im
  Einstellungen-Admin. GitHub-URL ist Nicole-Input (Anhang B).
- 6.2 Publikationstyp `REPOSITORY` (+ `repoUrl`, `language`; Beschreibung
  lokalisiert über `PublicationTranslation.description`). Migration
  `20260811150000_publication_repository`. Öffentlicher Abschnitt „Repositories"
  nach Büchern & Kursen; Admin-Anlageformular. Keine Live-GitHub-API (wie gefordert).

**Aus Phase 6 vertagt:** Repository-Felder auch im Publikations-Bearbeiten-
Formular (aktuell nur im Anlageformular); EN-Beschreibung für Repositories.

**Phase 7 — Kontakt**
- 7.1 `contactEmail` + `postalAddress` als SiteSettings, an einer Stelle im
  Admin (Einstellungen) gepflegt, gecacht (`getContactInfo`). Warnung im Admin,
  wenn E-Mail/Anschrift fehlen. Impressum (Phase 11) liest dieselben Felder.
- 7.2 Legende-Kontakt als zwei gleichwertige Kanäle: LinkedIn (Button) + E-Mail
  (`mailto:`, JS-frei erreichbar). Fällt die E-Mail weg, wird ihr Button
  ausgeblendet. Text als `ENTWURF` in den Legende-Defaults.
- STOP-Werte (Anschrift, E-Mail) trägt Nicole ein (Anhang B).

**Phase 8 — Backfill (teilweise: Infrastruktur fertig, Daten offen)**
- 8.1 Befund: Alt-Pipeline (`build.py`, `die-agentin/import`) existierte NICHT
  im Repo. Neu angelegt.
- 8.2 Importer `scripts/import.ts` (`npm run db:import`): idempotenter Upsert
  über Import-Slug, `--dry-run` mit Diff, zod-Validierung, Abschlussreport.
- 8.3 Datenqualität (getestet: `lib/import/online.ts`): Online→Antarktis-Ring;
  Einreichungsdatum (`dateSource:"submission"`) und fehlendes Datum → DRAFT +
  Review-Liste (nie still als Eventdatum); Identitäten/Topics nur wenn angegeben.
- 8.4 Einsätze-Ansicht: server-seitiger Jahresfilter (`lib/missions.ts`, getestet),
  Standard „aktuelles Jahr + geplant", Auswahl in der URL, „Alle Jahre";
  Kennzahl-Hinweis „x von y". WorldMap-Client-Jahresfilter entfernt (jetzt Server).
- 8.5 `docs/IMPORT.md` (Schema v1, Ablauf, Regeln, STOP).
- **STOP:** Quelldaten (MVP-Export, Sessionize mit bestätigten Terminen, neuer
  LinkedIn-Export) liefert Nicole; Importer noch nicht gegen echte DB gelaufen.

**Phase 9 — Einsatzakte mit Belegmaterial**
- 9.1 Mission um optionale Felder erweitert (slidesUrl/-platform, recordingUrl,
  recapDe/En, feedbackScore/-source, coSpeakers, sessionType, sessionLanguage,
  attendeeCount). Migration `20260811160000_mission_material`. Altdaten brechen
  nicht (alles optional). Identitäten↔Mission bereits aus Phase 2.
- 9.2 Detailseite in der Reihenfolge Fakten → Identität(en) → Briefing → Material
  (Folien/Video/Fotos) → Recap. Leere Sektionen entfallen. Video über
  `VideoConsent` (youtube-nocookie, Zwei-Klick; `lib/video.ts` getestet).
- `docs/DATENVERARBEITUNG.md` mit Video-/Karten-Notiz angelegt (für Phase 11.1).
- Admin: „Belegmaterial"-Karte im MissionForm (Folien, Aufzeichnung, Art,
  Teilnehmende, Feedback, Co-Speaker).

**Aus Phase 9 vertagt:** Recap-Rich-Text-Editor im MissionForm (Feld/Anzeige
stehen; Eingabe folgt). Foto-Bildunterschrift/Credit je Foto (aktuell Alt/Credit
des Assets).

**Phase 10 — Narrativ (teilweise)**
- 10.4 Kennzahlen: **Identitäten** als Kennzahl ergänzt; Singular/Plural
  lokalisiert („1 Einsatz" statt „1 Einsätze"). Zähler getaggt mit Identitätsliste.
- 10.1 Briefings aus der Hauptnav (schon Phase 3) + Einstieg von der Einsätze-
  Seite („Was ich mitbringe: Briefings"). Identität↔Briefing ist über den
  Identitäts-Editor pflegbar (Phase 2).
- 10.2/10.3: Identitätszuordnung von Publikationen/Zertifizierungen über den
  Identitäts-Editor; Reihenfolge Publikationen (Bücher→Kurse→Repos→…) aus Phase 6;
  „In Ausbildung" oben aus Phase 5.3.

**Aus Phase 10 vertagt / STOP:**
- **Briefing-Detailseiten** (`/briefings/<slug>`): Talks haben keinen Slug —
  braucht ein Slug-Feld o. Ä.; als Folgeschritt angelegt. Identitätsfilter auf
  der Briefings-Übersicht ebenso.
- **Linkkonsistenz Publikationen (Rheinwerk vs. Amazon):** manuell — Nicole
  vereinheitlicht auf die Verlagsseite, wo vorhanden (STOP, Anhang B).

**Phase 11 — Rechtstexte**
- 11.1 `docs/DATENVERARBEITUNG.md` vollständig (Hosting West Europe, Server-Logs
  30 Tage, Auth nur Admin, Fonts self-hosted, keine Analytics, Karte ohne
  Tile-Provider bestätigt, Cookies nur Admin → **kein Consent-Banner**).
- 11.2 Impressum: § 5 DDG + § 18 Abs. 2 MStV, Name/Anschrift/E-Mail/LinkedIn aus
  den Einstellungen (`<address>`), **keine USt-IdNr.** (Privatperson). Freie
  Blöcke (Haftung, Links, Urheberrecht, Streitschlichtung ohne Pflicht-Suggestion)
  vollständig DE+EN. Warnhinweis, wenn Anschrift/E-Mail fehlen.
- 11.3 Datenschutzerklärung vollständig DE+EN, auf Basis der Inventur (keine
  Textbausteine für ungenutzte Dienste).
- 11.4 Barrierefreiheit als **freiwillige Selbstverpflichtung** (nicht BFSG/BITV),
  WCAG 2.1 AA, bekannte Einschränkung Karte + Tabellen-Alternative.
- 11.5 Alle drei als `LegalDoc` geseedet (im Admin per TipTap pflegbar), im Footer
  verlinkt; Impressum zieht die Einstellungsfelder dynamisch.
- **Keine Rechtsberatung** — vor dem Cutover fachkundig prüfen lassen.
- **STOP:** Anschrift + E-Mail trägt Nicole ein (Einstellungen → Kontakt).

**Phase 12 — Redesign (Struktur/Inhalt fertig, Motion vertagt)**
- 12.0 Keine SPA (App Router beibehalten) — kein Widerspruch zu Phase 13, kein STOP.
- 12.1 `docs/DESIGN.md` (Palette, Typo, Signature = Umschlag, Wireframes,
  Anti-Beliebigkeit-Prüfung).
- 12.2 Startseite: „Die Agentin"-Doppeldeutigkeit (ENTWURF) + „Die Identitäten"
  (Umschlag-Karten, Identitätsfarbe als Rand) + Legende-Kurzlink. Kennzahlen inkl.
  Identitäten (Phase 10.4).
- 12.3 Legende: „Warum Agentin" (Doppeldeutigkeit, 3 Absätze, ENTWURF), „Die
  Identitäten" (Umschläge), „Codebuch" (Glossar der Sektionsnamen). Werkzeuge +
  Säulen bleiben hier.
- 12.4 `docs/BILDPROMPTS.md`: Umschlag-Basisprompt + Portrait-Kurzvariante + Objekte/
  Farbe je Identität. (Bilder erzeugt/lädt Nicole, Anhang B.)

**Aus Phase 12 vertagt (Folgepunkte):**
- 12.5 Motion: View Transitions (Übersicht→Detail, Element-Kontinuität),
  Umschlag-Hover/Scroll-Reveal, Karten-Pins nach Identitätsfarbe. `prefers-
  reduced-motion` wird global respektiert (M0).
- 12.6 Lighthouse/axe-Lauf (in dieser Umgebung nicht ausführbar; CI vorhanden).

**Anhang A — Speaker-Kit „Akte"**
- Route `/[locale]/akte` (Name „Akte", alt „Ausrüstung" — TODO(nicole)).
- Bios in drei Längen (50/150/400) DE+EN aus A.1, als `ENTWURF` geseedet
  (SiteSettings `bio.<len>.<locale>`), im Admin pflegbar; Copy-to-Clipboard
  (`components/CopyButton.tsx`). ⚠-Angaben im Text belassen (TODO(nicole)).
- Fakten live aus der DB (MVP/Bücher/Zert/Einsätze/Identitäten) — veralten nicht.
- Fachgebiete/Identitäten verlinkt, Kontakt-CTA (LinkedIn + E-Mail). Footer- +
  Sitemap-Eintrag.

**Aus Anhang A vertagt (Folgepunkte):** Referenzen/Testimonials als eigene
Entität mit Freigabe-Flag; Pressefotos (Web/Druck) mit Credit/Nutzungshinweis;
technische Anforderungen als Rich Text; lokalisierter EN-Slug `/kit` (Phase 13);
Admin-Pflege der Bios (aktuell Seed/SiteSetting).

**Phase 13 — SEO (teilweise)**
- 13.3 **JSON-LD** (`lib/seo/jsonld.ts`, `components/JsonLd.tsx`): Person +
  WebSite site-weit im Layout (`@graph`, stabile `@id`), BlogPosting je Depesche,
  Event je Einsatz (VirtualLocation für Online), BreadcrumbList auf Detailseiten.
  Person: sameAs aus Social-Profilen, knowsAbout aus Identitäten, award aus MVP/
  Auszeichnungen (`lib/queries/person.ts`). Nur sichtbare Daten.
- 13.4 **llms.txt** (`/llms.txt`, aus Entity-Daten generiert), **robots.txt**
  (kanonischer Host, KI-Crawler ausdrücklich erlaubt — GPTBot/ClaudeBot/… nicht
  gesperrt). RSS im Footer verlinkt. Fakten als Text auf /akte + Legende.
- Titel bereits konsistent `%s · DIE AGENTIN` (Layout-Template).

**Aus Phase 13 vertagt (Folgepunkte):**
- 13.1 Per-Route eigene Descriptions (DE/EN) für alle statischen Seiten;
  vollständige per-Route canonical + hreflang inkl. Detailseiten; **lokalisierte
  EN-Slugs** (`/en/missions` …) mit Redirects (zweites Slug-Set).
- 13.2 **Dynamische OG-Images** (`next/og`) je Entitätstyp.
- Weitere JSON-LD-Typen (Book/Course/SoftwareSourceCode) auf /publikationen.
- 13.5 Abschlussbericht (Beispiel-URLs + JSON-LD) — nach OG/Slugs.

**Phase 14 — Cutover (Doku + Vorlagen)**
- `docs/CUTOVER.md`: vollständige Checkliste mit Reihenfolge, Rollback-Punkt und
  STOP-Markierungen (DNS, Azure, Entra, Search Console = Nicole).
- Vorlagen `data/legacy-urls.csv`, `data/redirects.csv` (Heuristik + REVIEW).
  Redirects `/signale`,`/dossiers` → `/depeschen` bereits aktiv (proxy.ts).
- 14.5 Abschlussliste unten (`TODO(nicole)`, `ENTWURF`, leere Pflichtfelder).

**Aus Phase 14 vertagt / STOP:**
- URL-Inventar + Redirect-Map mit echten Daten (WordPress-Sitemap +
  Search-Console-Export liefert Nicole); CSV-getriebene Redirect-Middleware +
  Test-Suite folgt nach Freigabe der REVIEW-Zeilen.
- „Kalte Akten"-Route (braucht migrierte Altinhalte).
- DNS/Azure/Entra/Search-Console-Aktionen (STOP, Nicole).

---

## Nachträge (nach den 14 Phasen)

**Öffentliche Seite am Telefon** (ADR `docs/decisions/0014-tabellen-am-telefon.md`)
- Tabellenzeile wird unter 640 px zur Karte (`table.stack` + `data-label`),
  inklusive expliziter ARIA-Rollen, weil `display: block` die Tabellenrolle
  nimmt. Betrifft Einsatzliste, Identitätsseite, Briefing-Einsätze und die
  weiteren Veröffentlichungen.
- Einsätze am Telefon: nur ab heute (`isUpcoming` + `berlinDay`, beides
  unit-getestet), Filterband entfällt, Hinweiszeile statt stillem Kürzen.
  Server rendert weiterhin alles → SEO unverändert.
- Einsatz-Popup am Telefon bildschirmfüllend, mit Escape, Daumen-Schließfläche
  und stehender Seite darunter.
- Briefing-Tabelle „Gehalten bei": Sprachspalte nur am großen Bildschirm.

**Einsatzmaske in Registern, Folien am Briefing** (ADR 0013 §8)
- Erfassungsmaske eines Einsatzes in vier Registern: Einsatzdaten · Texte ·
  Bilder · Belegmaterial (ohne den Zusatz „(Phase 9)"). `FormTabs` hält alle
  Panels im DOM; gespeichert wird unabhängig vom sichtbaren Register.
- Neues Modell `TalkSlideDeck` (Briefing × Sprache, Migration
  `20260817200000_talk_slide_decks`, additiv). Upload am Briefing über
  `/api/admin/briefings/slides` — derselbe geprüfte Weg wie bei den Vorlagen,
  jetzt gemeinsam in `lib/media/chunked-upload.ts`.
- Im Briefing steht die Vorlage zum Anfangen bereit (aus dem Einsatz hierher
  verschoben); der Einsatz bietet nur noch den Foliensatz des zugeordneten
  Briefings in seiner Vortragssprache an (`pickForLanguage`, unit-getestet).

**Foliensvorlagen für Einsätze** (ADR `docs/decisions/0013-foliensvorlagen.md`)
- Je eine PowerPoint-Vorlage DE und EN, gepflegt unter **Medien → Vorlagen**
  (`/admin/medien?tab=vorlagen`). Ablage als `SiteSetting`
  (`slideTemplate.<locale>.path` / `.fileName`) — keine Migration.
- Upload über `/api/admin/missions/slide-template` (Admin, Same-Origin,
  rate-limitiert, Typprüfung über den Inhalt: ZIP + `ppt/presentation.xml`,
  altes `.ppt` mit eigener Meldung, max. **100 MB**).
- **Große Vorlagen (30–42 MB) in Teilstücken:** Upload in 4-MB-Stücken
  (`?phase=part`, je einzeln wiederholbar, produktiv Blöcke eines Azure-Block-
  Blobs), Zusammensetzen und Prüfen beim Abschluss (`?phase=commit`). Kein
  Ingress-Limit greift, keine Anfrage hält mehr als ein paar MB im Speicher
  (Container-App: 0,5 GiB), Fortschritt sichtbar auf der Schaltfläche.
- **Geprüft wird die abgelegte Datei, nicht der Upload** (`verifyTemplateArchive`):
  Größe gegen angekündigte Größe, ZIP-Signatur, **Schlussmarke am Dateiende**,
  Präsentationsteil im Verzeichnis. Das war die Ursache der „Datei beschädigt,
  Reparatur scheitert"-Meldung: eine abgebrochene Übertragung sieht vorne
  fehlerfrei aus. Unvollständiges wird gelöscht und mit Zahlen gemeldet.
- Der Medien-Proxy liefert Dateien als Strom (`openMedia`, mit
  `maxRetryRequests`) statt sie zweimal vollständig zu kopieren — das entlastet
  auch Bilder und Folien-PDFs.
- Hinterlegte Dateigröße ist in Medien → Vorlagen und im Einsatzformular
  sichtbar, damit Vollständigkeit ohne Download prüfbar ist.
- Im Einsatzformular steht die Vorlage **zur gewählten Vortragssprache** direkt
  über dem vorhandenen PDF-Upload: Vorlage laden → Folien bauen → fertige Folien
  als PDF hochladen. Fehlt die Vorlage der Sprache, wird die andere angeboten
  und als solche gekennzeichnet; fehlt beides, führt der Hinweis nach
  Medien → Vorlagen.
- `/media/…?dl=<Dateiname>` setzt `Content-Disposition`, damit der Download
  nicht als UUID landet (`lib/media/url.ts`, unit-getestet).

**Prompt-Werkstatt im Adminbereich** (ADR `docs/decisions/0022-prompt-werkstatt.md`)
- Neuer Bereich `/admin/prompts`: Vorlage wählen, Einsatz/Briefing/Depesche/
  Identität dazu wählen, Identität(en) ankreuzen, fertigen Prompt kopieren.
  Auswahl steht in der Adresse, damit sie sich verlinken lässt; ohne
  JavaScript vollständig bedienbar (Auswahl per GET-Formular, nur der
  Kopierknopf ist ein Client-Baustein).
- Verwaltung unter `/admin/prompts/vorlagen`: Vorlagen anlegen, ändern,
  duplizieren, aus-/einblenden, sortieren; dazu Bausteine, die mehrere
  Vorlagen gemeinsam nutzen (der Stil-Baustein steht damit an einer Stelle).
- Zwei neue Modelle `PromptTemplate` und `PromptSnippet` (Migration
  `20260821120000_prompt_workbench`, rein additiv und wiederholbar
  geschrieben). Der erzeugte Prompt wird nicht gespeichert.
- Vorlagensprache: `{{platzhalter}}`, `{{baustein.x}}` und `[[Wahlteil]]`, der
  wegfällt, wenn eine Angabe fehlt. Was weggefallen ist, benennt die Werkbank
  und verlinkt den Eintrag, in dem die Angabe nachzutragen ist.
- Vorlagen, die eine Angabe brauchen, die in keinem Datensatz steht (ein Thema,
  ein Rohentwurf, Notizen von vor Ort), tragen eine Beschriftung in
  `inputLabel`; die Werkbank bietet dann ein Textfeld an, dessen Inhalt
  `{{eingabe}}` füllt.
- Mitgelieferter Standardsatz (`lib/prompts/defaults.ts`, per Knopfdruck
  einspielbar, ergänzt nur Fehlendes): **10 Bausteine, 14 Bildvorlagen und
  18 Textvorlagen**, fertig formuliert. Der Inhalt ist nicht neu erfunden,
  sondern zusammengezogen aus dem, was ohnehin schon galt: der 70er-Bildstil
  der Depeschen-Heros, die Umschlagserie der Identitäten aus
  `docs/BILDPROMPTS.md`, Nicoles Schreibstimme, die Liste der KI-Marker und die
  LinkedIn-Faustregeln. Das lag bisher über Skills und Markdown-Dateien
  verteilt und ist jetzt an einer Stelle pflegbar.
- Bild: Depeschen-Hero, Einsatz, Briefing-Thema, Identitäts-Umschlag und
  -Porträt, Marken-Porträt, Startseiten-Hero, Folien-Titel und -Trenner,
  LinkedIn-Schlüsselbild, Carousel-Cover, Architektur-Schaubild, Teilen-Karte,
  Cover-Mockup.
- Text: Bildidee finden, neue Depesche schreiben, LinkedIn-Post und -Serie,
  Anriss und Meta-Angaben, Einordnung vorschlagen, englische Fassung,
  Ankündigung, Nachbericht, Post von der Bühne, zwei Foliengerüste,
  Call-for-Papers-Einreichung, englisches Briefing, Dokument-Carousel,
  Identität vorstellen, Sprecherbio, Alternativtexte.
- Logik und Inhalt unter Unit-Tests (`lib/prompts/*.test.ts`): Ersetzung,
  Wahlteile, Bausteinauflösung mit Zyklusabbruch, Aufzählungen und
  Ortsangaben — sowie die Prüfung, dass jede mitgelieferte Vorlage nur
  Platzhalter anspricht, die es im Katalog gibt, dass jede Bildvorlage genau
  einen Stilbaustein und die Verbotsliste trägt, dass Eingabefeld und
  `{{eingabe}}` zusammenpassen und dass im deutschen Vorlagentext kein
  Geviertstrich steht (er zieht das Modell dazu, im Ergebnis selbst welche zu
  setzen).

**Fachgebiete und Radar-Themen aus der Depeschen-Maske heraus anlegen**
- In der Depeschen-Maske sitzt unter beiden Auswahlen ein Feld „Fehlt eins?
  Hier anlegen". Der Eintrag entsteht an Ort und Stelle und ist sofort
  ausgewählt; das Formular wird dabei weder abgeschickt noch verlassen (Server
  Action mit Rückgabewert, aufgerufen aus dem Client-Baustein — ein Formular im
  Formular ist in HTML nicht erlaubt).
- Gutmütig gegen Doppeleingaben: Gibt es den Namen schon, wird der vorhandene
  Eintrag ausgewählt statt ein zweiter angelegt. Der Vergleich ignoriert
  Groß-/Kleinschreibung und überzählige Leerzeichen (`lib/admin/inline-create.ts`,
  unit-getestet) — sonst stünden „Copilot Studio" und „copilot studio"
  nebeneinander und die öffentliche Filterung zerfiele in zwei Hälften.
- Ein hier angelegtes Radar-Thema übernimmt die in der Maske gewählten
  Identitäten und damit seine Farbe; ohne Zuordnung bliebe es global.
- Die Eingabetaste im Anlegefeld legt an, statt das ganze Formular
  abzuschicken.

**Stammdaten: „Dossier-Kategorien" heißen jetzt Fachgebiete**
- Seit Phase 3 sind Signale und Dossiers zu Depeschen zusammengeführt. Die
  Karte hieß aber weiter „Dossier-Kategorien" und zählte Dossiers — deshalb
  stand überall 0, obwohl die Kategorien an Depeschen hängen. Sie heißt jetzt
  „Fachgebiete" und zählt Depeschen.
- Die Löschsperre zählte ebenfalls nur Dossiers: Ein Fachgebiet ließ sich
  löschen, obwohl noch Depeschen daran hingen. Sie zählt jetzt beides.
- `deleteCategory` invalidierte gar keinen Cache; eine gelöschte Kategorie
  blieb in den öffentlichen Filterlisten stehen. Jetzt invalidieren Anlegen,
  Umbenennen und Löschen die Depeschen- und Dossier-Listen.
- Die Art heißt in der Datenbank weiterhin `DOSSIER`. Der gespeicherte Wert
  bleibt, weil eine Umbenennung nur eine Migration wäre, ohne dass jemand etwas
  davon hätte; sichtbar heißt er überall „Fachgebiete".
- Bei den Weiterleitungen führte der Typ „Dossier" in die Irre: Beide Altwerte
  (`post`, `dossier`) werden beim Auflösen einer Depeschen-Adresse ohnehin
  geprüft. Neue Einträge wählen deshalb nur noch zwischen „Depesche" und
  „Einsatz".

## 14.5 — Abschlussliste (Stand dieser Sitzung)

**`TODO(nicole)`-Marker (grep):**
- `app/(site)/[locale]/akte/page.tsx:13` — finalen Namen „Akte" vs. „Ausrüstung" bestätigen.
- `lib/admin-nav.ts:25` — Entscheidung „Zeitplan & Kanäle" (Phase 5.2).
- `prisma/seed.ts` — ⚠-Angaben in den Bio-Entwürfen bestätigen (Anhang A).

**`ENTWURF`-Texte, die Nicole überarbeitet:**
- Identitäts-Beschreibungen (Seed, 4×), Bio-Entwürfe (Anhang A, 6×).
- Startseite „Die Agentin"-Doppeldeutigkeit; Legende „Warum Agentin"; Legende
  Kontakttext (`lib/queries/legend.ts`).

**Leere Pflichtfelder / STOP-Werte:**
- Decknamen der Identitäten (DE/EN), Akzentfarben bestätigen.
- Anschrift + Kontakt-E-Mail (Impressum darf sonst nicht öffentlich gehen).
- GitHub-, Sessionize-, MVP-Profil-URLs.
- Bestätigte Veranstaltungsdaten + Quelldaten für den Backfill.
- Identitätsbilder (Portrait + Umschlag).

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
| Entscheidung „Zeitplan & Kanäle" (behalten/umbenennen/einbetten) | 5.2 | offen |
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

---

## Adminbereich-Umbau (22.08.2026)

Auf Wunsch von Nicole überarbeitete Redaktionsoberfläche. Migration:
`prisma/migrations/20260822120000_admin_umbau`. **Vor dem Deployment ein
Azure-SQL-Snapshot** — die Migration löscht Tabellen (siehe ADR 0024).

Die Anwendung migriert beim Serverstart selbst; wer es von Hand machen will,
folgt `docs/db/2026-08-22-admin-umbau.md` (Anleitung) mit
`docs/db/2026-08-22-admin-umbau.sql` (Skript).

**Terminkalender statt Redaktionsplan**
- `/admin/redaktionsplan` → `/admin/terminkalender` (alte Route leitet weiter).
  Der Kalender zeigt jetzt alle Termine, nicht nur Ungeplantes: Filter nach
  Einsätzen, Depeschen und Einsatzberichten sowie nach Zeitraum
  (`lib/planning/filter.ts`, unit-getestet).
- Zu jedem Einsatz gehört eine Aufgabe „Einsatzbericht schreiben"
  (`MissionReportTask`). Abhaken erst, wenn Veranstaltung und Vortrag Text
  haben — geprüft in der Server Action, nicht nur im Formular
  (`lib/missions/report-task.ts`). Für den Bestand rückwirkend angelegt; wo der
  Bericht schon stand, gleich als erledigt.

**Erinnerung an Depeschen**
- Vorlauf, Empfängeradresse und An/Aus in den Einstellungen (Register
  „Erinnerungen"). Versand im Job-Takt über `/api/jobs/run`.
- Eigener SMTP-Versand ohne neue Abhängigkeit, siehe ADR 0023.
- **Braucht Input von Nicole:** `SMTP_HOST`, `SMTP_FROM` und ggf.
  `SMTP_USER`/`SMTP_PASSWORD` als Umgebungsvariablen (Key Vault). Ohne sie
  wird nichts verschickt; die Einstellungen sagen das ausdrücklich.

**Masken**
- Einsatz: Belegmaterial ohne Folien-URL, Folien-Plattform und Feedback-Felder;
  Folien (Briefing-Foliensatz, PDF) nach oben; Publikum in drei Zahlen
  (Präsenz, Remote, On-Demand); Co-Speaker auf den ersten Tab.
- Startseite: Register „Texte (DE)", „Texte (EN)", „Bild", „Woran ich gerade
  arbeite". Das Hero-Bild wird einmal gepflegt und auf beide Sprachzeilen
  geschrieben. Werkzeuge als Tabelle mit modalem Dialog. Kennzahlen als Info
  oben rechts.
- Legende: Register statt Endlosseite.
- Aufklärung (Radar): Einträge lassen sich ändern.
- Medien: größeres Vorschaubild (auch Querformat), breitere Spalte „Herkunft".
- Lebenslauf: Projektlaufzeit, eigener Einsatz, Personentage, anonymer Kunde
  (Name erscheint nirgends in der Ausgabe); Fähigkeiten mit Jahren — aus dem
  Zeitraum berechnet, wo er lesbar ist — und Selbsteinschätzung.
- Einsatzzentrale: Bereiche in Boxen neben- und untereinander, mit Auszug aus
  der Auswertung und den nächsten Terminen.

**Entfallen** (ADR 0024): Schlagworte, Weiterleitungen,
Zertifizierungs-Kategorien, Merkmale der Identitäten. Die Stammdaten sind in
den Einstellungen aufgegangen (Register „Fachgebiete"), `/admin/struktur`
leitet weiter.

**Öffentlich:** Der Button „CV abrufen" ist von der Legende verschwunden. Die
Seiten `/de/cv` und `/en/cv` bleiben erreichbar und werden gezielt weitergegeben.
