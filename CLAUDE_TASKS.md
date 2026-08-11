# CLAUDE_TASKS.md — Umbau „Die Agentin"

> **Für Claude Code.** Diese Datei ist ein sequenzieller Arbeitsplan. Arbeite **alle 14
> Phasen in einem Durchgang** ab, in Reihenfolge, **auf demselben Branch**. Nach jeder
> Phase: Milestone-Commit und `docs/PROGRESS.md` fortschreiben. Nach Phase 14: Pull
> Request eröffnen. Nicht zwischendurch auf Freigabe warten.

---

## Branch- und PR-Workflow

**Branch**

Arbeite auf `feature/agentin-umbau`. Prüfe zuerst, ob der Branch bereits existiert
(Nicole legt ihn eventuell selbst an):

- Existiert er → auschecken, `git pull`, dort weiterarbeiten.
- Existiert er nicht → von `main` (bzw. dem Default-Branch) abzweigen.

**Alle 14 Phasen laufen auf diesem einen Branch.** Kein Branch pro Phase, keine
Zwischen-PRs.

**Commits**

Ein Commit pro Phase, konventionelles Format mit Phasennummer:

```
feat(phase-03): Signale und Dossiers zu Depeschen zusammengeführt
```

Bei sehr großen Phasen (2, 3, 12) sind mehrere Commits erlaubt, solange jeder für sich
einen lauffähigen Stand hinterlässt. Nie einen Commit erzeugen, der den Build bricht.

**Umgang mit STOP-Bedingungen**

STOP heißt **nicht**, dass die Arbeit endet. Es heißt:

1. Diesen einen Teilpunkt nicht raten und nicht mit erfundenen Daten füllen
2. Die Stelle mit `// TODO(nicole): <was fehlt>` im Code markieren, sodass sie sich
   grep-en lässt
3. Den Punkt in `docs/PROGRESS.md` unter „Braucht Input von Nicole" eintragen
4. **Mit der nächsten Teilaufgabe und der nächsten Phase weitermachen**

Einzige Ausnahme, bei der du wirklich anhältst und wartest: eine Migration, die Daten
unwiederbringlich verändern würde und deren Zielzustand aus dem Bestand nicht eindeutig
ableitbar ist. Dann Phase überspringen, in `docs/PROGRESS.md` vermerken, weiterarbeiten.

**Kontextgrenze**

Wenn der Kontext knapp wird, ist `docs/PROGRESS.md` die Übergabe an dich selbst: Stand,
angefangene Arbeit, nächster Schritt. Committe vorher, damit nichts verloren geht.

**Abschluss nach Phase 14**

Öffne einen Pull Request gegen den Default-Branch mit diesem Aufbau:

- **Titel:** `Umbau Die Agentin: Identitäten, Depeschen, Redaktionsplan, Redesign, SEO`
- **Beschreibung:**
  - Kurzfassung in drei bis fünf Sätzen, was sich fachlich ändert
  - Tabelle aller 14 Phasen mit Status (umgesetzt / teilweise / übersprungen, mit Grund)
  - **Breaking Changes und Migrationen** — Schema-Änderungen, URL-Änderungen, Redirects
  - **Was Nicole vor dem Merge tun muss** — die vollständige Liste aus Anhang B
  - **Was Nicole nach dem Merge tun muss** — Cutover-Schritte aus `docs/CUTOVER.md`
  - Liste aller `TODO(nicole)`-Marker mit Datei und Zeile, per grep erzeugt
  - Liste aller `ENTWURF`-Texte, die noch überarbeitet werden müssen
- Verlinke `docs/PROGRESS.md`, `docs/AUDIT.md`, `docs/DESIGN.md`, `docs/CUTOVER.md`,
  `docs/DATENVERARBEITUNG.md`, `docs/BILDPROMPTS.md`, `docs/IMPORT.md`

Der PR bleibt offen. Nicht selbst mergen.

---

## 0. Arbeitsregeln — vor jeder Phase lesen

**Ablauf pro Phase**
1. Lies `docs/PROGRESS.md`. Wenn die Phase dort als erledigt markiert ist, überspringe sie.
2. Lies den relevanten Code, bevor du schreibst. Rate keine Pfade, Schemas oder Komponentennamen.
3. Setze um.
4. Trage in `docs/PROGRESS.md` ein: erledigt, offen, und was Nicole liefern muss.
5. Commit im Format `feat(phase-NN): <Beschreibung>`.
6. Ohne Rückfrage direkt zur nächsten Phase.

**Harte Regeln**

- **Keine Phase überspringen und keine zwei Phasen in einem Commit bündeln.**
- **Stop-Bedingungen respektieren, aber nicht anhalten.** Wo unten „STOP" steht:
  Teilpunkt nicht raten, `TODO(nicole)` im Code setzen, Eintrag in `docs/PROGRESS.md`,
  **weiterarbeiten**. Details siehe Branch- und PR-Workflow oben. Erfinde keine Adressen
  und keine biografischen Fakten.
- **Keine Zeitachse über Themen.** Nicole bedient alle ihre Fachgebiete parallel und aktiv:
  SharePoint, Microsoft Teams, Microsoft 365, Power Platform / Business Applications,
  Microsoft AI (Copilot, Copilot Studio, Foundry), Agentic AI, KI in der Softwareentwicklung.
  Nichts davon ist abgeschlossen. Kein Datenmodell, keine UI und kein Text darf eine
  Identität oder ein Fachgebiet als „ehemalig", „bis 20xx" oder „Phase" darstellen.
  Es gibt kein `endDate` und kein `archived`-Flag auf Identitäten und Fachgebieten.
- **Datenverlust ist die einzige unverzeihliche Kategorie.** Jede Migration ist reversibel
  und dokumentiert. Vor Migrationen, die Daten umschichten, schreibst du ein Backup-Skript
  bzw. weist Nicole auf einen Azure-SQL-Snapshot hin.
- **Texte in Nicoles Stimme werden nicht erfunden.** Ausnahme: die Rechtstexte in Phase 11
  und die als `ENTWURF` markierten Vorschläge. Alles, was du selbst formulierst und was
  öffentlich unter ihrem Namen steht, wird im Code mit `// ENTWURF — von Nicole zu prüfen`
  gekennzeichnet.
- **Keine Marketing-Sprache.** Kein „nahtlos", „leistungsstark", „revolutionär".
- **Zweisprachigkeit ist Pflicht.** Jedes neue sichtbare Textfeld existiert in DE und EN.
  DE ist führend, EN darf als markierter Entwurf starten.
- **Qualitätsboden ohne Ankündigung:** responsiv bis Mobile, sichtbarer Keyboard-Fokus,
  `prefers-reduced-motion` respektiert, semantisches HTML.

**Kontext zum Projekt**

Personal-Brand-Website von Nicole Enders (Microsoft MVP, 7× in Folge, Speaker, Autorin von
10 Büchern). Stack: Next.js, Azure Container Apps, Azure SQL, Auth.js v5 + Entra ID,
TipTap 3, d3-geo mit gebündeltem TopoJSON. CI/CD über GitHub + Azure DevOps.
Zieldomain `nicolenders.com` läuft aktuell noch auf WordPress.com.

**Markenkonzept**

Spionage-Vokabular, konsequent durchgezogen. Der Kern ist eine Doppeldeutigkeit, die
bislang nirgends auf der Seite ausgesprochen wird und die in Phase 3 und 12 explizit wird:
„Agentin" meint gleichzeitig die Spionin **und** die Person, die AI Agents baut.
„Enders" spielt auf „keine losen Enden" an. Die Über-mich-Seite heißt „Legende" —
Deckgeschichte und Kartenlegende zugleich.

---

## Phasenübersicht

