# Audit-Umsetzung — nicolenders.com / die-agentin

**Basis-Commit:** `f4dd0ab` (main, 2026-08-17)
**Audit-Stand:** 2026-08-17, Live-Site + Repo
**Zielbranch:** `fix/audit-2026-08`

Diese Datei ist die vollständige Arbeitsgrundlage. Jede Aufgabe hat: Datei, Ist-Zustand, Soll-Zustand, Akzeptanzkriterium. Aufgaben sind nach Risiko/Wirkung sortiert, nicht nach Aufwand.

**Legende Aufwand:** `XS` < 5 Min · `S` < 30 Min · `M` 1-3 h · `L` > 3 h

---

## Inhaltsverzeichnis

- [Phase 0 — Vorbereitung](#phase-0--vorbereitung)
- [Phase 1 — SEO & Metadaten (P0)](#phase-1--seo--metadaten-p0)
- [Phase 2 — Dictionary-Bereinigung & Markenstimme (P1)](#phase-2--dictionary-bereinigung--markenstimme-p1)
- [Phase 3 — Typografie: Gedankenstriche (P1)](#phase-3--typografie-gedankenstriche-p1)
- [Phase 4 — Inhaltliche Korrektheit (P2)](#phase-4--inhaltliche-korrektheit-p2)
- [Phase 5 — Recht (P2)](#phase-5--recht-p2)
- [Phase 6 — UX / Informationsarchitektur (P3)](#phase-6--ux--informationsarchitektur-p3)
- [Phase 7 — Redaktionelle Aufgaben (nicht Code)](#phase-7--redaktionelle-aufgaben-nicht-code)
- [Definition of Done](#definition-of-done)
- [Bewusst nicht geändert](#bewusst-nicht-geändert)

---

## Phase 0 — Vorbereitung

### 0.1 Branch & Baseline `XS`

```bash
git checkout -b fix/audit-2026-08
npm ci
npm run lint && npx tsc --noEmit && npm test
```

Baseline muss grün sein, bevor irgendetwas geändert wird. Falls nicht: Fehler dokumentieren, nicht mitfixen.

### 0.2 Reihenfolge-Regel

Phase 1 zuerst und **separat committen**. Sie ist die einzige Phase mit sofortiger Außenwirkung auf Suchmaschinen und Social Previews. Phasen 2-6 können danach in beliebiger Reihenfolge, jede als eigener Commit.

---

## Phase 1 — SEO & Metadaten (P0)

### 1.1 `PUBLIC_SITE_HOST` in Production setzen `XS` — kein Code

**Ist:** `og:image`, `og:image:*`, `twitter:image` zeigen auf jeder Seite auf
`https://nicolenders-prod-web.wittybush-b6a6f63e.westeurope.azurecontainerapps.io/...`

**Ursache:** `lib/site.ts` → `canonicalHost()` liest `PUBLIC_SITE_HOST`, fällt sonst auf den Host aus `NEXT_PUBLIC_SITE_URL` zurück. In der Container App ist `PUBLIC_SITE_HOST` offensichtlich nicht gesetzt.

**Folgeschäden derselben Ursache:**
- `metadataBase` in `app/(site)/[locale]/layout.tsx` → alle relativen Alternates lösen gegen Staging auf
- `PERSON_ID()` / `WEBSITE_ID()` in `lib/seo/jsonld.ts` → JSON-LD `@id` auf Staging
- `app/llms.txt/route.ts` → alle absoluten URLs auf Staging
- `app/sitemap.ts` → siehe oben

**Soll:**
```
PUBLIC_SITE_HOST=nicolenders.com
```
als Environment Variable in der Azure Container App (`nicolenders-prod-web`) setzen, Revision neu ausrollen.

**Akzeptanzkriterium:**
```bash
curl -s https://nicolenders.com/de | grep -oE 'og:image" content="[^"]+"'
# darf keine azurecontainerapps.io mehr enthalten
curl -s https://nicolenders.com/de | grep -oE '<link rel="alternate"[^>]+>'
# hreflang-URLs müssen auf https://nicolenders.com zeigen
```

> **Hinweis für die Umsetzung:** Der Code ist korrekt. Hier wird **nichts** an `lib/site.ts` geändert. Wenn diese Aufgabe nicht ausgeführt werden kann (kein Azure-Zugriff), dann als offenen Punkt im PR-Text vermerken und mit 1.2 weitermachen.

---

### 1.2 Eigene Meta-Description je Seite `M`

**Ist:** `app/(site)/[locale]/layout.tsx` setzt `description: dict.hq.lead`. Seiten ohne eigenes `generateMetadata` erben die Startseiten-Description.

**Betroffen (erben aktuell falsch):**

| Route | `generateMetadata`? | `description`? |
|---|---|---|
| `legende` | ja | **nein** |
| `einsaetze` | ja | **nein** |
| `einsaetze/[slug]` | ja | **nein** |
| `briefings` | ja | **nein** |
| `publikationen` | ja | **nein** |
| `ausbildung` | ja | **nein** |
| `cv` | ja | **nein** |
| `impressum` | **nein** | **nein** |
| `datenschutz` | **nein** | **nein** |
| `barrierefreiheit` | **nein** | **nein** |

**Soll:** Jede Route bekommt `title` **und** `description`. Neue Keys im Dictionary unter `meta`, damit DE/EN typgleich bleiben:

```ts
// lib/i18n/dictionaries/de.ts
meta: {
  home: "Nicole Enders, Microsoft MVP seit 2020: Vorträge, Beratung und Umsetzung rund um Microsoft AI, Copilot Studio und Modern Work.",
  legende: "Wer hinter der Agentin steckt: Microsoft MVP seit 2020, Autorin, Speakerin. Mission, Arbeitsweise und das Codebuch zur Seite.",
  einsaetze: "Alle Auftritte auf der Weltkarte: Konferenzen, Meetups und Online-Events, filterbar nach Jahr, Werkzeug und Identität.",
  briefings: "Das komplette Vortragsrepertoire zu Microsoft AI, Copilot, Modern Work und Power Platform, filterbar nach Thema.",
  publikationen: "Fachbücher und Online-Kurse zu Microsoft 365, Teams und Power Platform.",
  ausbildung: "Microsoft-Zertifizierungen, MVP-Auszeichnungen und Schulungen im Überblick.",
  cv: "Beruflicher Werdegang, Projektreferenzen, Zertifizierungen und Publikationen von Nicole Enders.",
  impressum: "Anbieterkennzeichnung nach § 5 DDG und § 18 Abs. 2 MStV.",
  datenschutz: "Wie diese Website mit personenbezogenen Daten umgeht.",
  barrierefreiheit: "Selbstverpflichtung zur Barrierefreiheit dieser Website und Kontakt für Rückmeldungen.",
},
```

```ts
// lib/i18n/dictionaries/en.ts
meta: {
  home: "Nicole Enders, Microsoft MVP since 2020: talks, advisory and delivery around Microsoft AI, Copilot Studio and Modern Work.",
  legende: "Who the agent is: Microsoft MVP since 2020, author and speaker. Mission, way of working and the codebook to this site.",
  einsaetze: "Every appearance on the world map: conferences, meetups and online events, filterable by year, tool and identity.",
  briefings: "The full talk repertoire on Microsoft AI, Copilot, Modern Work and Power Platform, filterable by topic.",
  publikationen: "Technical books and online courses on Microsoft 365, Teams and Power Platform.",
  ausbildung: "Microsoft certifications, MVP awards and trainings at a glance.",
  cv: "Career, selected projects, certifications and publications of Nicole Enders.",
  impressum: "Provider identification under § 5 DDG and § 18 (2) MStV.",
  datenschutz: "How this website handles personal data.",
  barrierefreiheit: "Voluntary accessibility commitment for this website and how to report issues.",
},
```

**Regel:** Alle Descriptions ≤ 155 Zeichen. Keine dynamischen Zahlen (`221 Einsätze`) in Descriptions — die veralten still.

**Detailseiten** (`einsaetze/[slug]`, `identitaeten/[slug]`, `depeschen/[slug]`) bauen die Description aus Entity-Daten. Für `identitaeten/[slug]` ist die aktuelle Description zu kurz (Beispiel: `"Vom Chatbot zum handelnden System."`, 33 Zeichen). Soll: Tagline + erster Satz der Beschreibung, hart auf 155 Zeichen gekürzt an der letzten Wortgrenze.

**Akzeptanzkriterium:** Kein Wert von `dict.meta.*` erscheint auf mehr als einer Route. Playwright-Smoke-Test ergänzen, der über alle Routen läuft und Duplikate in `<meta name="description">` findet.

---

### 1.3 `canonical` + `hreflang` je Route `M`

**Ist:** Kein einziges `alternates.canonical` in `app/(site)`. Die `languages`-Map steht nur im Layout und ist auf `/de` bzw. `/en` fixiert — also auf jeder Unterseite falsch.

**Soll:** Helper anlegen und in **jedem** `generateMetadata` verwenden:

```ts
// lib/seo/alternates.ts (neu)
import type { Metadata } from "next";
import type { Locale } from "@/lib/i18n/config";
import { canonicalUrl } from "@/lib/site";

/**
 * Canonical + hreflang für eine Route. `path` ist der Pfad OHNE Locale-Präfix
 * und ohne führenden Slash, z. B. "legende" oder "einsaetze/cim-lingen-2026".
 * Leerer String = HQ.
 */
export function alternatesFor(locale: Locale, path = ""): Metadata["alternates"] {
  const suffix = path ? `/${path}` : "";
  return {
    canonical: canonicalUrl(`/${locale}${suffix}`),
    languages: {
      de: canonicalUrl(`/de${suffix}`),
      en: canonicalUrl(`/en${suffix}`),
      "x-default": canonicalUrl(`/de${suffix}`),
    },
  };
}
```

Im Layout die statische `languages`-Map entfernen (sie wird sonst auf Unterseiten vererbt und widerspricht der Route-spezifischen). Die RSS-`types`-Angabe bleibt im Layout.

**Akzeptanzkriterium:** Jede öffentliche Route liefert genau ein `<link rel="canonical">` mit ihrer eigenen absoluten URL unter `nicolenders.com`, und `hreflang`-Paare, die auf dieselbe Route in der jeweils anderen Sprache zeigen.

---

### 1.4 `title.default` aussagekräftig machen `XS`

**Datei:** `app/(site)/[locale]/layout.tsx`

**Ist:** `` `${dict.brand.name} — nicolenders.com` `` → `DIE AGENTIN — nicolenders.com`. Enthält weder den Namen noch ein Thema.

**Soll:**
```ts
title: {
  default: dict.meta.titleDefault,
  template: `%s · ${dict.brand.name}`,
},
```
```ts
// de.ts
titleDefault: "Nicole Enders · DIE AGENTIN · Microsoft AI & Modern Work",
// en.ts
titleDefault: "Nicole Enders · DIE AGENTIN · Microsoft AI & Modern Work",
```

**Akzeptanzkriterium:** `<title>` der Startseite enthält „Nicole Enders". Unterseiten behalten das Template.

---

### 1.5 Copyright-Jahr dynamisch `XS`

**Datei:** `components/layout/SiteFooter.tsx`, Zeile ~16

```diff
- const year = 2026;
+ const year = new Date().getFullYear();
```

**Akzeptanzkriterium:** Kein hartkodiertes Jahr mehr im Repo. `grep -rn "2026" components/ app/ --include="*.tsx" | grep -v migrations` liefert keine Copyright-Treffer.

---

## Phase 2 — Dictionary-Bereinigung & Markenstimme (P1)

Alle Änderungen in `lib/i18n/dictionaries/de.ts` und `lib/i18n/dictionaries/en.ts`. **`de.ts` definiert den Typ `Dictionary`** — jede Strukturänderung muss in beiden Dateien synchron erfolgen, sonst schlägt `tsc` fehl. Das ist gewollt und die beste Absicherung dieser Phase.

### 2.1 Tote Keys entfernen `S`

Es gibt keine Routen `/signale` und `/dossiers` mehr (`lib/nav.ts` ist auf fünf Punkte reduziert, Phase 3.3 des Umbaus).

**Zu löschen in beiden Dictionaries:**

| Key | Grund |
|---|---|
| `nav.signale` | Route existiert nicht |
| `nav.dossiers` | Route existiert nicht, Konzept in „Depesche" aufgegangen |
| `feed` (kompletter Block) | `feed.eyebrow`, `feed.title`, `feed.lead`, `feed.filterByType`, `feed.empty`, `feed.types.*` — kein Consumer im Code |
| `hq.lastSignal` | kein Consumer |
| `hq.classification` | kein Consumer |
| `hq.roles` | toter Fallback, Rollen kommen aus `HomeContent` in der DB |

**Vorgehen:** Für jeden Key vor dem Löschen `grep -rn "keyname" app components lib` ausführen und bestätigen, dass es keinen Consumer gibt. **Falls doch ein Consumer existiert: Key behalten und im PR-Text vermerken.** Nicht blind löschen.

**Akzeptanzkriterium:** `npx tsc --noEmit` grün, `npm test` grün, `npm run build` grün.

---

### 2.2 `hq.lead` — „Funde" und „Dossiers" existieren nicht `S`

**Ist (de.ts):**
> „Nicole Enders — Microsoft MVP seit 2020, 7× in Folge. Ich entwerfe, baue und erkläre Lösungen rund um Microsoft AI und Modern Work. Hier laufen meine **Funde, Dossiers** und Einsätze zusammen."

„Dossiers" wurde in „Depeschen" konsolidiert. „Funde" existiert als Konzept nirgends auf der Seite. Der Satz nennt drei Dinge, von denen zwei nicht in der Navigation vorkommen.

**Soll (de.ts):**
```
Nicole Enders, Microsoft MVP seit 2020, 7× in Folge. Ich entwerfe, baue und erkläre Lösungen rund um Microsoft AI und Modern Work. Hier laufen Einsätze, Identitäten und Depeschen zusammen.
```

**Soll (en.ts):**
```
Nicole Enders, Microsoft MVP since 2020, seven years running. I design, build and explain solutions around Microsoft AI and Modern Work. Missions, identities and dispatches all come together here.
```

> Der Lead bleibt sichtbarer Hero-Text. Als Meta-Description dient ab jetzt `meta.home` (Aufgabe 1.2), weil der Lead mit 213 Zeichen in der SERP abgeschnitten wird.

**Wichtig:** Derselbe Text steht zusätzlich im `HomeContent`-Datensatz in der DB (Admin → Startseite). Der Hero rendert `hero.leadValue`, **nicht** `dict.hq.lead`. Also muss der Text **auch im Admin** gepflegt werden, sonst ändert sich auf der Live-Seite nichts. → siehe Aufgabe 7.1.

**Akzeptanzkriterium:** `grep -rn "Funde\|Dossiers" lib/ app/ components/` liefert nur noch Treffer in Prisma-Migrations (historisch, bleiben).

---

### 2.3 Ich-Form statt dritter Person `XS`

**Datei:** beide Dictionaries, `identity.lead`

**Ist (de):** „**Nicole tritt** je nach Thema unter verschiedenen Identitäten auf, parallel und dauerhaft aktiv. Jede ist offen als **ihre** eigene ausgewiesen."

Die gesamte übrige Seite spricht in der Ich-Form. Das ist die einzige prominente Ausnahme, und sie steht auf einer Hauptnavigationsseite.

**Soll (de):**
```
Je nach Thema trete ich unter verschiedenen Identitäten auf, parallel und dauerhaft aktiv. Jede ist offen als meine eigene ausgewiesen.
```

**Soll (en):**
```
Depending on the topic I work under different identities, parallel and permanently active. Each is openly declared as my own.
```

**Akzeptanzkriterium:** Keine dritte Person („Nicole tritt", „Nicole works", „her own") mehr in nutzersichtbaren Strings. Ausnahme: Impressum, Bios in der Akte, JSON-LD `Person`.

---

### 2.4 `footer.rights` widerspricht `langNotice` `XS`

**Ist:** `rights: "Alle Inhalte in DE und EN verfügbar."` — im Footer gerendert als „© 2026 Nicole Enders · Alle Inhalte in DE und EN verfügbar."

Direkt daneben existiert `langNotice.onlyGerman: "Dieser Beitrag ist bisher nur auf Deutsch verfügbar."`. Beides kann nicht gleichzeitig stimmen. Zusätzlich heißt der Key `rights`, enthält aber keine Rechteangabe, steht aber an der Position, an der Nutzer eine erwarten.

**Soll:**
```ts
// de.ts
rights: "Alle Rechte vorbehalten.",
// en.ts
rights: "All rights reserved.",
```

Die Sprachverfügbarkeit kommuniziert der DE/EN-Switcher im Header bereits.

---

### 2.5 Weitere Dictionary-Korrekturen `S`

| Key | Ist (DE / EN) | Soll (DE / EN) | Grund |
|---|---|---|---|
| `identity.coverage` | `Was hier belegt wird` / `What this proves` | `Belege` / `Track record` | umständlich, Passiv |
| `footer.aboutHeading` | `Über mich als Agentin` / `About me as an agent` | `Die Agentin selbst` / `The agent herself` | EN liest sich holprig, DE-Genus geht verloren |
| `nav.ausbildung` | `Ausbildung` / `Credentials` | `Nachweise` / `Credentials` | siehe 2.6 |
| `langNotice.onlyGerman` | „… ist bisher nur auf Deutsch verfügbar." / „This article is only available in German." | EN: `"This article is not available in English yet."` | „bisher" fehlt in EN, ändert die Aussage |
| `errors.notFound` | `Diese Seite gibt es nicht.` / `This page does not exist.` | `Diese Akte existiert nicht.` / `This file does not exist.` | Markenstimme |
| `errors.notFoundHint` | `Vielleicht wurde sie verschoben. Zurück zum HQ.` / `It may have moved. Back to HQ.` | `Entweder wurde sie verlegt, oder sie war nie angelegt.` / `Either it was moved, or it never existed.` | CTA gehört in den Button, nicht in den Fließtext |
| `errors.backToHq` | **neu** | `Zurück zum HQ` / `Back to HQ` | siehe 6.6 |

---

### 2.6 „Ausbildung" ist der falsche Begriff `S`

**Problem:** `/de/ausbildung` enthält Microsoft-Zertifizierungen, MVP Awards und Schulungen. „Ausbildung" bedeutet im Deutschen Berufsausbildung. Verschärfend: der Lebenslauf unter `/de/cv` hat eine eigene Sektion „Ausbildung" im Sinne von *Education*. Zwei Bedeutungen, ein Wort, zwei Seiten. EN löst es mit „Credentials" bereits richtig.

**Soll:**
- `nav.ausbildung: "Nachweise"` (DE), `"Credentials"` (EN) bleibt
- H1 auf `/ausbildung`: `Nachweise · Zertifizierungen & Awards` (siehe 6.1)
- Route-Slug `/ausbildung` **bleibt unverändert** — kein Redirect nötig, kein Backlink-Risiko
- `app/(site)/[locale]/cv/page.tsx:153` behält `"Ausbildung"` / `"Education"` — dort ist es korrekt

---

## Phase 3 — Typografie: Gedankenstriche (P1)

### 3.1 Regel

Ziel: das Geviertstrich-Muster `—` aus nutzersichtbarem Text entfernen, weil es in deutschem Fließtext orthografisch falsch ist und als KI-Marker gelesen wird.

**Vorgehen in dieser Priorität:**

1. **Satz umbauen.** Ersetze den Einschub durch Komma, Doppelpunkt oder zwei Sätze. Das ist in der Mehrzahl der Fälle die beste Lösung und der eigentliche Fix.
2. **Nur wenn der Einschub trägt:** Halbgeviertstrich `–` mit Leerzeichen davor und dahinter.
3. **Niemals** Bindestrich `-` als Gedankenstrich. Der ist orthografisch falsch und tauscht ein Stilproblem gegen einen Rechtschreibfehler.

> Für englische Strings gilt: `—` ist dort korrekte Typografie. Trotzdem der Konsistenz halber auf `,` / `:` / `–` umbauen, damit DE und EN denselben Rhythmus haben.

### 3.2 Geltungsbereich

**Umbauen:** nutzersichtbare Strings, also

- `lib/i18n/dictionaries/de.ts`, `en.ts` (5 bzw. 3 Vorkommen)
- alle String-Literale in `app/(site)/**/page.tsx` und `components/**/*.tsx`, die gerendert werden
- `app/llms.txt/route.ts` (Fließtext-Zeilen)
- `app/(site)/[locale]/opengraph-image.tsx` (`alt`)

**Nicht anfassen:**

| Stelle | Grund |
|---|---|
| Code-Kommentare (169 Vorkommen) | für Nutzer unsichtbar, `—` dort ist Repo-Konvention |
| `app/(site)/[locale]/briefings/page.tsx:61` — `talkLanguageLabel(...) ?? "—"` | Platzhalter-Glyphe für fehlenden Wert, kein Gedankenstrich |
| `app/(site)/[locale]/cv/page.tsx:51` — `<span className="meta"> — {e.description}</span>` | Trennglyphe zwischen Feldern, kein Gedankenstrich |
| `prisma/migrations/**` | historisch, nie ändern |
| `CLAUDE.md`, `CLAUDE_TASKS.md`, `docs/**` | interne Doku |
| Inhalte in der Datenbank | separat, siehe 7.2 |

### 3.3 Konkrete Umbauten

`app/(site)/[locale]/page.tsx:97-98` (Doppeldeutigkeits-Box)
```
DE ist:   „Agentin" hat zwei Bedeutungen — und ich meine beide: die, die im Verborgenen arbeitet und Fäden verbindet, und die, die AI Agents baut. „Enders" heißt: keine losen Enden.
DE soll:  „Agentin" hat zwei Bedeutungen, und ich meine beide: die, die im Verborgenen arbeitet und Fäden verbindet, und die, die AI Agents baut. „Enders" heißt: keine losen Enden.

EN ist:   "Agent" means two things here — and I mean both: ...
EN soll:  "Agent" means two things here, and I mean both: ...
```

`app/(site)/[locale]/legende/page.tsx:82-84` (whyAgent DE)
```
ist:   Agent, Agentin — das Wort trägt zwei Bedeutungen, und ich beanspruche beide. ... die Software, die im Auftrag handelt — Agentic AI, Copilot Studio, Microsoft Foundry.
soll:  Agent, Agentin: Das Wort trägt zwei Bedeutungen, und ich beanspruche beide. ... die Software, die im Auftrag handelt: Agentic AI, Copilot Studio, Microsoft Foundry.

ist:   Enders ist mein Name — und zugleich ein Versprechen: keine losen Enden.
soll:  Enders ist mein Name und zugleich ein Versprechen: keine losen Enden.

ist:   Was muss vorhanden sein, damit die Technik trägt — Struktur, Berechtigungen, Governance, Akzeptanz?
soll:  Was muss vorhanden sein, damit die Technik trägt? Struktur, Berechtigungen, Governance, Akzeptanz.
```

`app/(site)/[locale]/legende/page.tsx:62-75` (Codebuch, beide Sprachen)
```
ist:   Hauptquartier — die Startseite, das Lagebild.
soll:  Hauptquartier: die Startseite, das Lagebild.

ist:   Decknamen — die Rollen, unter denen ich auftrete.
soll:  Decknamen: die Rollen, unter denen ich auftrete.

ist:   Deckgeschichte und Kartenlegende zugleich — diese Seite.
soll:  Deckgeschichte und Kartenlegende zugleich, also diese Seite.
```

`app/(site)/[locale]/legende/page.tsx:197-198`
```
ist:   Eine Identität kommt als Umschlag — mit Ausweis, Geld und Unterlagen.
soll:  Eine Identität kommt als Umschlag: mit Ausweis, Geld und Unterlagen.
```

`app/(site)/[locale]/akte/page.tsx:65`
```
ist:   Zahlen aus dem laufenden Bestand — sie veralten nicht mit der Bio.
soll:  Zahlen aus dem laufenden Bestand. Sie veralten nicht mit der Bio.
```

`app/(site)/[locale]/ausbildung/page.tsx:31-32`
```
ist:   Zertifizierungen, MVP-Auszeichnungen, Schulungen und aktuelle Themen — getrennt nach Bereichen.
soll:  Zertifizierungen, MVP-Auszeichnungen, Schulungen und aktuelle Themen, getrennt nach Bereichen.
```

`app/(site)/[locale]/page.tsx:62`
```
ist:   Die Agentin — Markenbild / Die Agentin — brand visual
soll:  Die Agentin · Markenbild / Die Agentin · brand visual
```

`app/(site)/[locale]/opengraph-image.tsx:28`
```
ist:   Die Agentin — nicolenders.com
soll:  Die Agentin · nicolenders.com
```

`app/(site)/[locale]/briefings/page.tsx:71-72` — wird in Aufgabe 4.1 ohnehin neu geschrieben.

`lib/i18n/dictionaries/*` — die Treffer in `hq.lead`, `dispatch.lead`, `identity.lead` sind durch 2.2 und 2.3 bereits abgedeckt. Verbleibende einzeln prüfen.

`app/llms.txt/route.ts` — Zeilen im `>`-Block umbauen, z. B.
```
ist:   Arbeitet an der Grenze zwischen Konfiguration und Entwicklung — von Information
soll:  Arbeitet an der Grenze zwischen Konfiguration und Entwicklung, von Information
```

### 3.4 Absicherung

Test ergänzen, der Regressionen verhindert:

```ts
// tests/typography.test.ts (neu)
// Verhindert, dass Geviertstriche zurück in nutzersichtbare Strings wandern.
import de from "@/lib/i18n/dictionaries/de";
import en from "@/lib/i18n/dictionaries/en";

function collectStrings(obj: unknown, path = ""): [string, string][] { /* rekursiv */ }

for (const dict of [de, en]) {
  for (const [path, value] of collectStrings(dict)) {
    expect(value, `Geviertstrich in ${path}`).not.toContain("—");
  }
}
```

**Akzeptanzkriterium:**
```bash
grep -rn "—" --include="*.tsx" --include="*.ts" app components lib \
  | grep -v "^\S*: *//" | grep -v "^\S*: *\*" | grep -v "?? \"—\"" | grep -v "cv/page.tsx:51"
# darf leer sein
```

---

## Phase 4 — Inhaltliche Korrektheit (P2)

### 4.1 `/briefings`: Copy behauptet Sortierung, die nicht stattfindet `M`

**Ist:** Lead sagt „sortiert nach Häufigkeit". Tatsächlich wird nach Kategorie gruppiert und darin alphabetisch nach Titel sortiert. Innerhalb „Modern Work" steht 3× vor 5× vor 1×.

**Soll:** Beides angleichen.

**a) Sortierung fixen** in `lib/queries/briefings.ts` bzw. `components/briefings/*`: primär `deliveryCount DESC`, sekundär `title ASC`. Die Häufigkeit ist das stärkste Signal der Seite und gehört nach oben.

**b) Lead neu:**
```
DE: Mein Vortragsrepertoire, filterbar nach Thema und Identität. Die Zahl hinter dem Titel zeigt, wie oft ich den Vortrag gehalten habe.
EN: My talk repertoire, filterable by topic and identity. The number after each title shows how often I have delivered it.
```

**Akzeptanzkriterium:** Erster Eintrag der ungefilterten Liste ist der Talk mit dem höchsten Count (aktuell „Der intelligente Arbeitsplatz mit Microsoft Teams & AI Builder", 18×).

---

### 4.2 Dublette im Repertoire `S`

**Ist:** „Mehr Team‑Power mit KI: Agentensysteme für Microsoft 365 Copilot" existiert **zweimal**:

| Titel | Kategorie | Count | Dauer |
|---|---|---|---|
| `Mehr Team\u2011Power mit KI: …` (Non-Breaking Hyphen U+2011) | Agentic AI, Microsoft 365 | 1× | 60′ |
| `Mehr Team-Power mit KI: …` (normaler Bindestrich U+002D) | Copilot & Agents | 0× | 45′ |

Beim Import ist ein Merge durchgerutscht, weil die Slug-Normalisierung U+2011 nicht auf U+002D abbildet.

**Soll:**
1. Beide Datensätze in der DB zusammenführen. Behalten: der Datensatz mit `deliveryCount = 1`. Deliveries des zweiten umhängen, dann zweiten archivieren (`archivedAt`).
2. Titel auf normalen Bindestrich normalisieren.
3. `lib/slug.ts` härten: U+2011, U+2013, U+2014 vor der Slug-Bildung auf U+002D normalisieren. Test ergänzen.

**Akzeptanzkriterium:** `/de/briefings` zeigt den Titel genau einmal. Neuer Unit-Test in `lib/slug.test.ts` deckt exotische Bindestriche ab.

---

### 4.3 DE/EN-Varianten desselben Talks als separate Briefings `M` — Entscheidung nötig

**Ist:** Dieselbe Session läuft je Sprache als eigenes Briefing:

| DE | EN |
|---|---|
| HR Companion – Bot mit Azure AI Foundry & Microsoft Teams (10×) | HR Companion Reimagined – Building Enterprise-Ready AI Agents with Microsoft Foundry (2×) |
| Mehr Team-Power mit KI: Agentensysteme für Microsoft 365 Copilot (1×) | Empowering Collaboration: Building Agent Systems for Microsoft 365 Copilot (1×) |

Das splittet die Delivery-Counts, bläht die Kennzahl „77 Briefings" auf und macht die neue Häufigkeitssortierung (4.1) unscharf.

**Optionen:**

| Option | Aufwand | Trade-off |
|---|---|---|
| **A** Ein Briefing mit `titleDe` / `titleEn`, Deliveries zusammengeführt | `L`, Schema-Migration | Sauberstes Modell, korrekte Counts, Kennzahl sinkt auf ~70. Größter Eingriff. |
| **B** Beibehalten, aber verlinken (`relatedTalkId`) und in der UI als „auch auf Englisch" ausweisen | `M` | Kein Schemabruch, Counts bleiben gesplittet |
| **C** Status quo | `XS` | Kennzahl bleibt hoch, Datenmodell bleibt unscharf |

**Empfehlung: A.** Das Datenmodell trägt `MissionTalk.language` bereits, die Sprache gehört an die Delivery, nicht an das Briefing. Die Startseite zeigt bei „Meistgefragtes Briefing" schon heute „18× gehalten, davon 15× auf Englisch" — das Muster ist da, es ist nur nicht durchgezogen.

> **Diese Entscheidung nicht autonom treffen.** Beim Erreichen dieser Aufgabe stoppen und Nicole fragen.

---

### 4.4 Veralteter Produktname im Briefing-Titel `XS`

**Ist:** „HR Companion – Bot mit **Azure AI Foundry** & Microsoft Teams". Azure AI Foundry wurde auf der Ignite am 18.11.2025 in **Microsoft Foundry** umbenannt; seit den Product Terms Januar 2026 ist der Name auch dort nachgezogen. Die Werkzeugliste auf `/legende` nutzt bereits korrekt „Microsoft Foundry". Der englische Zwilling desselben Talks ebenfalls.

**Soll:** Titel in der DB anpassen auf „HR Companion – Bot mit Microsoft Foundry & Microsoft Teams".

> Abweichung von der Regel „Originaltitel erhalten": Bei Microsoft-Produktnamen im Titel ist ein veralteter Name auf einem MVP-Profil ein fachlicher Makel, kein historisches Detail. Historische Titel wie „Power Virtual Agents" oder „Azure AI Studio" in älteren Talks bleiben, weil sie den Stand des Vortrags korrekt abbilden.

---

### 4.5 Kategorie „Security & Compliance" ist ein Sammelbecken `M`

**Ist:** Dort einsortiert, obwohl keiner ein Security-Talk ist:

- Copilot in Microsoft Teams: Quick Wins & nachhaltige Adoption
- From Chat to Knowledge – Copilot-Powered Wikis in Teams
- Wissensmanagement meistern mit Microsoft 365
- Menschen im Mittelpunkt des Modern Workplace
- Lernmanagement aktiv in den Unternehmensalltag integrieren mit Microsoft 365
- Work Smarter mit Microsoft 365 & Copilot
- Warum scheitert die Einführung von Microsoft Teams?
- Einführung Ihres modernen Arbeitsplatzes mit Microsoft 365 nach Plan

Gleichzeitig überlappen die Filter-Chips stark: *Agentic AI*, *Copilot & Agents*, *Microsoft 365 Copilot* — davon haben zwei genau ein Briefing.

**Schritt 1 (Code, autonom):** Prüfen, ob es sich um ein Rendering-Problem handelt. Bei Mehrfachzuordnung über `_TalkCategories` könnte die UI nur die *letzte* Kategorie anzeigen statt aller. Falls ja: UI so ändern, dass alle zugeordneten Kategorien als Chips erscheinen. Das könnte den Befund allein erklären.

**Schritt 2 (Daten, nicht autonom):** Falls es echte Zuordnungen sind, Taxonomie auf 5-6 trennscharfe Kategorien konsolidieren. Vorschlag:

| Kategorie | ersetzt |
|---|---|
| Modern Work | Modern Work |
| Copilot & Agents | Copilot & Agents, Agentic AI, Microsoft 365 Copilot |
| Power Platform | Power Platform |
| Governance & Adoption | Security & Compliance (die Adoption-Talks), Teile von Modern Work |
| Engineering | Development |

> Schritt 2 mit Nicole abstimmen. Die Kategorien sind Filter-URLs und damit potenziell verlinkt.

---

### 4.6 „0×" untergräbt das Signal `S`

**Ist:** Über 20 Briefings zeigen `0× · 45′`. Auf einer Seite, deren Wert die Häufigkeit ist, liest sich das wie ein Defekt.

**Soll:** Bei `deliveryCount === 0` statt der Zahl ein Label rendern:
```
DE: Neu im Repertoire
EN: New in the repertoire
```
Neue Dictionary-Keys unter `briefing.newInRepertoire`. Visuell als `.tag` absetzen, nicht als Zähler.

**Akzeptanzkriterium:** Keine `0×`-Angabe mehr auf `/de/briefings` und `/en/briefings`.

---

### 4.7 Dauer 420′ `S`

**Ist:** „Collaboration mit Office 365" und „Work Smarter mit Microsoft 365 & Copilot" zeigen `420′` = 7 Stunden. Das sind Workshops, keine Sessions.

**Soll:** Formatierungs-Helper in `lib/format.ts`:
```ts
/** Vortragsdauer. Ab 90 Minuten in Stunden, weil "420′" niemand als 7 Stunden liest. */
export function formatDuration(min: number, locale: Locale): string {
  if (min < 90) return `${min} Min.`;           // EN: `${min} min`
  const h = min / 60;
  const val = Number.isInteger(h) ? String(h) : h.toFixed(1).replace(".", locale === "de" ? "," : ".");
  return locale === "de" ? `${val} Std.` : `${val} h`;
}
```
Zusätzlich: Briefings ab 180 Min. mit Format-Tag `Workshop` / `Workshop` kennzeichnen. Das speist auch die Formate-Sektion der Akte (6.4).

---

### 4.8 Identitätsseiten: Tabelle nach Event statt Datum sortiert `S`

**Ist:** `/de/identitaeten/agentic-ai`, Spalte Datum: `01.12.2020 → 20.08.2025 → 12.09.2025 → 13.05.2021 → 29.01.2026 → …`. Sortiert wird alphabetisch nach Veranstaltungsname. Bei 27 Zeilen ohne sichtbare Sortiersteuerung wirkt das wie ein Bug.

**Soll:** Default-Sortierung `startDate DESC`. Falls die Tabellenkomponente Sortierung per Spaltenklick unterstützt, Datum als aktive Default-Spalte markieren (`aria-sort="descending"`).

**Akzeptanzkriterium:** Erste Zeile ist der jüngste Einsatz.

---

### 4.9 Falsch zugeordnete Einsätze `S` — Daten, nicht autonom

Auf `/de/identitaeten/agentic-ai` (DIE AGENTENFÜHRERIN) einsortiert, gehören aber woanders hin:

| Einsatz / Briefing | Ist | Soll |
|---|---|---|
| Governance und Security in Microsoft Teams (CONET Webinar 2020) | AGENTENFÜHRERIN | ARCHIVARIN |
| Build an Intranet with Modern SharePoint (SharePoint/M365 Saturday 2020) | AGENTENFÜHRERIN | VERBINDERIN |
| Teams and Yammer – The dream team in your organisation | AGENTENFÜHRERIN | VERBINDERIN |
| Wissensmanagement meistern mit Microsoft 365 (M365 Community Conference 2026) | AGENTENFÜHRERIN | ARCHIVARIN |
| Power Platform Governance (Infinity 365 2026) | AGENTENFÜHRERIN | KONSTRUKTEURIN oder ARCHIVARIN |

> Liste ist nicht abschließend, sie stammt aus der Stichprobe einer Identitätsseite. Die anderen vier Identitäten brauchen denselben Durchgang. **Mit Nicole abstimmen**, sie kennt den tatsächlichen Inhalt der Talks.

---

### 4.10 „14 Länder" verifizieren `S`

**Ist:** Kennzahl auf HQ und in der Akte. Online-Einsätze bekommen laut `lib/import/online.ts` synthetische Antarktis-Koordinaten (37-Grad-Schritt Längengrad, −72 bis −78 Breitengrad).

**Prüfen:** Ob die Länderzählung in `lib/queries/home.ts` (`getHomeStats`) auf `countryCode` basiert und ob Online-Einsätze dort einen Ländercode wie `AQ` tragen. Falls ja, ist die Zahl um 1 zu hoch, und sie steht im Speaker-Kit.

**Soll:** `isOnline === true` aus der Länderzählung ausschließen. Unit-Test mit einem Online-Einsatz im Fixture.

---

## Phase 5 — Recht (P2)

> Keine Rechtsberatung. Umsetzung der Punkte, dann von Nicole prüfen lassen.

### 5.1 § 18 Abs. 2 MStV ergänzen `XS`

**Ist:** Das Impressum nennt nur die Angaben nach § 5 DDG. Die Seite betreibt mit den Depeschen (und den Einsatz-Rückblicken) ein redaktionelles Angebot. Anbieter journalistisch-redaktionell gestalteter Angebote müssen zusätzlich Namen, Vornamen und Anschrift des inhaltlich Verantwortlichen benennen.

**Soll:** In `app/(site)/[locale]/impressum/page.tsx` nach dem Kontakt-Block:

```
DE: Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
    Nicole Enders, Anschrift wie oben.

EN: Responsible for content under § 18 (2) MStV
    Nicole Enders, address as above.
```

Nicht als freien LegalDoc-Text, sondern als strukturierter Abschnitt aus den Settings, analog zu den § 5 DDG-Angaben. Dann bleibt es bei einer Adresspflege an einer Stelle.

### 5.2 Schreibweise Anschrift `XS`

**Ist:** `Siegburger Strasse 62` (Settings → Kontakt)
**Soll:** `Siegburger Straße 62`

→ Admin-Aufgabe, siehe 7.3.

### 5.3 Leerer LegalDoc mit Zeitstempel `S`

**Ist:** Das Impressum zeigt „Zuletzt aktualisiert 15.08.2026" über einem `LegalDoc`, dessen Body leer ist. Haftungs- und Urheberrechtshinweis fehlen. Ein Zeitstempel ohne Inhalt wirkt schlechter als kein Zeitstempel.

**Soll (Code):** Zeitstempel nur rendern, wenn `doc.body` nicht leer ist.
**Soll (Inhalt):** Haftung für Inhalte, Haftung für Links, Urheberrecht ergänzen → 7.4.

### 5.4 Kontaktadresse `XS` — Empfehlung, keine Pflicht

**Ist:** `nicole.enders.de@gmail.com` in Impressum, Speaker-Kit und Legende.
**Soll:** `hallo@nicolenders.com` oder `kontakt@nicolenders.com`.

Rein an der Wirkung: Ein Veranstalter, der über die Akte Kontakt aufnimmt, sieht bei einer Marke mit eigener Domain eine Gmail-Adresse. Code-Änderung: keine, die Adresse kommt aus den Settings.

---

## Phase 6 — UX / Informationsarchitektur (P3)

### 6.1 H1 ist auf fast allen Seiten als Eyebrow gestylt `M`

**Ist:**
```tsx
<h1 className="eyebrow">{isDe ? "Briefings · Vortragsrepertoire" : …}</h1>
```
Dasselbe Muster auf `/einsaetze`, `/identitaeten`, `/depeschen`, `/publikationen`, `/ausbildung`. Der H1 rendert als 10,5px Mono-Versalie mit Letterspacing. Nur die Startseite hat eine echte Display-H1. Ergebnis: jede Unterseite startet ohne visuellen Anker, und der SEO-relevanteste Text ist der kleinste auf der Seite.

**Soll:** Muster der Startseite übernehmen — `<p className="eyebrow">` für die Klassifizierungszeile, darunter eine echte `<h1>`.

| Route | Eyebrow (`<p>`) | H1 (DE) | H1 (EN) |
|---|---|---|---|
| `/briefings` | `Briefings · Vortragsrepertoire` | Was ich mitbringe. | What I bring along. |
| `/einsaetze` | `Einsätze · Weltkarte` | Auftritte, nach Ort sortiert. | Appearances, sorted by place. |
| `/identitaeten` | `Identitäten · Decknamen` | Fünf Identitäten, eine Haltung. | Five identities, one stance. |
| `/depeschen` | `Depeschen · aus dem Feld` | Zwischen den Einsätzen. | Between missions. |
| `/publikationen` | `Publikationen · Bücher & Kurse` | Geschrieben, nicht nur gehalten. | Written, not just delivered. |
| `/ausbildung` | `Nachweise · Zertifizierungen & Awards` | Belegt, nicht behauptet. | Proven, not claimed. |

> H1-Texte sind Vorschläge und dürfen von Nicole überschrieben werden. Die **Struktur** (Eyebrow als `<p>`, echte H1 darunter) ist der Kern der Aufgabe.

**Wichtig:** Keine dynamischen Zahlen in H1 („221 Auftritte"). Die veralten und stehen dann im Google-Snippet.

**Akzeptanzkriterium:** Genau eine `<h1>` je Seite, gerendert in Display-Typografie. Axe-Test in `tests/a11y/axe.spec.ts` um `page-has-heading-one` erweitern.

---

### 6.2 `/akte` und `/legende` haben keine H1 `S`

**Ist:** Beide Seiten starten mit `<h2>`. Bei `/legende`, der Über-mich-Seite, heißt das: Nicoles eigener Name steht nicht in einer H1.

**Soll:**
- `legende/page.tsx:~154` — `<h2>{legend.name}</h2>` → `<h1>`. Styling nicht ändern, die Seite sieht identisch aus.
- `akte/page.tsx:~48` — `<h2>{isDe ? "Für Veranstalter" : "For organisers"}</h2>` → `<h1>`.

---

### 6.3 Sortierung, Filter und leere Zustände auf `/depeschen` `S`

**Ist:** 20 % der Hauptnavigation führen auf „Sobald eine Depesche eingeht, erscheint sie hier." — inklusive vier Format-Filtern für null Inhalte. Zusätzlich bewirbt der Footer einen RSS-Feed ohne Einträge.

**Soll (Code):**
1. Format-Chips nur rendern, wenn `dispatches.length > 0`.
2. Empty State aktiv machen statt passiv:
```
DE: Noch nichts im Umlauf. Die erste Depesche geht in Kürze raus. Bis dahin findest du die Praxis in den Einsätzen.
EN: Nothing in circulation yet. The first dispatch goes out shortly. Until then, the practice is in the missions.
```
mit CTA-Button auf `/{locale}/einsaetze`.
3. RSS-Link im Footer nur rendern, wenn mindestens eine Depesche veröffentlicht ist.

**Nicht im Code lösbar:** Die eigentliche Frage ist, ob Depeschen im Hauptmenü bleiben, solange sie leer sind. → 7.5.

---

### 6.4 `/akte` verspricht „Formate" und liefert sie nicht `M`

**Ist:** Lead und Meta-Description sagen beide „Bios, Fachgebiete, **Formate** und Kontakt". Auf der Seite gibt es: Fakten, Bios (leer), Identitäten, Kontakt. Keine Formate. Zusätzlich ist „Alles in einem Zug" als Idiom schief („in einem Zug" = ohne Unterbrechung trinken oder schreiben).

**Soll (Code):**

Lead korrigieren:
```
DE: Alles an einem Ort: Bios zum Kopieren, Pressefoto, Vortragsformate, Themen und der schnellste Kontaktweg.
EN: Everything in one place: copy-ready bios, press photo, talk formats, topics and the fastest way to reach me.
```

Formate-Sektion ergänzen, gespeist aus `durationMin` der bestehenden Briefings (30/45/60/420 sind alle vorhanden):

| Format | Dauer | Sprache |
|---|---|---|
| Session | 45 Min. | DE / EN |
| Long Session | 60 Min. | DE / EN |
| Lightning Talk | 30 Min. | DE / EN |
| Workshop | halbtägig / ganztägig | DE / EN |

Pressefoto-Download ergänzen: Button auf das hinterlegte Porträt-Medium, `download`-Attribut, plus Hinweis auf die Credits-Pflicht falls vorhanden.

**Nicht im Code lösbar:** Bios sind leer → 7.6. Das ist der Punkt mit dem höchsten direkten Geschäftswert der ganzen Liste.

---

### 6.5 Codebuch ist unvollständig `XS`

**Ist:** Das Codebuch auf `/legende` ist im Code explizit als „Usability-Fix" kommentiert, erklärt aber genau die sechs Begriffe der Hauptnavigation und keinen der drei erklärungsbedürftigen aus dem Footer.

**Soll:** In `legende/page.tsx`, `codebook`-Array um drei Zeilen ergänzen:

```
DE:
Akte          Das Speaker-Kit: Bios, Pressefoto, Formate. Alles, was Veranstalter brauchen.
Nachweise     Zertifizierungen, MVP-Auszeichnungen, Schulungen.
Publikationen Bücher und Kurse.

EN:
File          The speaker kit: bios, press photo, formats. Everything organisers need.
Credentials   Certifications, MVP awards, trainings.
Publications  Books and courses.
```

---

### 6.6 404-Seite ist immer deutsch `S`

**Ist:** `app/(site)/[locale]/not-found.tsx` lädt hart `defaultLocale`. EN-Besucher bekommen eine deutsche 404. Zusätzlich endet der Hinweistext mit „Zurück zum HQ." und der Button darunter ist mit `dict.brand.name` beschriftet — ein Markenname als Handlungsaufforderung.

**Soll:**
1. Locale aus dem Pfad ableiten. In Next.js App Router erreicht `not-found.tsx` keine `params` — Lösung: Locale in `proxy.ts` als Request-Header setzen und über `headers()` lesen, oder eine `[...notFound]`-Catch-all-Route je Locale.
2. Button-Label auf `dict.errors.backToHq` (neuer Key aus 2.5).
3. Hinweistext ohne CTA (siehe 2.5).

**Akzeptanzkriterium:** `curl https://nicolenders.com/en/gibtsnicht` liefert englischen Text.

---

### 6.7 EN-Version läuft auf deutschen Slugs `L` — Entscheidung nötig

**Ist:** `/en/einsaetze`, `/en/identitaeten`, `/en/depeschen`, `/en/legende`, `/en/ausbildung`, `/en/akte`, `/en/impressum`, `/en/datenschutz`, `/en/barrierefreiheit`. Labels englisch, URLs deutsch. Im Code ist das als „Phase 13" vermerkt (`akte/page.tsx:13`).

**Relevanz:** 15 von 18 Deliveries des meistgehaltenen Talks waren auf Englisch. Das englische Publikum ist real, nicht theoretisch.

**Soll:** Slug-Map plus Rewrites:

| DE | EN |
|---|---|
| `einsaetze` | `missions` |
| `identitaeten` | `identities` |
| `depeschen` | `dispatches` |
| `legende` | `legend` |
| `briefings` | `briefings` |
| `akte` | `kit` |
| `publikationen` | `publications` |
| `ausbildung` | `credentials` |
| `impressum` | `imprint` |
| `datenschutz` | `privacy` |
| `barrierefreiheit` | `accessibility` |
| `cv` | `cv` |

Alte `/en/<de-slug>`-Pfade als **301** auf die neuen mappen. `alternatesFor()` aus 1.3 muss die Map kennen.

> Umfangreich und mit Redirect-Risiko. **Mit Nicole abstimmen**, ob das in diesen PR gehört oder in einen eigenen.

---

### 6.8 Datumsformat EN `XS`

**Ist:** `lib/format.ts` nutzt `en-GB` mit `day/month/year` als 2-stellige Zahlen → `04/09/2026` für den 4. September. Technisch korrekt, für ein internationales Publikum mehrdeutig (US-Leser sehen den 9. April).

**Soll:** Für EN `month: "short"`:
```ts
new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
  day: "2-digit",
  month: locale === "de" ? "2-digit" : "short",
  year: "numeric",
  timeZone: TZ,
})
// DE: 04.09.2026   EN: 04 Sep 2026
```
`formatDateTime` analog. Bestehende Tests in `lib/time.test.ts` / `lib/format`-Tests anpassen.

---

### 6.9 Kleinigkeiten `S`

| Datei | Ist | Soll |
|---|---|---|
| `components/BrandImage.tsx` | `<span className="ai-badge">KI-generiert</span>` hart kodiert. Auf `/en` steht „KI-generiert" neben dem Hero, während die Identitätskarten daneben „(AI-generated)" zeigen. | `locale`-Prop ergänzen, Label aus `dict.common.aiGenerated` (`KI-generiert` / `AI-generated`). Alle Aufrufer durchreichen. |
| `app/(site)/[locale]/legende/page.tsx:~190` | `{isDe ? "Warum Agentin" : "Why „agent“"}` — deutsche Anführungszeichen im englischen String | `Why “agent”` |
| `app/llms.txt/route.ts` | hartkodiert „zehn Fachbüchern", während der Rest der Seite `stats.books` aus der DB zieht | Aus `getHomeStats()` speisen und ausschreiben (`zehn`, `elf`, …) oder als Ziffer |
| `app/(site)/[locale]/akte/page.tsx:13` | `TODO(nicole): finalen Namen bestätigen` in Production-Code | „Akte" fixieren, TODO entfernen |
| `app/(site)/[locale]/akte/page.tsx` | Kein `generateMetadata`-Titel-Gleichlauf: DE `"Akte · Speaker-Kit"`, EN `"Speaker kit"` | EN auf `"File · Speaker kit"` angleichen |
| `components/layout/SiteFooter.tsx` | `{locale === "de" ? "Akte (Speaker-Kit)" : "Speaker kit"}` inline, alle anderen Labels aus dem Dictionary | Nach `nav.akte` ins Dictionary |
| `/legende`, Werkzeuge | „Power Virtual Agents" als aktives Werkzeug-Chip. PVA ist in Copilot Studio aufgegangen. | Werkzeuge nach letzter Verwendung sortieren oder abgekündigte visuell absetzen (`opacity`, Tooltip „historisch"). **Nicht löschen** — der Filter auf historische Einsätze bleibt wertvoll. |
| `/legende`, Aktuelle Themen | Zeigt genau einen Punkt („AI-Gateway"), erklärt aber in zwei Sätzen Farbcodierung und Verlinkung | Sektion erst ab 3 Themen rendern |

---

## Phase 7 — Redaktionelle Aufgaben (nicht Code)

Diese Punkte kann Claude Code **nicht** lösen. Sie gehören in den PR-Text als Checkliste für Nicole.

| # | Aufgabe | Ort | Bezug |
|---|---|---|---|
| 7.1 | Hero-Lead ohne „Funde, Dossiers" pflegen | Admin → Startseite | 2.2 |
| 7.2 | Geviertstriche in DB-Inhalten prüfen: Identitäts-Beschreibungen, Legenden-Texte, Bios, LegalDocs | Admin | 3.1 |
| 7.3 | `Strasse` → `Straße` | Admin → Einstellungen → Kontakt | 5.2 |
| 7.4 | Impressum-Body: Haftung für Inhalte, Haftung für Links, Urheberrecht | Admin → Rechtstexte | 5.3 |
| 7.5 | Entscheiden: Depeschen im Hauptmenü lassen oder bis zum dritten Beitrag ausblenden | — | 6.3 |
| 7.6 | **Bios in drei Längen schreiben** (50 / 150 / 400 Wörter) | Admin → Einstellungen → Bios | 6.4 |
| 7.7 | Pressefoto als Medium hinterlegen, Nutzungsrechte klären | Admin → Medien | 6.4 |
| 7.8 | Alt-Texte der Medien für EN pflegen („Portrait Startseite" erscheint auch auf `/en`) | Admin → Medien | 6.9 |
| 7.9 | Kontaktadresse auf eigene Domain umstellen | DNS + Admin | 5.4 |
| 7.10 | Identitäts-Zuordnungen der Einsätze durchgehen (alle fünf Identitäten) | Admin → Einsätze | 4.9 |
| 7.11 | Entscheidung zu 4.3 (DE/EN-Talk-Zusammenführung) und 4.5 Schritt 2 (Taxonomie) | — | 4.3, 4.5 |

**7.6 ist der wichtigste Punkt der gesamten Liste.** Die Akte ist die Seite, auf der Veranstalter landen, und ihr Kernasset ist leer.

---

## Definition of Done

Vor dem PR:

```bash
npm run lint
npx tsc --noEmit
npm test
npm run build
npx playwright test           # e2e smoke
npx playwright test -c playwright.a11y.config.ts
npx lhci autorun              # lighthouserc.json
```

Zusätzlich manuell:

- [ ] `/de` und `/en` je Route durchgeklickt, keine deutschen Strings auf `/en` und umgekehrt
- [ ] `grep -rn "—"` im nutzersichtbaren Code liefert nur die zwei dokumentierten Ausnahmen
- [ ] Keine Meta-Description doppelt über alle Routen
- [ ] Genau eine `<h1>` je Seite
- [ ] `curl` auf drei Routen: `canonical` und `og:image` unter `nicolenders.com`
- [ ] Rich Results Test auf `/de`, `/de/legende`, `/de/einsaetze/<slug>` grün
- [ ] Screenshot-Vergleich HQ vorher/nachher: Layout unverändert

**PR-Beschreibung** muss enthalten: erledigte Aufgaben mit Nummer, offene Punkte aus Phase 7 als Checkliste, und die drei Entscheidungspunkte (4.3, 4.5 Schritt 2, 6.7) explizit markiert.

---

## Bewusst nicht geändert

| Punkt | Grund |
|---|---|
| `conet Deutschland GmbH` (Kleinschreibung) | Korrekt. Die deutschen Töchter wurden im Dezember 2025 in der Conet Solutions GmbH gebündelt, die seitdem als conet Deutschland GmbH auftritt; die Marke wird in der eigenen Kommunikation klein geschrieben. |
| Brandname `DIE AGENTIN` auch auf `/en` | Bewusste Markenentscheidung |
| Route-Slug `/ausbildung` trotz Label „Nachweise" | Kein Redirect-Risiko eingehen für eine reine Label-Änderung |
| Historische Produktnamen in alten Talk-Titeln (`Power Virtual Agents`, `Azure AI Studio`, `Yammer`, `Office 365`) | Bilden den Stand des Vortrags korrekt ab. Ausnahme: 4.4 |
| `—` in Code-Kommentaren | Für Nutzer unsichtbar, Repo-Konvention |
| `lib/site.ts` | Code ist korrekt, das Problem ist die fehlende Env-Var |
| Kennzahlen `221 / 77 / 14` | Kommen live aus der DB, richtig gelöst |

---

## Offene Unsicherheiten aus dem Audit

Diese Befunde stammen aus der Beobachtung der gerenderten Seite, nicht aus den Daten. Bei der Umsetzung zuerst verifizieren:

1. **Staging-Host (1.1):** Der Schluss von `og:image` auf `metadataBase` ist plausibel, aber nicht bewiesen. Möglich wäre auch, dass nur die OG-Route den Host anders auflöst. Erst `hreflang` im Live-HTML prüfen.
2. **Kategorie-Sammelbecken (4.5):** Könnte ein Rendering-Problem bei Mehrfachzuordnung sein statt echter Fehlzuordnung. Deshalb Schritt 1 vor Schritt 2.
3. **Bios leer (6.4):** Könnte ein Locale- oder Filter-Problem sein (`getBios` filtert auf `b.text.trim()`), nicht fehlende Daten. Erst in der DB nachsehen.
4. **„14 Länder" (4.10):** Nicht verifiziert, ob Antarktis-Koordinaten in die Zählung eingehen.
5. Das Audit betrachtete nur `main`, nicht `feature/agentin-umbau`. Falls Punkte dort bereits adressiert sind, hier streichen.
