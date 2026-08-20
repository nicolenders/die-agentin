# Die sechs Rollen — was jede prüft und womit

Arbeite die Rollen nacheinander ab, nicht parallel. Der Reiz liegt darin, die
Brille wirklich zu wechseln: Wer beim Security-Durchgang schon an UX denkt,
findet beides halb.

Die Befehle unten sind Beispiele für ein Next.js-Projekt mit npm. Übertrage sie
auf das, was das Projekt tatsächlich benutzt — die Frage dahinter bleibt gleich.

---

## Inhalt

- [1 · Architektur (iSAQB / arc42)](#1--architektur-isaqb--arc42)
- [2 · Test & Dokumentation](#2--test--dokumentation)
- [3 · Security](#3--security)
- [4 · UX / UI](#4--uxui)
- [5 · Barrierefreiheit](#5--barrierefreiheit)
- [6 · SEO](#6--seo)
- [Wiederkehrende Muster](#wiederkehrende-muster)

---

## 1 · Architektur (iSAQB / arc42)

**Die Leitfrage:** Sind die Qualitätsziele so formuliert, dass man eine Änderung
daran messen kann — oder stehen dort Adjektive?

### Qualitätsziele

Suche in Spezifikation und Doku nach den Qualitätsmerkmalen. Stehen dort Wörter
wie „sicher", „schnell", „barrierefrei" ohne Szenario, ist das ein Finding: ein
Qualitätsziel ohne Auslöser, erwartete Reaktion und Prüfstelle ist eine Meinung.

Ein brauchbares Szenario nennt drei Dinge:

> Eine Screenreader-Nutzerin ruft eine beliebige öffentliche Route auf **(Auslöser)**
> und erreicht den Inhalt über Sprungmarke, Landmarks und eine lückenlose
> Überschriftenfolge **(Reaktion)** — geprüft von `tests/a11y/axe.spec.ts`,
> 0 Verstöße `critical` oder `serious` **(Prüfstelle)**.

Fehlt so etwas, ist das Ergebnis dieses Durchgangs ein Architekturdokument nach
arc42 mit einem Qualitätsbaum: Randbedingungen, priorisierte Szenarien,
Bausteinsicht, Laufzeitsicht, Querschnittskonzepte, benannte Risiken.

### Struktur

```bash
# Abhängigkeitsrichtung: importiert der fachliche Kern aus der UI-Schicht?
grep -rn "from \"@/app/" lib/ components/

# Dieselbe Funktion mehrfach? Sicherheitsprüfungen sind hier besonders heikel —
# drei Kopien sind drei Stellen, an denen eine Verschärfung vergessen wird.
grep -rn "function sameOrigin\|function isAuthorized" app/ lib/
```

### Aussagen gegen Wirklichkeit

Kommentare und Doku veralten lautlos. Prüfe die Behauptungen, die
Entscheidungen tragen:

```bash
npm run build   # Welche Routen sind statisch, welche dynamisch?
```

Wenn ein Kommentar „wird statisch ausgeliefert" sagt und der Build jede Route
als dynamisch ausweist, führt das bei der nächsten Fehlersuche in die falsche
Richtung.

### Entscheidungsprotokolle (ADRs)

```bash
ls docs/decisions/ | cut -c1-4 | sort | uniq -d   # doppelt vergebene Nummern
grep -L "Datum:" docs/decisions/0*.md             # ohne Kopfdaten
```

Eine doppelt vergebene Nummer macht jeden Verweis darauf mehrdeutig. Wenn du
das findest, umnummerieren **und** einen Test ergänzen, der es künftig fängt —
Aufmerksamkeit skaliert nicht, ein Test schon.

### Zustand und Speicher

- Wächst eine Map, ein Cache, eine Liste unbegrenzt? Wer räumt auf?
- Läuft eine Startroutine (Migration, Aufwärmen) bei jeder Instanz? Was
  passiert bei mehreren Replicas — und was, wenn sie fehlschlägt?
- Bleibt ein Fehlschlag nur im Log stehen, während ein Zustandsendpunkt weiter
  „in Ordnung" meldet?

---

## 2 · Test & Dokumentation

**Die Leitfrage:** Welcher Prüfmechanismus behauptet etwas, das er nicht prüft?

Das ist die ergiebigste Rolle, weil ihre Funde unsichtbar sind: Ein
abgeschaltetes Gate sieht aus wie ein bestandenes.

### Gates auf Wirksamkeit prüfen

Für **jeden** Prüfmechanismus im Projekt vier Fragen:

1. Wer ruft ihn auf? (In der Pipeline suchen, nicht in der Konfiguration.)
2. Blockiert er, oder läuft er mit `continue-on-error`?
3. Wertet er alles, oder nur die schwerste Stufe?
4. Läuft er gegen das, was ausgeliefert wird — oder gegen den Entwicklungsserver?

```bash
# Klassiker: Schwelle konfiguriert, aber nie ausgewertet
grep -n "thresholds" -A 6 vitest.config.ts
grep -n "npm run test\b\|test:coverage" .github/workflows/*.yml
npm run test:coverage   # den echten Wert messen
```

Weitere häufige Funde:

- Barrierefreiheits-Gate wertet nur `critical` — `serious` (Kontraste, fehlende
  Namen) fällt durch, obwohl genau das den Screenreader unbrauchbar macht.
- Regeln sind mit Begründung ausgeklammert, die Begründung ist längst überholt.
- Browsertests laufen nur in einer Bildschirmbreite.
- Ein Lighthouse-/Performance-Profil zeigt auf Routen, die es nicht mehr gibt —
  und läuft in keiner Pipeline.

### Doku

Vergleiche jede Anleitung mit der Wirklichkeit: Beschreibt sie ein System, das
so noch existiert? Nennt eine Migrationscheckliste Quellen, die es nicht mehr
gibt? Verweist ein Kommentar auf ein Paket, das inzwischen ein anderes ist?

Veraltete Doku ist ein Finding, kein Schönheitsfehler — sie kostet den nächsten
Menschen einen halben Tag.

---

## 3 · Security

**Die Leitfrage:** Was kann jemand ohne Anmeldung auslösen?

### Der unauthentifizierte Rand

Liste alle Endpunkte auf, die ohne Anmeldung erreichbar sind. Für jeden:

- Schreibt er in die Datenbank? Dann: Herkunftsprüfung, Mengenbegrenzung,
  Eingabevalidierung — fehlt eines davon, ist das ein Finding.
- Kostet ein Aufruf Geld (serverlose DB, externe API, Bildverarbeitung)?
- Verrät die Antwort etwas über den inneren Aufbau?

Ein unbegrenzter Schreibpfad ist auch ohne Datendiebstahl ein Problem: Er füllt
Tabellen, verfälscht Auswertungen und erzeugt Kosten.

### Erlaubnisliste statt Verbotsliste

Überall dort, wo Eingaben gefiltert werden — URL-Schemata, Dateitypen,
Node-Typen, Feldnamen —, prüfe die Richtung:

```js
// Verbotsliste: vergisst vbscript:, blob:, und was als Nächstes kommt
if (href.startsWith("javascript:")) return false;

// Erlaubnisliste: kennt nur, was erlaubt ist
return ALLOWED_SCHEMES.has(scheme);
```

Und prüfe die Normalisierung **vor** der Prüfung. Browser entfernen
Steuerzeichen innerhalb eines URL-Schemas; `ja<TAB>vascript:` wird ausgeführt,
rutscht aber durch jede Prüfung, die auf der Rohzeichenkette arbeitet.

### Antworten mit Fremdinhalten

Wird eine hochgeladene oder gespeicherte Datei ausgeliefert, prüfe die Header
der **echten Antwort**, nicht den Quelltext:

```bash
curl -s -D- -o /dev/null http://localhost:3000/media/datei.svg | grep -i "content-security\|content-type\|nosniff"
```

SVG ist der Sonderfall: unter einer Seiten-CSP, die Inline-Skripte erlaubt, ist
eine direkt aufgerufene SVG-Datei ein skriptfähiges Dokument auf derselben
Herkunft. Eine eigene, harte Policy je Medienantwort löst das.

**Achtung:** Header aus der Framework-Konfiguration überschreiben oft, was ein
Route Handler setzt. Immer nachmessen — sonst steht die Korrektur nur im Code.

### Abhängigkeiten

```bash
npm audit --json | node -e "…"   # nach Schwere und Behebbarkeit gruppieren
```

Trenne beim Bewerten zwei Gruppen:

- **Ohne Hauptversionssprung behebbar** → beheben. Vorrang hat, was auf dem
  Pfad fremder Daten liegt (Bildverarbeitung, Parser, Deserialisierung).
- **Nur per Hauptversionssprung** → nicht nebenbei. Erreichbarkeit prüfen (wird
  die verwundbare Funktion überhaupt aufgerufen?), als Entscheidung
  dokumentieren, im Risikoteil benennen.

Ein Audit-Schritt mit `continue-on-error` und veralteter Begründung ist selbst
ein Finding.

### Fehlermeldungen

Rohe Datenbank- oder Framework-Fehler gehören ins Log, nicht in die Antwort —
sie tragen Verbindungsdaten, Tabellennamen und Pfade.

---

## 4 · UX / UI

**Die Leitfrage:** Wo bricht die Führung ab, und wo verspricht die Oberfläche
etwas, das dahinter nicht passiert?

### Tote Funktionen

Der schwerwiegendste UX-Fehler ist eine Bedienoberfläche, die nichts bewirkt.
Suche für jede pflegbare Entität den Ort, an dem sie *gelesen* wird:

```bash
grep -rn "db.redirect\|prisma.redirect" app/ lib/   # wird angelegt … und wo benutzt?
```

Wird eine Tabelle gepflegt, angezeigt und nirgends angewendet, ist das ein
Versprechen an den Menschen, das niemand einlöst.

### Sprache

```bash
# Sichtbarer Text direkt im Bauteil statt über i18n-Schlüssel
grep -rn "\"[A-ZÄÖÜ][a-zäöüß ]\{12,\}\"" components/ | grep -v "aria-\|data-"
```

Besonders heikel: Einwilligungstexte. Wer sie nicht lesen kann, willigt nicht
wirksam ein.

### Berechnete Aussagen

Texte, die Zahlen einsetzen, brauchen einen Nullfall. „MVP seit 2020 (0-mal in
Folge)" und „Autorin von null Fachbüchern" entstehen aus einer leeren Datenbank
— und stehen dann öffentlich.

### Zustände und Wege

- Leere Zustände: laden sie zum Handeln ein, oder bedauern sie?
- Fehlerseiten: bieten sie ein passendes nächstes Ziel, oder nur die Startseite?
  Wer aus einem alten Fachartikel kommt, sucht Inhalte, keine Eingangstür.
- Filter, Suchbegriffe, Ansichten: überleben sie einen Sprachwechsel?
  (Query-Parameter gehen dabei gern verloren.)
- Overlays und Menüs: Escape, Fokusrückgabe, Schließen von außen.

---

## 5 · Barrierefreiheit

**Die Leitfrage:** Kommt jemand ohne Maus und ohne Blick ans Ziel?

### Automatisch messen — in mehreren Breiten

axe findet mit `critical` **und** `serious` deutlich mehr, und der DOM sieht am
Telefon anders aus (Navigation als Overlay, Schalter, die es sonst nicht gibt).
Beide Breiten prüfen, Menü offen wie geschlossen.

```js
const results = await new AxeBuilder({ page })
  .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
  .analyze();
const blocking = results.violations.filter(
  (v) => v.impact === "critical" || v.impact === "serious",
);
```

### Überschriftenfolge

```bash
node .claude/skills/mehrrollen-check/scripts/page-audit.mjs --base http://localhost:3000 --routes /de,/de/liste
```

Ein Sprung von `h1` auf `h4` — typischerweise durch Fußzeilenspalten — betrifft
**jede** Seite auf einmal. Semantik und Optik sind zwei Fragen: das Element
bestimmt die Gliederung, die CSS-Klasse das Aussehen.

### Kontrast selbst nachrechnen

Wo weißer Text auf einer Markenfarbe steht, rechne nach statt zu schätzen. AA
verlangt 4,5:1 für normalen Text, 3:1 ab 18,66 px fett bzw. 24 px. Farben, die
„kräftig genug aussehen", liegen oft bei 4,2:1.

Wenn eine Farbe als Fläche hinter hellem Text mehrfach vorkommt, ist die
Lösung ein eigener Token („Violett als Fläche") — nicht fünf Einzelkorrekturen.

### Von Hand, weil kein Werkzeug es findet

- Landmarks: liegt die Kopfzeile versehentlich in `main`?
- Sprungmarke auch im Verwaltungsbereich — sonst tabbt man dort auf jeder Seite
  durch die komplette Navigation.
- Navigationsgruppen als Listen mit zugänglichem Namen statt loser Links.
- Gültige Verschachtelung (ein `div` in einem `span` ist ungültig).
- Dekorative Glyphen (`↗`, `→`) mit `aria-hidden`; „öffnet in neuem Tab" als
  unsichtbarer Text.
- `nav`-Bereiche mit sprechendem Namen — „Hauptnavigation", nicht der
  Markenname.

---

## 6 · SEO

**Die Leitfrage:** Was passiert mit den Adressen, die es früher gab?

### Alt-URLs sind der teuerste Teil

Bei einem Domainwechsel oder Relaunch ist das der Schwerpunkt. Vorgehen:

1. **Inventar beschaffen.** Alte Sitemap, Search-Console-Export — oder, wenn
   das Altsystem weg ist, der Suchindex:
   ```
   WebSearch: site:<domain>
   WebSearch: site:<domain> <thema>
   WebSearch: "<domain>/20" <thema>     # Datums-Permalinks
   ```
   Echte, indexierte Adressen gehören anschließend **wortwörtlich als
   Testfixtures** ins Repo — sie ersetzen Vermutungen über URL-Muster.

2. **Ketten messen, nicht annehmen:**
   ```bash
   for u in /blog/ /tag/x/ /2019/12/01/beitrag/; do
     printf "%-40s %s\n" "$u" "$(curl -s -L -o /dev/null -w '%{http_code} %{url_effective}' "http://localhost:3000$u")"
   done
   ```
   Eine Alt-URL, die über drei Sprünge im 404 endet, sieht im Quelltext
   unauffällig aus.

3. **Je Adresse die richtige Antwort wählen:**

   | Lage | Antwort |
   |---|---|
   | Die **Funktion** besteht fort (Liste → Liste, Über-mich → Über-mich, Feed → Feed) | **301** |
   | Inhalt gelöscht, keine Entsprechung | **410** |
   | Technische Pfade des Altsystems | **410** |
   | Slug umbenannt, Inhalt existiert | **301** |

   Zwei verbreitete Fehler: ein 301 auf einen Slug, den es nicht (mehr) gibt —
   das endet dauerhaft im 404. Und viele gelöschte Einzelseiten gesammelt auf
   eine Übersicht — das wertet Google als Soft-404 und behandelt es wie 404.
   410 ist die ehrliche Antwort und nimmt die Adresse am schnellsten aus dem
   Index.

4. **Sprache beachten.** War das Altsystem einsprachig und die neue Seite
   mehrsprachig, darf das Ziel keine Sprache erzwingen: sprachneutraler Pfad,
   die vorhandene Sprachweiche verhandelt. Das hält den 301 zugleich cachebar —
   ein dauerhafter Redirect, dessen Ziel von `Accept-Language` abhängt, liefert
   hinter einem geteilten Cache die Sprache des ersten Besuchers an alle.

5. **Den 410 trotzdem als Seite ausliefern.** Für Crawler zählt der Status; hier
   landen aber auch Menschen mit alten Lesezeichen.

6. **Reihenfolge:** Der signaltragende 301 gehört an den **Anfang** der Kette,
   nicht hinter eine Sprachweiche.

### Das Übliche

```bash
curl -s http://localhost:3000/robots.txt
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/sitemap.xml
```

- `Host:` in robots.txt erwartet einen nackten Hostnamen, keine URL.
- Canonical und hreflang je Route auf sich selbst — nicht geerbt.
- Eigene Meta-Description je Route.
- Strukturierte Daten nur mit Angaben, die auch sichtbar auf der Seite stehen.
- Verwaltungs- und Vorschaubereiche `noindex`.

### Verhalten bei Störung

Was liefert die Sitemap, wenn die Datenbank nicht erreichbar ist? Eine
gekürzte Sitemap mit Status 200 sagt Google „diese Detailseiten gibt es nicht
mehr". Im Zweifel lieber gar keine Sitemap als eine falsche.

---

## Wiederkehrende Muster

Wenn die Zeit knapp ist, suche zuerst danach — die Trefferquote ist hoch:

1. **Ein Gate, das niemand aufruft.** Schwelle in der Konfiguration, aber der
   Pipeline-Schritt ruft den Befehl ohne Auswertung auf.
2. **Ein Gate, das zu wenig wertet.** Nur die schwerste Stufe, nur eine
   Bildschirmbreite, nur eine Sprache.
3. **Eine Oberfläche ohne Wirkung.** Gepflegte Daten, die nirgends gelesen
   werden.
4. **Ein Kommentar, der nicht mehr stimmt.** Besonders Aussagen über
   Rendering, Caching und Ausliefern.
5. **Eine Verbotsliste, wo eine Erlaubnisliste hingehört.**
6. **Ein unbegrenzter Speicher.** Map oder Cache ohne Aufräumen.
7. **Ein Schreibpfad ohne Anmeldung und ohne Bremse.**
8. **Eine Definition of Done, die nichts prüft.** Genannte Breiten, Sprachen
   oder Browser ohne Test dahinter.
9. **Fest verdrahteter Text**, der in einer zweiten Sprache falsch erscheint.
10. **Eine Zahl aus der Datenbank ohne Nullfall** in einem öffentlichen Text.