| # | Phase | Abhängig von |
|---|---|---|
| 1 | Audit + Sofortmaßnahmen | — |
| 2 | Identitäten (Decknamen) — Datenmodell | 1 |
| 3 | Informationsarchitektur: Signale + Dossiers → Depeschen | 2 |
| 4 | Publikationsdatum, Archiv, Redaktionsplan | 3 |
| 5 | Adminbereich: Aufräumen und Ergänzungen | 3 |
| 6 | GitHub-Integration | 5 |
| 7 | Kontakt: LinkedIn + E-Mail | 5 |
| 8 | Sessionize-Backfill | 2 |
| 9 | Einsatzakte mit Belegmaterial | 8 |
| 10 | Briefings, Publikationen, Ausbildung ins Narrativ einbetten | 8 |
| 11 | Rechtstexte (vollständig, DE + EN) | 5 |
| 12 | Frontend-Redesign: Startseite, Legende, Motion | 3, 9, 10 |
| A | Speaker-Kit („Akte") | 12 |
| 13 | SEO + Auffindbarkeit für KI-Systeme | 12, A |
| 14 | Domain-Migration und Cutover | 13 |

---

## Phase 1 — Audit und Sofortmaßnahmen

### 1.1 Bestandsaufnahme (nur lesen)

Schreibe das Ergebnis nach `docs/AUDIT.md`:

- Next.js-Version, Router-Typ, Node-Version, zentrale Dependencies
- i18n: wie werden `/de` und `/en` aufgelöst, wo liegen Übersetzungen
- Datenmodell: alle Entitäten, ORM/Query-Layer, Migrationsmechanismus
- Wo entsteht Metadata (`generateMetadata`, Layouts, Konstanten)?
- Existieren `robots.txt`, `sitemap.xml`, `canonical`, `hreflang`, JSON-LD?
- Existiert bereits Middleware?
- Vollständige Routenliste, öffentlich und Admin, jeweils statisch vs. datengetrieben
- Wo liegt die Import-Pipeline (`die-agentin/import`-Schema, `build.py`)?
- Design-Tokens: wo sind Farben, Schriften, Spacing definiert?
- Auth-Setup und wie der Admin-Bereich geschützt ist

### 1.2 Sofortmaßnahmen

**(a) noindex für alle Hosts außer der Zieldomain.**
Die Staging-URL `nicolenders-prod-web.wittybush-*.azurecontainerapps.io` liefert aktuell
auf jeder Seite `<meta name="robots" content="index, follow">`. Sobald Google das crawlt,
entsteht eine zweite indexierte Domain mit Duplicate Content, die beim Cutover gegen
`nicolenders.com` konkurriert.

Umsetzung als Next.js Middleware anhand des `Host`-Headers: ist der Host nicht der in
`PUBLIC_SITE_HOST` konfigurierte, setze `X-Robots-Tag: noindex, nofollow`. Muss auch für
`/robots.txt` und die Feeds greifen. `PUBLIC_SITE_HOST` als ENV-Variable, damit der
Cutover in Phase 14 nur eine Konfigurationsänderung ist.

**(b) canonical** auf allen Seiten auf die absolute URL unter `PUBLIC_SITE_HOST`,
unabhängig vom Request-Host.

**(c) Toter CTA.** Auf `/de/legende` hat der Button „Nachricht auf LinkedIn"
`href="#"` — die einzige Handlungsaufforderung der gesamten Website führt nirgendwohin.
Vorläufig auf das hinterlegte LinkedIn-Profil zeigen lassen (`rel="noopener"`,
`target="_blank"`). Die vollständige Lösung kommt in Phase 7.

**(d) „Karte: Beispieldaten".** Auf `/de/einsaetze` steht dieser Hinweis unter der Karte.
Finde heraus, ob tatsächlich Demo-Daten gerendert werden oder nur der Hinweis übrig ist.
**Berichte das Ergebnis, bevor du etwas entfernst.**

### 1.3 Grundlagen anlegen

`docs/PROGRESS.md` mit Sektionen: „Erledigt", „Offen", „Braucht Input von Nicole".
Trage die 14 Phasen als Checkliste ein.

---

## Phase 2 — Identitäten (Decknamen)

Das ist das strukturelle Herzstück des gesamten Umbaus. Lies diese Phase vollständig,
bevor du anfängst.

### Konzept

Nicole tritt je nach Thema unter verschiedenen **Identitäten** auf — im Vokabular:
Decknamen. Diese Identitäten sind **parallel und dauerhaft aktiv**, nicht sequenziell.
Auf manchen Veranstaltungen tritt sie mit mehreren gleichzeitig auf.

Das Bild, das die Marke trägt: Eine Identität wird als **Umschlag** übergeben — mit
Ausweis, Geld und Unterlagen. Dieses Bild ist das Gestaltungsprinzip für die Darstellung
im Frontend (Phase 12): Eine Identität ist ein Objekt mit Inhalt, kein Tag.

Der Unterschied zu einer klassischen Themen-Taxonomie ist wichtig: Identitäten werden
**offen als Nicoles eigene** vorgestellt. Es geht nicht um Verschleierung, sondern um
eine offengelegte Rollenaufteilung. Die Startseite zeigt die Agentin **und** ihre
Identitäten nebeneinander.

### 2.1 Datenmodell `Identity`

Eine Identität ist eine vollwertige, im Adminbereich pflegbare Entität — kein Tag und
kein Enum. Alles Sichtbare wird gepflegt, nichts hartkodiert.

```
Identity
  id
  slug                      eindeutig, URL-fähig, sprachneutral

  — Benennung —
  codenameDe / codenameEn   der Deckname, z.B. „Die Collaboration-Expertin"
  roleDe / roleEn           die nüchterne Rolle, z.B. „Microsoft Teams & Collaboration"
  taglineDe / taglineEn     ein Satz, für Karte und Umschlag
  registryCode              kurze Kennung, z.B. „ID-04". Optional, aus sortOrder
                            vorbelegt, überschreibbar. Rein dekorativ, nie als
                            Fremdschlüssel oder in URLs verwenden

  — Inhalt —
  descriptionDe / descriptionEn   Rich Text (TipTap), mehrere Absätze
  shortBioDe / shortBioEn         2–3 Sätze, für Speaker-Kit und OG-Beschreibung
  focusDe / focusEn               Liste von Stichpunkten: womit beschäftigt sie sich
                                  gerade in dieser Identität
  languages                       Sprachen, in denen sie in dieser Identität auftritt

  — Bilder (beide über die bestehende Medienverwaltung, siehe 2.5) —
  portraitImageId           „Ausweisfoto" — quadratisch, für Karte, Avatar, Filter
  envelopeImageId           das Umschlag-Motiv aus 12.4 — Querformat/4:5, für die
                            Identitätsseite und das OG-Image
  ogImageId                 optional, überschreibt das generierte OG-Image

  — Darstellung —
  color                     Akzentfarbe (Hex). Pflicht, mit Kontrastprüfung
  iconKey                   optionales Icon aus dem vorhandenen Set
  sortOrder                 manuelle Reihenfolge, KEINE zeitliche
  isPrimary                 bool, für Hervorhebung auf der Startseite

  — SEO —
  metaTitleDe / metaTitleEn         optional, sonst aus codename/role generiert
  metaDescriptionDe / ...En         optional, sonst aus shortBio generiert

  — Status —
  published                 bool
  createdAt / updatedAt
```

**Verboten:** `activeFrom`, `activeUntil`, `archived`, `deprecated`, `phase`, `era`,
`isActive`. Eine Identität kann unveröffentlicht sein, aber niemals „ehemalig".
Ein „seit"-Datum ist erlaubt, ein „bis"-Datum nicht — wenn du `since` einführst, dann
ausschließlich als Anzeigefeld ohne Gegenstück.

### 2.2 Erweiterbarkeit ohne Migration

Damit Nicole künftig Angaben ergänzen kann, ohne dass jemand das Schema anfasst:

```
IdentityAttribute
  id
  identityId
  labelDe / labelEn         z.B. „Ausrüstung", „Typische Zielgruppe", „Signature Talk"
  valueDe / valueEn         Freitext
  sortOrder
  displayPublic             bool — auch intern nutzbare Notizen möglich
```

Im Admin als wiederholbare Zeilenliste mit Hinzufügen/Entfernen/Sortieren. Öffentlich
werden diese Attribute auf der Identitätsseite als schlichte Merkmalsliste gerendert
(Label links, Wert rechts), im Stil des Codebuchs aus 12.3.

Das ist der Zweck: Was heute noch nicht absehbar ist, landet hier, statt in einer
Migration zu enden. Was sich als dauerhaft wichtig erweist, kann später in ein echtes
Feld überführt werden.

### 2.3 Werkzeuge je Identität

Auf der Legende steht heute eine globale Werkzeugliste (Microsoft Foundry, Copilot
Studio, Microsoft 365, Azure, Teams, Power Platform). Die gehört fachlich zu den
Identitäten, nicht zur Person als Ganzes.

```
Identity ↔ Tool   (n:m)

Tool
  id, slug, name, iconImageId, url (optional), sortOrder
```

Bestehende Werkzeuge in die neue Tabelle migrieren und den Identitäten zuordnen.
Die globale Liste auf der Legende bleibt bestehen, wird aber aus der Vereinigungsmenge
aller Identitäts-Werkzeuge erzeugt statt separat gepflegt.

Zuordnungen (jeweils n:m, eine Identität hat viele Einträge, ein Eintrag kann mehreren
Identitäten zugeordnet sein):

- `Identity` ↔ `Mission` (Einsatz) — für Events, auf denen sie mit mehreren auftritt
- `Identity` ↔ `Briefing`
- `Identity` ↔ `Dispatch` (Phase 3)
- `Identity` ↔ `Publication` (Phase 6)
- `Identity` ↔ `Certification` (Phase 5.3)

### 2.4 Verhältnis zu bestehenden Kategorien

Auf `/briefings` existiert bereits ein Kategorie-Filter (Agentic AI, Microsoft 365,
Microsoft 365 Copilot). Prüfe, wie das modelliert ist.

- Ist es eine eigenständige Tabelle → **behalten** als feingranulare Fachgebiete
  *unterhalb* der Identitäten. Identität = grobe Rolle, Fachgebiet = konkretes Thema.
  Eine Identität kann mehrere Fachgebiete bündeln.
- Ist es ein Enum oder Freitext → **schlag mir eine Migration zu einer eigenständigen
  Entität vor, bevor du sie umsetzt.**

In beiden Fällen: nichts verlieren, bestehende Zuordnungen migrieren.

### 2.5 Seed-Identitäten

Lege diese als Startpunkt an, `published = false`, Beschreibungstexte als markierte
Entwürfe. Nicole überarbeitet Decknamen und Texte selbst.

| slug | Rolle | Fachgebiete |
|---|---|---|
| `collaboration` | Collaboration & Modern Work | SharePoint, Microsoft Teams, Microsoft 365 |
| `low-code` | Power Platform & Business Applications | Power Platform, Dataverse, Business Applications |
| `agentic-ai` | Microsoft AI & Agents | Copilot, Copilot Studio, Microsoft Foundry, Agentic AI |
| `dev-ai` | KI in der Softwareentwicklung | herstellerübergreifend, Tooling, Engineering-Praxis |

**Hinweis zur letzten:** `dev-ai` ist die einzige Identität, die bewusst nicht
Microsoft-exklusiv ist. Das ist Absicht und darf in der Darstellung sichtbar sein.

**STOP:** Die Decknamen selbst (`codenameDe`/`codenameEn`) füllst du **nicht** aus.
Trage sie in `docs/PROGRESS.md` unter „Braucht Input von Nicole" ein. Bis dahin fällt
die Anzeige auf `roleDe`/`roleEn` zurück.

### 2.6 Adminbereich — vollständige Pflege

Eigener Menüpunkt „Identitäten", gleichrangig zu den Inhaltstypen.

**Übersicht**
- Karten- oder Tabellenansicht mit Portrait, Deckname, Rolle, Akzentfarbe,
  Veröffentlichungsstatus und Anzahl verknüpfter Einträge je Typ
- Reihenfolge per Drag & Drop, Änderung sofort persistiert
- Aktionen: Bearbeiten, Duplizieren, Vorschau, Veröffentlichen/Zurückziehen

**Bearbeiten** — Tabs statt Endlosformular, analog zu 5.1:

| Tab | Inhalt |
|---|---|
| Stammdaten | Deckname, Rolle, Tagline, Slug, Kennung, Sprachen |
| Beschreibung | TipTap für `description`, Felder für `shortBio`, Liste für `focus` |
| Bilder | Portrait und Umschlag-Motiv, optionales OG-Bild |
| Darstellung | Akzentfarbe mit Kontrastprüfung, Icon, `isPrimary` |
| Werkzeuge | Mehrfachauswahl aus der Tool-Tabelle (2.3) |
| Merkmale | wiederholbare Attributliste (2.2) |
| Verknüpftes | Einsätze, Briefings, Depeschen, Publikationen, Zertifizierungen — mit Zuordnung direkt hier, nicht nur vom Eintrag aus |
| SEO | Meta-Titel und -Beschreibung, Vorschau des generierten OG-Images |

**DE/EN-Umschaltung** pro Feld sichtbar, mit Hinweis, welche Sprache noch leer ist.

**Bildupload** über die bestehende Medienverwaltung (`/media/*`), nicht als separater
Uploader. Beim Upload abfragen: Alt-Text DE und EN, Bildnachweis. Portrait mit
Zuschnitt auf 1:1, Umschlag-Motiv auf 4:5. WebP-Konvertierung wie bei den vorhandenen
Medien. Falls die Medienverwaltung heute keinen Zuschnitt kann: erst ohne umsetzen und
als Folgepunkt in `docs/PROGRESS.md` notieren — kein Blocker.

**Validierung vor dem Veröffentlichen.** Blockierend: Slug, Rolle DE, Akzentfarbe,
Portrait. Warnend, aber nicht blockierend: fehlender Deckname, leere EN-Felder,
fehlendes Umschlag-Motiv, keine verknüpften Einträge. Die Warnungen im Formular
anzeigen, nicht erst beim Speichern.

**Löschen** nur, wenn keine Einträge verknüpft sind. Sonst Dialog mit der Anzahl
betroffener Einträge und der Option, sie vorher umzuhängen. Alternative anbieten:
zurückziehen statt löschen.

**Bei jeder Entität mit Identitätszuordnung** (Depesche, Einsatz, Briefing, Publikation,
Zertifizierung): Mehrfachauswahl im Formular, mit Farbpunkt und Deckname, und einer
Warnung beim Speichern, wenn keine Identität gesetzt ist.

---

## Phase 3 — Informationsarchitektur: Signale + Dossiers → Depeschen

### Das Problem

Nicoles Tester verstehen „Signale" und „Dossiers" nicht. Die Ursache ist nicht das
Vokabular, sondern die Unterscheidung: „kurze Meldung" gegen „gepflegte Wissensseite"
ist ein **Format**, kein eigener Bereich. Zwei fast leere Navigationspunkte für eine
Formatfrage sind zu teuer — zumal die Einsätze im Fokus stehen sollen und die Navigation
aktuell acht Punkte hat.

### Die Lösung

**Eine Entität, gebunden an eine Identität, Format als Filter.**

Erzählerische Begründung, die auch in der Copy auftauchen soll: Eine Agentin arbeitet
zwischen den Einsätzen im Hintergrund an ihren Identitäten, um sie glaubhaft zu
verkörpern. Wer als Collaboration-Expertin auftritt, beschäftigt sich mit neuen
Teams-Funktionen. Ein Beitrag ist also nicht bloß ein Blogpost, sondern Arbeit an
einer Identität.

### 3.1 Namensgebung — entschieden

Der öffentlich sichtbare Name lautet **Depesche** (DE) bzw. **Dispatch** (EN).
Der interne Bezeichner im Code, im Schema und in den Routen ist `Dispatch`.

Eine Depesche ist eine übermittelte Meldung aus dem Feld — genau das, was diese
Einträge sind: Arbeit an einer Identität, aus dem Hintergrund gesendet.

Umsetzung: Der sichtbare Name kommt aus **einem** Sprachfile-Key, nicht aus Slugs,
Klassennamen oder Datenbankfeldern. Ein späterer Namenswechsel darf keine Migration
und keine URL-Änderung erfordern — prüfe das explizit und notiere in
`docs/PROGRESS.md`, an welcher Stelle der Name gesetzt wird.

Routen: `/de/depeschen`, `/de/depeschen/<slug>`, EN `/en/dispatches/<slug>`.

### 3.2 Datenmodell

Führe `Signal` und `Dossier` zu `Dispatch` zusammen:

```
Dispatch
  id, slug
  titleDe / titleEn
  excerptDe / excerptEn
  bodyDe / bodyEn           TipTap JSON, volle Formatierung wie bisher beim Dossier
  format                    NOTE | ANALYSIS | REFERENCE | BACKSTAGE
  identities                n:m → Identity
  topics                    n:m → Fachgebiet
  heroImageId
  sourceUrl                 optional, für kuratierte Funde
  publishedAt               siehe Phase 4
  updatedAt                 sichtbar bei REFERENCE („Wissen mit Haltbarkeit")
  status                    siehe Phase 4
```

Format-Bedeutungen: `NOTE` kurze Meldung · `ANALYSIS` Einordnung · `REFERENCE`
gepflegtes Nachschlagewerk mit sichtbarem Änderungsdatum · `BACKSTAGE` Persönliches.

**Migration:** bestehende Signale → `format` aus dem alten Typ ableiten
(`SIGNAL`→`ANALYSIS`, `NOTE`→`NOTE`, `BACKSTAGE`→`BACKSTAGE`), Dossiers → `REFERENCE`.
Alte URLs `/de/signale/*` und `/de/dossiers/*` per 301 auf `/de/depeschen/<slug>`.
Übersichtsseiten `/de/signale` und `/de/dossiers` per 301 auf die neue Übersicht,
letztere mit vorgewähltem Format-Filter, damit gespeicherte Links sinnvoll landen.

### 3.3 Neue Navigation

Von acht auf fünf Punkte. Einsätze stehen im Fokus:

```
HQ · Einsätze · Identitäten · Depeschen · Legende
```

- **Publikationen** und **Ausbildung** wandern aus der Hauptnavigation in die Legende
  (siehe Phase 10) und bleiben im Footer verlinkt. Die Routen bleiben bestehen.
- **Briefings** werden Teil des Einsätze-Bereichs (siehe Phase 10.1), Route bleibt.
- Prüfe alle internen Links auf die alten Nav-Ziele und ziehe sie nach.

### 3.4 Neue Route: Identitäts-Übersicht

`/de/identitaeten` und `/de/identitaeten/<slug>` (EN: `/en/identities/<slug>`,
lokalisierte Slugs, mit Redirect vom jeweils anderen).

Die Detailseite einer Identität zeigt: Deckname, Rolle, Beschreibung, Bild, und darunter
**alle zugehörigen Einträge aller Typen** — Depeschen, Einsätze, Briefings, Publikationen,
Zertifizierungen. Das ist die Seite, auf der die Behauptung „ich decke diesen Bereich ab"
belegt wird.

---

## Phase 4 — Publikationsdatum, Archiv, Redaktionsplan

Gilt einheitlich für **Dispatch (Depesche), Mission, Briefing** und alle weiteren Inhaltstypen.

### 4.1 Status- und Datumsmodell

```
status        DRAFT | SCHEDULED | PUBLISHED | ARCHIVED
publishedAt   DateTime, mit Zeitzone Europe/Berlin
```

Sichtbarkeitsregel im öffentlichen Bereich — **an genau einer Stelle** implementieren,
als gemeinsamer Query-Filter oder Repository-Methode, nicht pro Seite kopiert:

```
sichtbar  ⟺  status = PUBLISHED  UND  publishedAt <= now()
```

- `SCHEDULED` und `PUBLISHED` mit Zukunftsdatum erscheinen **nicht** öffentlich, auch
  wenn sie als veröffentlicht markiert sind.
- `ARCHIVED` erscheint nicht öffentlich, bleibt aber vollständig erhalten.
- Direktaufruf einer nicht sichtbaren Detail-URL → 404. Ausnahme: eingeloggte Admins
  sehen eine Vorschau mit deutlichem Status-Banner.
- **ISR beachten:** Bei zeitgesteuerter Veröffentlichung reicht ein Build-Time-Cache
  nicht. Löse das über kurze `revalidate`-Intervalle auf den Übersichtsseiten oder einen
  Timer-Trigger, der `revalidatePath` aufruft. Dokumentiere die gewählte Lösung und ihre
  Latenz in `docs/PROGRESS.md`.
- Sitemap und RSS-Feed berücksichtigen die Sichtbarkeitsregel.

### 4.2 Archiv im Adminbereich

Eigener Menüpunkt „Archiv" mit **Tabs pro Eintragstyp** (Depeschen, Einsätze, Briefings,
Publikationen). Pro Tab: Liste mit Titel, Typ, Archivierungsdatum, Identitäten,
Suche und Filter. Aktionen: Wiederherstellen (zurück nach `DRAFT`), endgültig löschen
mit Bestätigungsdialog.

### 4.3 Redaktionsplan

Neuer Admin-Menüpunkt **„Redaktionsplan"**. Zeigt alle Einträge mit
`status = DRAFT` oder `SCHEDULED` oder (`PUBLISHED` und `publishedAt` in der Zukunft).

**Zwei Ansichten, umschaltbar, Auswahl in der URL:**

**Tabelle** — Spalten: Titel, Typ, Identität(en), Status, geplantes Datum,
zuletzt bearbeitet. Sortierbar nach jeder Spalte, Standardsortierung nach `publishedAt`
aufsteigend. Filter nach Typ, Status, Identität. Direkter Link in den Editor.

**Kalender, Monatsansicht** — Einträge auf ihrem `publishedAt` platziert, eingefärbt
nach Identitätsfarbe, Typ als Icon oder Kürzel. Navigation Monat vor/zurück, Sprung zu
„heute". Drag & Drop zum Verschieben des Datums wäre sinnvoll; wenn der Aufwand über
eine Session hinausgeht, baue erst die Anzeige und notiere Drag & Drop als Folgepunkt.
Mehrere Einträge pro Tag müssen lesbar bleiben — bei Überlauf „+n weitere" mit Popover.

Keine schwergewichtige Kalenderbibliothek einziehen, wenn eine CSS-Grid-Monatsansicht
in vergleichbarem Aufwand machbar ist. Begründe deine Entscheidung.

---

## Phase 5 — Adminbereich: Aufräumen und Ergänzungen

### 5.1 Briefings als Tabs

Der Briefings-Bereich zeigt seine Unterbereiche aktuell untereinander. Bau ihn auf Tabs um:

```
Neues Briefing · Alle Briefings · Auswertung · Kategorien · Zielgruppen
```

Aktiver Tab in der URL (Query-Param oder Sub-Route), damit er beim Reload und beim
Teilen erhalten bleibt. Prüfe, ob es weitere Admin-Bereiche mit demselben Muster gibt,
und ziehe die Tab-Komponente als wiederverwendbares Element heraus.

### 5.2 „Zeitplan und Kanäle" entfernen

Der Menüpunkt ist überflüssig — Social-Media-Kanäle sind bereits unter Einstellungen
gepflegt. Seite, Route und Menüpunkt entfernen.

**Vorher prüfen:** Enthält die Seite Funktionen oder Daten, die es sonst nirgends gibt
(z. B. Posting-Zeitfenster fürs LinkedIn-Auto-Posting)? Falls ja: **STOP** — berichte,
was du gefunden hast, und schlage vor, wohin es umzieht, bevor du löschst.

### 5.3 Zertifizierungen: Status „Geplant"

```
Certification
  status         PLANNED | ACHIEVED | EXPIRED
  plannedFor     optionales Datum oder Freitext („Q4 2026")
  identities     n:m → Identity
```

Bestehende Einträge → `ACHIEVED`, bzw. `EXPIRED` wenn das Gültigkeitsdatum überschritten ist.

**Öffentlich:** Geplante Zertifizierungen erscheinen auf der Ausbildung-Seite in einem
eigenen Abschnitt — zusammen mit den Themen, mit denen Nicole sich gerade beschäftigt.
Vorschlag für die Sektion: **„In Ausbildung"** oder **„Laufende Vorbereitung"**.
Ziehe die Themen aus den Identitäts-`focus`-Feldern, damit die Seite nicht doppelt
gepflegt werden muss. Kein Erwerbsdatum, keine Gültigkeit, keine Badge — visuell klar
von erworbenen Zertifizierungen unterschieden.

Das ist inhaltlich stark: Es zeigt, dass die Agentin sich weiterbildet, und macht
laufende Arbeit sichtbar, bevor sie ein Ergebnis hat.

---

## Phase 6 — GitHub-Integration

### 6.1 GitHub-Account

Neues Feld in den Einstellungen, in derselben Struktur wie die übrigen Social-Kanäle
(LinkedIn, Instagram, Facebook, YouTube, X).

Öffentlich sichtbar an zwei Stellen:
- **Footer**, bei den Social-Media-Icons
- **Legende**, im Abschnitt „Folgen & vernetzen"

GitHub-Icon ergänzen, konsistent zum bestehenden Icon-Set.

### 6.2 Repositories bei Publikationen

Erweitere das Publikations-Modell um den Typ `REPOSITORY` (siehe auch Phase 10.2):

```
Publication
  type            BOOK | COURSE | REPOSITORY | ARTICLE | PODCAST | INTERVIEW
  repoUrl         nur bei REPOSITORY
  repoDescription lokalisiert
  language        Programmiersprache, optional
  identities      n:m → Identity
```

**Öffentlich:** Auf `/de/publikationen` erscheinen Repositories als eigener Abschnitt
**nach Büchern und Kursen**. Darstellung: Repo-Name, Beschreibung, Sprache, Link.

Keine Live-Abfrage der GitHub-API zur Laufzeit — Sterne und Forks sind für diese Seite
kein relevantes Signal und erzeugen nur eine Abhängigkeit und ein Datenschutzthema.
Alle Angaben werden gepflegt.

---

## Phase 7 — Kontakt: LinkedIn und E-Mail

### 7.1 Datenmodell

Neues Feld `contactEmail` in den Einstellungen, pflegbar im Admin. Ebenso `postalAddress`
(mehrzeilig) — beides wird auch vom Impressum in Phase 11 gelesen, damit Nicole die
Adresse **an einer Stelle** pflegt.

Optionaler Spam-Schutz: E-Mail nicht als Klartext ins Markup, sondern clientseitig
zusammensetzen — aber **nur**, wenn sie ohne JavaScript trotzdem erreichbar bleibt.
Die Impressumspflicht verlangt ständige Verfügbarkeit; ein rein JS-abhängiger
`mailto:`-Link ist riskant. Im Zweifel Klartext.

### 7.2 Legende-Kontaktbereich

Der Text lautet aktuell sinngemäß: schreib mir auf LinkedIn, rechtlich verpflichtend
ist zusätzlich eine E-Mail-Adresse, die findest du im Impressum.

Das liest sich, als wäre die E-Mail ein lästiges Rechtsartefakt. Ersetze es durch eine
gleichwertige Darstellung zweier Kontaktwege:

- **Primär: LinkedIn** — Button führt auf das in den Einstellungen hinterlegte Profil
- **Sekundär: E-Mail** — aus `contactEmail`, als eigener Button

Textentwurf DE (`ENTWURF`):
> **Zwei Kanäle.** Für Anfragen zu Vorträgen, Workshops und Beratung erreichst du mich
> am schnellsten über LinkedIn. Wenn dir E-Mail lieber ist, geht das genauso.

EN entsprechend. Fällt `contactEmail` weg, wird der zweite Button ausgeblendet und der
Text fällt auf die LinkedIn-Variante zurück.

---

## Phase 8 — Sessionize-Backfill

### Das Problem

Die Startseite zeigt „1 Einsätze · 1 Länder · 1 Briefings" — direkt daneben „7× MVP,
20 Zertifizierungen, 10 Bücher", und auf der Ausbildung-Seite stehen vier
Sessionize-Auszeichnungen „Most Active Speaker" 2022–2025. Die Seite widerlegt sich
selbst, und die Weltkarte — das Herzstück des Konzepts — ist leer.

Das ist die dringendste inhaltliche Aufgabe des gesamten Projekts.

### 8.1 Bestand prüfen

Es existieren bereits ein Import-Schema `die-agentin/import` (Version 1, Entitäten
`missions` und `briefings`, Briefings referenzieren Missions über Slugs im
`deliveries`-Array) und ein Python-Generator `build.py`. Finde beides, lies es, und
berichte: welche Quellen werden verarbeitet, was fehlt, was steht in `_unresolved`.

### 8.2 Importer

Idempotenter Import-Befehl, der die JSON-Dateien in die Datenbank schreibt:

- Upsert über Slug, kein Duplizieren bei mehrfachem Lauf
- Dry-Run mit Diff-Ausgabe: was würde angelegt, geändert, gelöscht
- Schema-Validierung vor dem Schreiben, mit klaren Fehlermeldungen
- Abschlussreport: Anzahl je Entität, übersprungene Einträge mit Grund

### 8.3 Datenqualität — kritisch

- Die `activities`-Einträge aus dem MVP-Portal-Export (2022–2026) enthalten
  **MVP-Einreichungszeitstempel, nicht die echten Veranstaltungsdaten.** Die
  Legacy-Einträge (2019–2022) enthalten echte Daten. Der Importer darf
  Einreichungsdaten niemals stillschweigend als Eventdatum übernehmen — solche
  Einträge landen in einer Review-Queue.
- **Online-Events:** `countryCode: "AQ"`, `city: "Online"`, deterministischer
  Längengrad-Ring um die Antarktis (`lat` −72 bis −78), damit sie sich auf der Karte
  visuell trennen. Prüfe, ob der Generator das bereits so macht.
- Einträge ohne verlässliches Datum werden **nicht publiziert**, sondern als `DRAFT`
  angelegt (Phase 4) und in einer Liste ausgegeben, die Nicole abarbeiten kann.
- Ordne importierten Einsätzen und Briefings Identitäten und Fachgebiete zu, soweit
  aus Titel und Abstract ableitbar. Bei Unsicherheit leer lassen, nicht raten.

### 8.4 Einsätze-Ansicht: Standardfilter aktuelles Jahr

Nach dem Backfill werden es viele. `/de/einsaetze` zeigt standardmäßig die Einsätze des
**aktuellen Jahres** plus alle zukünftig geplanten. Die bestehenden Filter (Welt /
Europa / DACH / Alle / Geplant / 2026) um eine Jahresauswahl ergänzen, die alle Jahre
mit Einsätzen anbietet, sowie „Alle Jahre".

Der aktive Filter steht in der URL, damit gefilterte Ansichten teilbar sind, und wird
server-seitig angewendet — nicht im Client nachträglich ausgeblendet. Die Zählungen
in der Kennzahlenleiste beziehen sich weiterhin auf **alle** Einsätze, nicht auf die
gefilterte Auswahl. Kennzeichne das im Label.

### 8.5 Dokumentation

`docs/IMPORT.md`: wie der Import läuft, welche Quellen es gibt, wie neue Daten nachgezogen werden.

**STOP** für: fehlende oder widersprüchliche Veranstaltungsdaten · Sessionize-PDF-Daten
ohne bestätigte Termine · LinkedIn-Export (war beim letzten Versuch leer, muss neu
gezogen werden).

---

## Phase 9 — Einsatzakte mit Belegmaterial

Eine Einsatzakte enthält heute Titel, Datum, Veranstaltungslink und das Briefing.
Das ist ein Kalendereintrag, keine Akte.

### 9.1 Modell erweitern

Alle Felder optional, Altdaten dürfen nicht brechen:

```
Mission
  slidesUrl              plus Plattformangabe
  recordingUrl           YouTube-Kanal existiert und ist nirgends eingebunden
  photos                 mehrere Bilder mit Bildunterschrift und Credit
  recapDe / recapEn      TipTap, optional
  feedbackScore          numerisch, plus Quelle
  coSpeakers             Name plus optionaler Link
  sessionType            KEYNOTE | SESSION | WORKSHOP | PANEL
  sessionLanguage
  attendeeCount          optional
  identities             n:m → Identity (Phase 2)
```

### 9.2 Detailseite

Reihenfolge: Fakten → Identität(en) → Briefing → Material (Slides, Video, Fotos) → Recap.
**Leere Sektionen werden nicht gerendert.** Keine „nicht verfügbar"-Platzhalter.

Video-Einbettung datenschutzfreundlich: `youtube-nocookie`, oder Vorschaubild mit
Klick-zum-Laden. Kein Auto-Load von Drittanbieter-Ressourcen ohne Interaktion.
Notiere in `docs/DATENVERARBEITUNG.md`, was daraus für die Datenschutzerklärung folgt.

---

## Phase 10 — Briefings, Publikationen, Ausbildung ins Narrativ einbetten

Diese drei Bereiche stehen aktuell unverbunden neben der Story. Sie müssen erzählerisch
eingeordnet werden, ohne dass ihre Funktion verloren geht.

### 10.1 Briefings — was die Agentin mitbringt

Ein Briefing ist im Vokabular korrekt: das, was sie zu einem Einsatz mitbringt. Es ist
aber kein eigener Hauptnavigationspunkt, sondern gehört zum Einsatz-Kontext.

- Route bleibt, wandert aus der Hauptnavigation in den Einsätze-Bereich
  (Sekundärnavigation oder Tab auf der Einsätze-Seite)
- Identitätszuordnung sichtbar machen
- **Briefing-Detailseiten prüfen:** Die Übersicht scheint nicht auf Detailseiten zu
  verlinken. Falls es keine gibt, anlegen: Abstract, Identitäten, Fachgebiete, Dauer,
  Sprachen, Liste aller Deliveries mit Link auf die jeweilige Einsatzakte, Material.
- Auf der Übersicht Zuordnung zur Identität als Filter anbieten

### 10.2 Publikationen — schriftlich festgehalten

- Typ-Erweiterung wie in Phase 6.2, Reihenfolge der Abschnitte: Bücher → Kurse →
  Repositories → Artikel/Podcasts/Interviews
- **Linkkonsistenz:** Aktuell verlinken fünf Titel auf Rheinwerk und fünf auf Amazon.
  Vereinheitlichen auf die Verlagsseite, wo vorhanden. Wo für ältere Titel keine
  Verlagsseite mehr existiert, dokumentiere das und lass Amazon stehen.
- Identitätszuordnung. Das ist inhaltlich wichtig: Die sechs SharePoint- und Teams-Bücher
  sind der Beleg dafür, dass die Collaboration-Identität kein Etikett ist, sondern
  fünfzehn Jahre Substanz.

### 10.3 Ausbildung — eine Agentin bildet sich weiter

Die Seite trägt bereits die richtige Überschrift. Ergänzungen:

- Abschnitt „In Ausbildung" mit geplanten Zertifizierungen (Phase 5.3)
- Identitätszuordnung der Zertifizierungen, damit auf einer Identitätsseite die
  passenden Nachweise erscheinen
- Reihenfolge: In Ausbildung → Microsoft-Zertifizierungen → Methodische
  Zertifizierungen → MVP Awards → Auszeichnungen

### 10.4 Kennzahlen der Startseite

Nach dem Backfill stimmen die Zahlen wieder. Ergänze **Identitäten** als Kennzahl und
prüfe alle Labels auf Konsistenz („1 Einsätze" ist grammatikalisch falsch — Singular-
und Pluralformen lokalisiert behandeln).

---

## Phase 11 — Rechtstexte, vollständig, DE und EN

Nicole schreibt diese Texte nicht selbst. Du lieferst vollständige, verwendbare Fassungen.
Sie sind keine Rechtsberatung — vermerke das in `docs/PROGRESS.md` mit der Empfehlung,
sie vor dem Cutover einmal fachkundig prüfen zu lassen.

### 11.1 Datenverarbeitungs-Inventur — zuerst

Bevor du die Datenschutzerklärung schreibst: Prüfe den **tatsächlichen Code**, rate nicht.
Ergebnis nach `docs/DATENVERARBEITUNG.md`:

- Hosting (Azure Container Apps, Region), Azure SQL — Auftragsverarbeitung
- Server-Logs: was wird geloggt, wie lange aufbewahrt
- Auth.js + Entra ID (nur Admin-Login, trotzdem relevant)
- Eingebettete Drittinhalte: YouTube (Phase 9), Kartendaten — **bestätige explizit, dass
  d3-geo mit gebündeltem TopoJSON arbeitet und kein externer Tile-Provider aufgerufen wird**
- Schriften: lokal eingebunden oder extern geladen?
- Analytics: vorhanden oder nicht?
- RSS-Feed
- LinkedIn-Auto-Posting, falls implementiert
- Kontaktaufnahme per E-Mail (Phase 7)
- Cookies: welche werden tatsächlich gesetzt, technisch notwendig oder nicht

Wenn die Inventur ergibt, dass **keine** einwilligungspflichtigen Dienste eingesetzt
werden, brauchst du **kein Cookie-Banner** — und dann setz auch keins. Halte das in
`docs/DATENVERARBEITUNG.md` fest.

### 11.2 Impressum

Nicole ist **Privatperson**, kein Unternehmen. Sie hat **keine Umsatzsteuer-ID** —
das Feld darf nicht vorkommen. Anschrift und E-Mail-Adresse werden im Adminbereich
gepflegt (Phase 7.1) und hier ausgelesen, nicht doppelt erfasst.

Struktur:

```
Angaben gemäß § 5 DDG
  Name                       → aus Einstellungen
  Anschrift                  → postalAddress aus Einstellungen
Kontakt
  E-Mail                     → contactEmail aus Einstellungen
  LinkedIn                   → aus Social-Kanälen
Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
  Name und Anschrift         → dieselben Felder
Haftung für Inhalte
Haftung für Links
Urheberrecht
Streitschlichtung / EU-Plattform
```

Texte für die letzten vier Blöcke schreibst du vollständig aus, DE und EN. Zur
Streitschlichtung: Als Privatperson ohne Verbrauchergeschäft ist Nicole nicht zur
Teilnahme verpflichtet — formuliere entsprechend, ohne eine Pflicht zu suggerieren.

Im Admin: Validierungshinweis, wenn Name, Anschrift oder E-Mail leer sind, mit dem
klaren Hinweis, dass die Seite ohne diese Angaben nicht öffentlich gehen darf.

**STOP:** Die konkreten Werte für Anschrift und E-Mail trägt Nicole ein. Trage das
in `docs/PROGRESS.md` unter „Braucht Input von Nicole" ein.

### 11.3 Datenschutzerklärung

Vollständiger Text, DE und EN, auf Basis der Inventur aus 11.1. Keine
Copy-Paste-Generator-Textbausteine für Dienste, die gar nicht eingesetzt werden.
Struktur:

Verantwortlicher · Allgemeines zur Datenverarbeitung (Rechtsgrundlagen Art. 6 DSGVO) ·
Hosting und Server-Logfiles · Cookies (nur was tatsächlich gesetzt wird) ·
Eingebettete Inhalte Dritter · Kontaktaufnahme · RSS-Feed · Betroffenenrechte
(Art. 15–21 DSGVO) · Beschwerderecht bei der Aufsichtsbehörde · Speicherdauer ·
Änderungen dieser Erklärung mit Stand-Datum.

Das Stand-Datum wird automatisch aus dem letzten Änderungsdatum des Texts gesetzt.

### 11.4 Barrierefreiheits-Erklärung — Rahmung ändern

**Wichtig, hier ist die aktuelle Annahme vermutlich falsch.** Die Seite fällt
voraussichtlich **nicht** unter das BFSG: Sie ist eine reine Informations-Website ohne
Verkaufs- oder Buchungsfunktion, und zusätzlich greift die Kleinstunternehmer-Ausnahme
im Dienstleistungsbereich. Als Privatperson ohne kommerzielles Angebot erst recht.

Die Erklärung darf sich deshalb **nicht** auf BFSG oder BITV als Rechtsgrundlage berufen.
Formuliere sie als **freiwillige Selbstverpflichtung**. Das ist die ehrlichere und
zugleich stärkere Aussage — sich auf eine nicht anwendbare Rechtsgrundlage zu berufen
ist angreifbar und wirkt unprofessioneller als die freiwillige Version.

Struktur: angestrebter Standard (WCAG 2.1 Level AA) · aktueller Stand und
Selbsteinschätzung · bekannte Einschränkungen · Feedback-Kontakt (`contactEmail`) ·
Datum der letzten Prüfung.

### 11.5 Einbindung

Alle drei Seiten DE und EN, im Footer verlinkt, von jeder Seite mit einem Klick
erreichbar. Texte als TipTap-Inhalte im Admin pflegbar, damit Nicole sie später ändern
kann, ohne zu deployen — mit Ausnahme der aus den Einstellungen gezogenen Felder.

---

## Phase 12 — Frontend-Redesign

### 12.0 Zur SPA-Frage — bitte vollständig lesen

Der Wunsch nach einer Single Page Application steht im direkten Widerspruch zum Ziel
maximaler Auffindbarkeit über Suchmaschinen und KI-Systeme (Phase 13). Eine echte SPA
rendert Inhalte clientseitig; genau die Crawler, auf die Phase 13 zielt, führen kein
oder nur unzuverlässig JavaScript aus. Die beiden Phasen würden sich gegenseitig aufheben.

**Es ist auch nicht nötig.** Der Next.js App Router liefert bereits clientseitige Soft
Navigation zwischen Seiten — kein Full Reload, kein Flackern, erhaltener Scroll-State.
Was moderne Sites von dieser unterscheidet, ist nicht die Architektur, sondern **Motion
und Erzählform**. Genau das baust du hier, mit Server-Rendering und damit ohne einen
einzigen SEO-Nachteil:

- **View Transitions API** für Übergänge zwischen Übersicht und Detail. Element-Kontinuität:
  Die Identitätskarte wird zum Header der Identitätsseite, der Kartenpin zum Header der
  Einsatzakte. Progressive Enhancement — Browser ohne Unterstützung bekommen einen
  normalen Wechsel.
- **Scroll-getriebene Startseite** als zusammenhängende Erzählung statt Kachelraster.
- **Orchestrierte Ladesequenz** statt verstreuter Einzeleffekte.
- `prefers-reduced-motion` durchgängig respektiert. Ohne Motion muss alles funktionieren.

Wenn Nicole trotzdem eine klassische SPA will, ist das eine bewusste Entscheidung gegen
Phase 13. **STOP** und frag nach, bevor du in diese Richtung baust.

### 12.1 Designarbeit vor Code

Erst planen, dann bauen. Schreibe den Plan nach `docs/DESIGN.md`, bevor du eine Zeile
CSS anfasst:

- **Farbpalette:** 4–6 benannte Hex-Werte. Leite sie aus dem bestehenden Erscheinungsbild
  ab — die Marke hat bereits eine Anmutung, das hier ist kein Neuanfang. Identitätsfarben
  müssen sich in die Palette einfügen und untereinander unterscheidbar bleiben, auch für
  Menschen mit Farbfehlsichtigkeit.
- **Typografie:** Display-, Body- und Utility-Face mit klarer Rollentrennung. Die
  Label-Ästhetik der Marke („Klassifizierung: öffentlich", „Hauptquartier · Status aktiv")
  ist ein tragendes Element — sie braucht eine eigene, präzise gesetzte Utility-Schrift.
  Schriften lokal einbinden, keine externen Requests zur Laufzeit (siehe Phase 11.1).
- **Signature-Element:** Der **Umschlag** als Darstellung einer Identität. Das ist das
  eine Element, an das man sich erinnern soll. Setz die Boldness hier ein und halte alles
  andere ruhig.
- **Layout-Konzept** als ASCII-Wireframe für Startseite und Identitätsseite.

Prüfe deinen Plan gegen den Vorwurf der Beliebigkeit: Wenn ein Teil davon aussieht wie
das, was du für jede beliebige Personal-Brand-Seite bauen würdest, überarbeite ihn und
schreib auf, was du geändert hast und warum. Erst dann Code.

### 12.2 Startseite

Reihenfolge und Auftrag jeder Sektion:

1. **Die Agentin.** Nicole wird als Agentin vorgestellt, mit der **Doppeldeutigkeit
   explizit ausgesprochen** — Spionin und die Person, die AI Agents baut. Dazu
   „Enders / keine losen Enden". Dieser Text ist der Kern der Marke und steht bislang
   nirgends auf der Website. Textentwurf als `ENTWURF` markiert, Nicole überarbeitet.
2. **Die Legende.** Kurzfassung der Deckgeschichte, Link auf die vollständige Legende.
3. **Die Identitäten.** Die Umschläge, nebeneinander, gleichrangig. Klick führt auf die
   Identitätsseite. Keine Reihenfolge, die Chronologie suggeriert.
4. **Einsätze im Fokus.** Nächster Einsatz prominent, Karte oder Kartenausschnitt,
   Link auf die vollständige Einsatzliste.
5. **Zuletzt eingegangen.** Die neuesten Depeschen, mit Identitätsfarbe markiert.
6. **Kennzahlen.** Einsätze, Länder, Briefings, Identitäten, MVP-Awards,
   Zertifizierungen, Bücher.

Die aktuelle Rollenzeile ADVISOR · ARCHITECT · DEVELOPER · TRAINER · SPEAKER bleibt,
wird aber an die Identitäten angebunden, statt lose zu stehen.

### 12.3 Legende

1. **Wer ich bin** — Intro, Porträt
2. **Warum Agentin** — die Doppeldeutigkeit ausführlich, drei Absätze:
   (a) Agent/Agentin und der Bezug zu Agentic AI, (b) Enders → keine losen Enden,
   (c) was daraus für die Arbeitsweise folgt. Als `ENTWURF`.
3. **Die Identitäten** — ausführlicher als auf der Startseite. Hier gehört das
   Umschlag-Bild hin: Eine Identität kommt als Umschlag mit Ausweis, Geld und Unterlagen.
   Jede Identität mit Bild, Deckname, Rolle, Beschreibung, Link auf die Detailseite.
4. **Abdeckung** — welche Fachgebiete, wie tief, seit wann. **Ohne Enddatum, ohne
   Timeline, ohne Phasen.** Rahmensatz darüber (`ENTWURF`): Die Gebiete bauen technisch
   aufeinander auf — Informationsarchitektur in SharePoint ist die Grundlage für
   Copilot-Qualität, Copilot Studio ist Power Platform, Foundry ist die Code-Ebene
   darunter. Breite ist hier Tiefe über den ganzen Stack.
5. **Codebuch** — kompaktes Glossar, das die Sektionsnamen übersetzt: HQ, Einsätze,
   Identitäten, Depeschen, Legende, Briefings. Zweispaltig, Begriff links, ein Satz rechts.
   Story-Element und Usability-Fix in einem. Nutzt endlich die zweite Bedeutung von
   „Legende" als Kartenlegende.
6. **Arbeitsweise** — die bestehenden sechs Kacheln (Strategie, Architektur, Umsetzung,
   Adoption, Enablement, Impact) und die Werkzeug-Logos, hierher verschoben.
7. **Kontakt** — LinkedIn und E-Mail (Phase 7.2), Social-Icons inklusive GitHub.

### 12.4 Bilder für die Identitäten

Nicole erzeugt die Bilder extern und lädt sie über den Adminbereich hoch (Felder
`portraitImageId` und `envelopeImageId` aus 2.1). Schreibe die Prompts nach
`docs/BILDPROMPTS.md`. Basis-Prompt für das Umschlag-Motiv, den sie pro Identität
anpassen kann:

> A cinematic still-life photograph, top-down flat lay on a dark matte surface.
> An opened manila envelope with its contents spilled out: a laminated ID badge,
> a folded dossier with visible but unreadable text, a few banknotes, a small
> brass key, and a handwritten note. The objects relate to **[THEMA DER IDENTITÄT]** —
> [KONKRETE OBJEKTE, z. B. „a network diagram sketch and a Teams-style call icon
> stamped on the badge"]. Muted color grading, one dominant accent color:
> **[IDENTITÄTSFARBE]**. Hard directional light from the upper left, deep shadows,
> shallow depth of field. Analog film grain, 35mm. No visible faces, no legible text,
> no logos, no brand marks. Editorial photography, understated, not glossy.
> Aspect ratio 4:5.

Hinweise, die mit in die Datei gehören:
- Pro Identität nur **die Objekte** und **die Akzentfarbe** austauschen. Alles andere
  gleich lassen — die Serie muss als Serie erkennbar sein.
- „No logos, no brand marks" ist wichtig: keine echten Microsoft-Marken in generierten
  Bildern.
- Kein Gesicht — die Identität ist die Rolle, nicht die Person. Das Porträt bleibt der
  Legende vorbehalten.
- Ergebnisse als WebP, mindestens 1600px lange Kante, mit lokalisierten Alt-Texten.
- Für das **Portrait** (`portraitImageId`, quadratisch) braucht es ein zweites,
  einfacheres Motiv: derselbe Bildstil, aber nur der Ausweis bzw. das zentrale Objekt
  der Identität, formatfüllend. Schreib dafür eine Kurzvariante des Prompts in dieselbe
  Datei. Beide Motive einer Identität müssen als Paar erkennbar sein.

### 12.5 Motion und Detail

- View Transitions für Übersicht → Detail, mit Element-Kontinuität
- Umschlag-Interaktion: eine zurückhaltende Hover- oder Scroll-Reveal-Geste, die die
  Metapher aufgreift. **Ein** Effekt, gut gemacht, nicht drei.
- Karte: Pins nach Identitätsfarbe, Legende darunter entsprechend, Tastaturbedienbarkeit
  der Pins sicherstellen (Tab-Reihenfolge, Fokus sichtbar, Enter öffnet die Akte)
- Leere Zustände sind Aufforderungen, keine Entschuldigungen. Vorhandene Formulierungen
  wie „Sobald ich etwas teile, erscheint es hier" prüfen und im Vokabular schärfen.

### 12.6 Abschlussprüfung

Lighthouse und axe über die wichtigsten Seiten. Ergebnisse und offene Punkte nach
`docs/PROGRESS.md`. Ziel: keine Fehler bei Kontrast, Fokus, Alternativtexten,
Überschriftenhierarchie und Sprachauszeichnung.

---

## Phase 13 — SEO und Auffindbarkeit für KI-Systeme

### 13.1 Metadata

- `generateMetadata` pro Route, eigene Description je Seite **und je Sprache**.
  Aktuell tragen fast alle Seiten dieselbe generische Site-Description; nur `/signale`
  hat eine eigene. 140–160 Zeichen, kein Keyword-Stuffing. Für statische Seiten als
  lokalisierte Konstanten mit `ENTWURF`-Markierung, für Detailseiten aus den Entity-Daten.
- Titel konsistent: `<Seitentitel> · DIE AGENTIN`, für Detailseiten
  `<Entity> · <Sektion> · DIE AGENTIN`.
- **hreflang** vollständig: `de`, `en`, `x-default` auf die deutsche Variante.
  Auch für Detailseiten korrekt auflösen.
- **Lokalisierte Slugs** für die englische Fassung (`/en/missions` statt `/en/einsaetze`,
  `/en/identities`, `/en/drops`, `/en/legend`), mit Redirects von den deutschen Pfaden.
  Trade-off: zweites Slug-Set im Datenmodell. Für die Zielgruppe internationaler
  Konferenzen ist es die richtige Investition.
- **Alt-Texte lokalisieren.** Auf der englischen Startseite steht aktuell noch
  `alt="Nicole als Agentin"`. Media-Tabelle um `altDe`/`altEn` erweitern, bestehende
  Werte nach DE übernehmen, EN als Fallback bis gepflegt.
- `robots.txt` und `sitemap.xml` als Route Handler, hostabhängig (Phase 1.2), Sitemap
  mit allen Sprachvarianten und `lastmod` aus den Entity-Daten, unter Beachtung der
  Sichtbarkeitsregel aus Phase 4.

### 13.2 Dynamische OG-Images

Mit `next/og` `ImageResponse`. Gemeinsame Template-Komponente im Look aus `docs/DESIGN.md`.
Varianten: Einsatzakte (Event, Ort, Datum) · Depesche (Titel, Identität, Format) ·
Identität (Deckname, Rolle, Akzentfarbe) · Briefing · Fallback für statische Seiten.
1200×630, Schriften lokal, Labels sprachabhängig.

Hoher Hebel, weil LinkedIn Nicoles Hauptkanal ist und jeder geteilte Link derzeit
dasselbe statische Bild zeigt.

### 13.3 Strukturierte Daten

Im gerenderten Markup ist aktuell kein JSON-LD vorhanden. Für dieses Profil ist das der
größte ungenutzte Hebel — sowohl für klassische Suche als auch für Systeme, die Entitäten
auslesen.

Zentrale, typisierte Helper. Ausgabe als `<script type="application/ld+json">` im Server
Component. Alle Entitäten in einem `@graph` mit stabilen `@id`.

- **Person** (`https://nicolenders.com/#person`): `name`, `jobTitle`, `description`,
  `image`, `url`, `sameAs` (LinkedIn, Instagram, Facebook, YouTube, X, **GitHub**,
  Sessionize-Profil, MVP-Profil), `award` aus den MVP- und Sessionize-Auszeichnungen,
  `knowsAbout` aus den Fachgebieten.
- **WebSite** mit `inLanguage`, `publisher` → Person. **WebPage** je Seite.
- **Book** je Publikation: `name`, `author` → `@id`, `isbn`, `datePublished`,
  `publisher`, `image`, `url`. Das Teams-Buch existiert in drei Auflagen — entscheide
  zwischen separaten `Book`-Entitäten und `workExample`/`bookEdition`, begründe und
  dokumentiere. **Course** für die LinkedIn-Learning-Kurse.
  **SoftwareSourceCode** für Repositories.
- **Event** je Einsatz: `name`, `startDate`, `location` (`Place` mit `address`, für
  Online-Events `VirtualLocation`), `eventAttendanceMode`, `eventStatus`,
  `performer` → `@id`, `superEvent` bei Konferenzreihen.
- **Article** bzw. **BlogPosting** je Depesche, mit `datePublished`, `dateModified`, `author`.
- **BreadcrumbList** auf allen Detailseiten.

Keine Daten in JSON-LD, die nicht auch sichtbar auf der Seite stehen.

### 13.4 Auffindbarkeit für KI-Systeme

Systeme wie ChatGPT, Claude, Perplexity und Copilot lesen Seiten anders als klassische
Crawler. Was hilft:

- **Server-gerendertes HTML** — deshalb Phase 12.0. Ohne das ist der Rest wirkungslos.
- **Semantische Struktur:** eine `h1` pro Seite, saubere Überschriftenhierarchie,
  `<article>`, `<time datetime>` für alle Datumsangaben, `<address>` im Impressum.
- **Fakten als Text, nicht nur als Grafik.** Wo Zahlen in Kacheln stehen, muss die
  Aussage auch als Fließtext existieren („Microsoft MVP seit 2020, siebenmal in Folge").
- **`llms.txt`** im Root: kurzer Abriss, wer Nicole ist, welche Fachgebiete sie abdeckt,
  welche Seiten die maßgeblichen sind, mit absoluten URLs. Kein Standard mit garantierter
  Wirkung, aber billig und schadet nicht. Aus den Entity-Daten generieren, nicht
  hartkodieren.
- **`robots.txt`:** KI-Crawler nicht pauschal aussperren. Nicole *will* in diesen
  Systemen auffindbar sein. Falls im Bestand Disallow-Regeln für GPTBot, ClaudeBot,
  PerplexityBot oder ähnliche existieren: **STOP** und nachfragen, bevor du sie entfernst.
- **Eine kanonische Fakten-Seite:** Die Legende ist die Quelle, aus der ein KI-System
  die Kurzbiografie zieht. Sie muss die Kernaussagen in einfachen, vollständigen Sätzen
  enthalten — nicht nur in Kacheln und Labels.
- **RSS-Feed** prominenter verlinken. Aktuell steht er unauffällig im Footer.

### 13.5 Abschlussbericht

Fünf Beispiel-URLs mit ihren tatsächlichen Meta-Tags, ein Beispiel-JSON-LD pro
Entitätstyp, und eine Liste der Felder, die noch leer sind, weil Daten fehlen.

---

## Phase 14 — Domain-Migration und Cutover

`nicolenders.com` läuft heute als WordPress.com-Blog „Nicole's Microsoft 365 & Azure
Playground" mit Jahren an Inhalt unter `/blog/`, `/category/*`, `/about-me/` und
Einzelbeiträgen. Diese URLs haben Backlinks und Ranking-Historie. Ohne Plan verbrennen
wir sie.

### 14.1 URL-Inventar

WordPress.com-Sitemap auslesen, alle URLs nach `data/legacy-urls.csv`
(`url, typ, titel, datum`). Zusätzliche Quellen einlesbar machen (Search-Console-Export,
den Nicole liefert).

### 14.2 Redirect-Map

`data/redirects.csv` (`from, to, statusCode, note`), versioniert. Erzeuge einen Vorschlag
mit Heuristik und markiere alles Unsichere als `REVIEW`:

- `/about-me/` → `/de/legende`
- Blog-Posts → `/de/depeschen/<slug>`, Format je nach Inhalt
- Kategorien → Identitäts- oder Fachgebietsseiten
- Ohne sinnvolles Ziel: Vorschlag `410` statt Redirect auf die Startseite, pro Fall begründet

**STOP:** Nicole geht die `REVIEW`-Zeilen durch, bevor du sie aktivierst.

Umsetzung in der Middleware, aus der CSV geladen, mit Test-Suite: jede Zeile liefert den
erwarteten Statuscode und Zielpfad, keine Ketten, keine Schleifen.

### 14.3 Archiv für Altinhalte

Für Beiträge, die migriert werden, aber nicht gepflegt sind — etwa SharePoint-2013-Artikel.
Vorschlag im Vokabular: **„Kalte Akten"**. Eigene Route, deutlich sichtbarer Hinweis auf
Stand und fehlende Pflege, für Suchmaschinen indexierbar (die Backlinks sind der Punkt),
aber nicht in den normalen Depeschen-Listen. Identitäten trotzdem zuordnen.

Ehrlich und im Vokabular: eine kalte Akte ist ein abgeschlossener Fall, keine Altlast.

### 14.4 Cutover-Checkliste

Nach `docs/CUTOVER.md`, in Reihenfolge, mit definiertem Rollback-Punkt:

1. Custom Domain und Managed Certificate auf der Container App
2. `PUBLIC_SITE_HOST` umstellen — damit greifen noindex-Middleware und canonical
   automatisch richtig herum
3. DNS-TTL vorher senken, dann Wechsel
4. Verifikation: `robots.txt`, Sitemap, canonical, hreflang, Stichproben-Redirects,
   OG-Vorschau über den LinkedIn Post Inspector
5. Search Console: beide Properties, Sitemap einreichen, Adressänderung beantragen
6. WordPress.com: was passiert mit dem Altsystem, wie lange bleibt es erreichbar
7. 404-Monitoring in den ersten Wochen

**STOP:** DNS-Änderungen, Azure-Subscription-Aktionen, Entra-Registrierung und
Search-Console-Zugriff macht Nicole selbst. Bereite alles vor und schreib genau auf,
was sie klicken muss.

### 14.5 Gesamtabschluss

Geh `docs/PROGRESS.md` vollständig durch und erzeuge eine Abschlussliste:

- alle offenen Punkte
- alle Stellen mit `ENTWURF`-Texten, die noch überarbeitet werden müssen
- alle leeren Pflichtfelder
- alle vertagten Folgepunkte (Drag & Drop im Redaktionsplan, „Alles herunterladen"
  im Speaker-Kit, Speaker-Kit selbst falls nicht umgesetzt)

---

## Anhang A — Speaker-Kit (nach Phase 12, vor Phase 13)

Setze das um. Die Bio-Entwürfe stehen unten in A.1 — sie sind als `ENTWURF` markiert
und werden von Nicole überarbeitet, aber die Seite geht damit nicht leer live.

Für einen Speaker-Brand ist das die wichtigste Conversion-Seite, und sie fehlt komplett.
Ein Veranstalter soll alles in einem Zug bekommen, ohne Mail-Runde.

Route `/de/akte` bzw. `/en/kit`. Namensvorschläge im Vokabular: **„Akte"** oder
**„Ausrüstung"** — beide passen; frag Nicole.

Inhalte: Bio in drei Längen (ca. 50 / 150 / 400 Wörter), DE und EN, mit
Copy-to-Clipboard · Pressefotos in Web- und Druckauflösung mit Credit und
Nutzungshinweis · Identitäten und Fachgebiete, automatisch gezogen · Formate, Sprachen,
Dauer · technische Anforderungen als Rich Text · Reisebereitschaft · Auszeichnungen
kompakt aus der bestehenden Quelle, nicht dupliziert · Referenzen und Testimonials als
neue Entität (Zitat, Person, Rolle, Organisation, Event-Bezug, **Freigabe-Flag** —
nur freigegebene werden gerendert) · Kontakt-CTA.

### A.1 Bio-Entwürfe

Trage diese Texte als Startwerte in die Bio-Felder ein, jeweils mit
`ENTWURF — von Nicole zu prüfen` markiert. Dritte Person, weil Veranstalter Bios so
ins Programm übernehmen. Die Website selbst spricht weiter in der ersten Person.

**Prüfpflicht vor Veröffentlichung:** Die mit ⚠ markierten Angaben stammen aus
Sekundärquellen und können veraltet sein. Setze dort `TODO(nicole)` und lass Nicole
bestätigen, bevor die Texte publiziert werden. Erfinde nichts nach.

---

#### Kurz (ca. 50 Wörter) — DE

> Nicole Enders ist Microsoft MVP, siebenmal in Folge seit 2020, und Autorin von zehn
> Fachbüchern zu SharePoint, Microsoft Teams und Microsoft 365. Sie arbeitet an der
> Grenze zwischen Konfiguration und Entwicklung — von Information Architecture bis zu
> Agents mit Copilot Studio und Microsoft Foundry. Auf Konferenzen ist sie regelmäßig
> als Speakerin unterwegs.

#### Kurz (ca. 50 Wörter) — EN

> Nicole Enders is a Microsoft MVP, awarded seven years running since 2020, and the
> author of ten technical books on SharePoint, Microsoft Teams and Microsoft 365.
> She works on the line between configuration and code — from information architecture
> through to agents built with Copilot Studio and Microsoft Foundry. She speaks
> regularly at conferences across Europe. ⚠ Reichweite „across Europe" gegen die
> tatsächliche Einsatzhistorie prüfen.

---

#### Mittel (ca. 150 Wörter) — DE

> Nicole Enders ist Microsoft MVP — siebenmal in Folge seit 2020 — und beschäftigt sich
> seit über fünfzehn Jahren mit Zusammenarbeit in Unternehmen. ⚠ Arbeitgeber und Rolle
> ergänzen.
>
> Ihre Themen bauen aufeinander auf: Information Architecture in SharePoint, Modern Work
> mit Microsoft Teams und Microsoft 365, Low Code auf der Power Platform, und heute
> Agents mit Microsoft 365 Copilot, Copilot Studio und Microsoft Foundry. Dazu kommt
> KI in der Softwareentwicklung, bewusst herstellerübergreifend.
>
> Sie hat zehn Fachbücher bei Rheinwerk geschrieben und Kurse für LinkedIn Learning
> produziert. Sessionize hat sie viermal in Folge als Most Active Speaker ausgezeichnet.
>
> Auf der Bühne interessiert sie weniger die Demo als die Frage dahinter: Was muss
> vorhanden sein, damit die Technik im Alltag trägt? Ein Copilot ist so gut wie die
> Informationsarchitektur, auf der er sitzt.

#### Mittel (ca. 150 Wörter) — EN

> Nicole Enders is a Microsoft MVP, awarded seven years running since 2020, and has
> spent more than fifteen years working on collaboration in organisations.
> ⚠ Add employer and role.
>
> Her topics build on one another: information architecture in SharePoint, modern work
> with Microsoft Teams and Microsoft 365, low code on the Power Platform, and today
> agents built with Microsoft 365 Copilot, Copilot Studio and Microsoft Foundry.
> Alongside that, she works on AI in software development — deliberately
> vendor-neutral.
>
> She has written ten technical books for Rheinwerk and produced courses for LinkedIn
> Learning. Sessionize has named her a Most Active Speaker four years running.
>
> On stage she is less interested in the demo than in the question behind it: what has
> to be in place for the technology to hold up in daily work? A Copilot is only as good
> as the information architecture it sits on.

---

#### Lang (ca. 400 Wörter) — DE

> Nicole Enders ist Microsoft MVP und wurde seit 2020 siebenmal in Folge ausgezeichnet.
> Seit über fünfzehn Jahren beschäftigt sie sich mit der Frage, wie Zusammenarbeit in
> Unternehmen tatsächlich funktioniert — nicht als Produktvorführung, sondern als
> Architektur- und Adoptionsfrage. ⚠ Arbeitgeber und Rolle ergänzen.
>
> Ihre Themen sind kein Nacheinander, sondern ein Stack. Sie hat Intranets und
> Collaboration-Lösungen auf SharePoint gebaut, lange bevor Information Architecture ein
> KI-Thema wurde. Sie hat den Umstieg auf Microsoft Teams und Microsoft 365 begleitet,
> auf Anwender- wie auf Entwicklerseite. Sie arbeitet mit der Power Platform, wo die
> Grenze zwischen Konfiguration und Code verhandelbar wird. Und sie baut heute Agents
> mit Microsoft 365 Copilot, Copilot Studio und Microsoft Foundry — auf denselben
> Fundamenten, die sie seit Jahren kennt. Dazu kommt seit Kurzem KI in der
> Softwareentwicklung, bewusst herstellerübergreifend und nicht auf ein Ökosystem
> festgelegt.
>
> Was diese Themen verbindet, ist eine Grenze, die sich immer wieder verschiebt: die
> zwischen Konfigurieren und Entwickeln. Listen und Webparts gegen Custom Code.
> App Studio gegen Teams Toolkit. Low Code gegen Custom Connectors und PCF. Deklarative
> Agents gegen eigenen Code in Foundry. Auf dieser Grenze arbeitet Nicole seit fünfzehn
> Jahren — und deshalb ist die Breite ihrer Themen keine Beliebigkeit, sondern Tiefe
> über den ganzen Stack.
>
> Ihr Wissen gibt sie in Büchern, Kursen und auf Konferenzen weiter. Bei Rheinwerk sind
> zehn Titel von ihr erschienen, darunter „Microsoft Teams: Die verständliche Anleitung"
> in mittlerweile dritter Auflage sowie „SharePoint für Anwender" und „Modern Workplace
> mit Microsoft 365". Für LinkedIn Learning hat sie Kurse zur Teams-Entwicklung
> produziert. Sessionize hat sie viermal in Folge als Most Active Speaker ausgezeichnet.
> Neben ihren Microsoft-Zertifizierungen hat sie sich methodisch zertifiziert — unter
> anderem als iSAQB Certified Professional for Software Architecture.
>
> In ihren Sessions geht es selten nur um Features. Häufiger um die Frage, was vorhanden
> sein muss, damit Technik im Arbeitsalltag trägt: Berechtigungen, Struktur, Governance,
> Akzeptanz. Ein Copilot ist so gut wie die Informationsarchitektur, auf der er sitzt —
> und die entsteht nicht von selbst.

#### Lang (ca. 400 Wörter) — EN

> Übersetze die deutsche Langfassung sinngemäß, nicht wörtlich. Behalte die Struktur
> (Einstieg, Stack statt Chronologie, die Grenze zwischen Konfiguration und Code,
> Publikationen und Auszeichnungen, Haltung auf der Bühne) und den nüchternen Ton.
> Englische Fachbegriffe bleiben Fachbegriffe. Als `ENTWURF` markieren.

---

### A.2 Faktenbasis

Diese Angaben stammen aus dem bestehenden Datenbestand der Website und sind belastbar:

- Microsoft MVP seit 2020, siebenmal in Folge
- 10 Bücher, Rheinwerk Computing / Rheinwerk Vierfarben / Galileo Computing
- Kurse bei LinkedIn Learning (Teams-Entwicklung, Teams Toolkit, Power Apps)
- Sessionize „Most Active Speaker" 2022, 2023, 2024, 2025
- 20 Zertifizierungen, darunter iSAQB CPSA-F, ITIL 4 Foundation, PSM, CSPO
- Fachgebiete wie in Phase 2 gelistet

⚠ **Nicht belastbar, muss Nicole bestätigen:** Arbeitgeber und Rolle, „über fünfzehn
Jahre" als exakte Angabe, geografische Reichweite der Speaking-Tätigkeit, Aussagen über
den Anteil einzelner Themen.

Zieh die harten Zahlen zur Laufzeit aus der Datenbank statt sie im Bio-Text
festzuschreiben, wo das ohne Sprachbruch geht — sonst veraltet die Bio beim nächsten
MVP-Award.

---

## Anhang B — Was Nicole liefern muss

Führe diese Liste in `docs/PROGRESS.md` fort und ergänze sie, sobald neue Punkte auftauchen.

| Was | Für Phase |
|---|---|
| Decknamen der Identitäten, DE und EN | 2 |
| Beschreibungstexte der Identitäten | 2 |
| Identitätsbilder (Portrait + Umschlag) aus `docs/BILDPROMPTS.md`, Upload im Admin | 12 |
| Akzentfarbe je Identität bestätigen | 2 |
| Ladungsfähige Anschrift | 11 |
| Kontakt-E-Mail-Adresse | 11 |
| GitHub-Account-URL | 6 |
| Sessionize- und MVP-Profil-URLs für `sameAs` | 13 |
| Bestätigte Veranstaltungsdaten für unklare Einsätze | 8 |
| Neuer LinkedIn-Datenexport (der letzte war leer) | 8 |
| Freigabe der `REVIEW`-Zeilen in der Redirect-Map | 14 |
| Überarbeitung aller `ENTWURF`-Texte | laufend |
| Bio-Entwürfe aus Anhang A.1 prüfen, ⚠-Angaben bestätigen | Anhang A |
| DNS, Azure- und Search-Console-Aktionen | 14 |
