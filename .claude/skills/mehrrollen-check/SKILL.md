---
name: mehrrollen-check
description: >
  Prüft eine Website oder Web-Anwendung nacheinander aus sechs Fachrollen —
  Architektur (iSAQB/arc42), Test & Dokumentation, Security, UX/UI,
  Barrierefreiheit und SEO —, hält die Findings je Rolle in nummerierten
  Tabellen fest, setzt sie in einem eigenen Branch um und schließt mit einem
  Pull Request ab. Nutze diesen Skill IMMER, wenn jemand eine Website oder ein
  Repository "durchleuchten", "prüfen", "auditieren", "reviewen" oder
  "analysieren" lassen will — auch dann, wenn nur eine einzelne Rolle genannt
  wird ("schau mal aus Security-Sicht drauf", "ist das barrierefrei?", "wie
  steht es um SEO?"), wenn von "Findings", "Audit", "Qualitätscheck",
  "Codereview über das ganze Projekt" oder "was ist hier alles im Argen?" die
  Rede ist, und wenn nach einem größeren Umbau gefragt wird "passt das noch?".
  Auslöser sind auch konkrete Sorgen wie "die alte Domain steht noch im Google-
  Index", "funktioniert das am Handy?" oder "sind unsere Tests eigentlich
  aussagekräftig?".
---

# Mehrrollen-Check

Sechs Durchgänge über dasselbe System, jeder mit einer anderen Brille. Am Ende
stehen nummerierte Findings, umgesetzte Korrekturen und ein Pull Request.

Der Wert steckt nicht in der Anzahl der Rollen, sondern darin, dass jede Rolle
Dinge sieht, die die anderen für normal halten. Der Architekt liest einen
Kommentar und glaubt ihm; der Tester prüft, ob er stimmt. Der UX-Blick findet
einen deutschen Einwilligungstext auf der englischen Seite, an dem der
Security-Blick achtlos vorbeigeht. Genau diese Reibung ist der Ertrag.

## Die eine Regel, die alles trägt

**Miss, behaupte nicht.** Ein Finding ohne Zahl oder ohne reproduzierbaren
Befehl ist eine Meinung. Ein Finding mit „nachgemessen bei 380 px: 388 px breit"
ist ein Fakt, über den man nicht streiten muss.

Praktisch heißt das: erst das System zum Laufen bringen, dann hinsehen. Ein
Review, das nur Quelltext liest, findet die Hälfte — und erfindet gelegentlich
etwas dazu.

## Ablauf

### 1. Zugang klären, ehrlich

Prüfe zuerst, was du überhaupt erreichst:

```bash
curl -sS -o /dev/null -w "HTTP %{http_code}\n" --max-time 25 https://<domain>/
```

Wenn die Live-Site nicht erreichbar ist (Egress-Policy, Auth, DNS), **sag das
sofort und nenne die Ersatzwege**, statt so zu tun, als hättest du geprüft:

- **Lokaler Produktionsbuild** ersetzt die Live-Site für fast alles: Redirects,
  Header, Statuscodes, HTML-Struktur, Responsive, axe. Nicht der
  Entwicklungsserver — der rendert anders als das, was ausgeliefert wird.
- **Suchmaschinen-Index** ersetzt das URL-Inventar, wenn das Altsystem weg ist.
  `WebSearch` mit `site:<domain>` und thematischen Anfragen fördert echte,
  indexierte Adressen zutage. Die sind Gold wert: sie ersetzen Vermutungen über
  URL-Muster durch Belege.
- **Was du wirklich nicht prüfen kannst**, gehört als Lücke in den Bericht.

### 2. Baseline herstellen

```bash
npm ci
npm run lint && npm run typecheck && npm test   # oder das Äquivalent
npm run build
```

Läuft das Gate schon rot, ist das Finding Nummer eins — und du weißt, dass
spätere Rotfärbung von dir kommt. Danach den Produktionsserver starten und
offen halten; fast jede Messung braucht ihn.

### 3. Sechs Durchgänge

Je Rolle einmal durch. Die Detail-Checklisten mit konkreten Befehlen stehen in
`references/rollen.md` — lies die Datei, bevor du anfängst, und arbeite sie
Rolle für Rolle ab. Zwei mitgelieferte Skripte nehmen die mühsamsten Messungen
ab (siehe „Werkzeuge" unten).

Wichtig ist die Reihenfolge *innerhalb* einer Rolle: erst messen, dann
bewerten. Wer mit einer Vermutung anfängt, findet sie bestätigt.

### 4. Findings festhalten

Eine Tabelle je Rolle, im Chat. Jedes Finding bekommt eine **eindeutige Nummer
mit Rollenpräfix** — A für Architektur, T für Test, S für Security, U für UX, B
für Barrierefreiheit, E für SEO. Die Nummern sind der Grund, warum das Format
funktioniert: sie machen jedes Finding zitierbar. „Bei B5 bin ich anderer
Meinung" ist ein Satz; ohne Nummern wird daraus ein Absatz.

Findings, die mehrere Rollen betreffen, mit `⊕` und der anderen Nummer
markieren (`B1 ⊕T3`). Das zeigt, wo eine Ursache mehrere Symptome hat — und
verhindert, dass dieselbe Sache zweimal repariert wird.

```markdown
| Nr. | Finding | Schwere | Status |
|---|---|---|---|
| **S1** | `/api/track` ist der einzige Schreibpfad ohne Anmeldung … | hoch | Herkunft, Rate Limit, Pfadprüfung |
```

Vier Spalten reichen. Die Schwere ist eine Einschätzung, kein Ritual — hoch
heißt „das kostet Geld, Daten oder Nutzer", niedrig heißt „das stört, wenn man
es sieht".

**Nenne auch, was in Ordnung ist.** Ein Bericht, der nur Mängel listet, lässt
offen, ob der Rest geprüft wurde oder nur nicht auffiel.

### 5. Umsetzen

Branch anlegen (oder den vorgegebenen verwenden), alles umsetzen, Gate grün
halten. Beim Ändern gelten drei Dinge, die in dieser Reihenfolge oft vergessen
werden:

**Prüfe, ob die Korrektur wirklich greift.** Ein gesetzter Header kann von der
Framework-Konfiguration überschrieben werden, ein Cache kann die alte Antwort
liefern, ein Modul kann doppelt geladen sein. Miss die echte Antwort nach, nicht
den Quelltext.

**Prüfe, ob ein neuer Test rot werden kann.** Stelle den alten Zustand
künstlich her (CSS injizieren, Wert zurücksetzen) und sieh nach, ob der Test
anschlägt. Ein grüner Test, der nicht scheitern kann, sichert nichts.

**Setze Schwellen auf den gemessenen Wert, nicht auf den Wunschwert.** Eine
Abdeckungsschwelle von 70 %, an der jeder Lauf scheitert, wird binnen einer
Woche abgeschaltet. Eine Sperrklinke auf dem Ist-Wert hält — und das Ziel
gehört als Kommentar daneben.

### 6. Entscheidungen nicht selbst treffen

Manche Findings haben zwei vertretbare Lösungen, und die Wahl hängt von etwas
ab, das nur der Mensch weiß (wird migriert? bleibt das System erreichbar? was
ist der Zeitplan?).

Bei solchen Punkten: **die Asymmetrie benennen und fragen**. Nicht abstrakt
(„es gibt zwei Möglichkeiten"), sondern mit dem Preis beider Wege — „(a) kostet
im schlechten Fall nichts, (b) kostet im guten Fall alles". Solange keine
Antwort da ist: den Weg wählen, dessen schlechtester Ausgang der mildere ist,
das kennzeichnen und weiterarbeiten. Blockiere nie den ganzen PR an einer
offenen Frage.

Kommt die Antwort später, **prüfe die bestehende Lösung dagegen** — sie kann
durch die Antwort falsch geworden sein, und dann gehört sie geändert, nicht
verteidigt.

### 7. Pull Request

Der PR-Text ist der bleibende Teil der Arbeit. Aufbau:

1. **Ein Satz zur Grundlage** — wogegen wurde geprüft, was war nicht erreichbar.
2. **Das schwerste Finding zuerst**, mit Vorher/Nachher als Messung.
3. **Die Tabellen je Rolle**, dieselben Nummern wie im Chat.
4. **Prüfstand** — die Gate-Ausgabe, Testzahlen vorher/nachher.
5. **Bewusst nicht geändert** — mit Begründung. Das schützt den nächsten
   Menschen davor, dieselbe Sackgasse noch einmal zu betreten.
6. **Was der Mensch prüfen sollte** — offene Entscheidungen, Folgeschritte.

Achtung beim Schreiben: GitHub verschluckt rohe spitze Klammern im PR-Text.
`<a>`, `<div>` und ein Tabulator mitten in einer Zeichenkette verschwinden
spurlos und machen Findings unverständlich. Beschreibe Elemente als
`` `a`-Element `` statt als `<a>`.

### 8. Nachhalten

Nach dem PR: CI beobachten, bis sie durch ist. Bei Rot selbst nachbessern —
auch wenn die Ursache in der eigenen Änderung an der Pipeline liegt. Danach
stündlich still nachsehen, bis gemerged oder geschlossen; nur melden, wenn sich
etwas geändert hat.

## Werkzeuge

Zwei Skripte nehmen wiederkehrende Messungen ab. Beide erwarten einen laufenden
Server und werden aus dem Projektwurzelverzeichnis gestartet (sie brauchen
`@playwright/test` aus den Projektabhängigkeiten):

```bash
node .claude/skills/mehrrollen-check/scripts/responsive-audit.mjs \
  --base http://localhost:3000 --routes /de,/de/depeschen --widths 380,768,1440

node .claude/skills/mehrrollen-check/scripts/page-audit.mjs \
  --base http://localhost:3000 --routes /de,/de/depeschen
```

`responsive-audit.mjs` findet Querscrollen, hinausragende Elemente,
abgeschnittenen Text und zu kleine Tippziele. `page-audit.mjs` zieht
Überschriftenfolge, Metadaten und Weiterleitungsketten. Beide geben nur
Befunde aus — kein Befund heißt „sauber".

## Was diesen Check von einem Codereview unterscheidet

Ein Codereview liest Änderungen. Dieser Check misst ein laufendes System und
fragt bei jedem Prüfmechanismus zusätzlich: **läuft der überhaupt?**

Die ergiebigsten Findings sind erfahrungsgemäß keine Fehler im Code, sondern
Zusicherungen, die niemand einlöst: eine Abdeckungsschwelle, die in der Config
steht, aber nie ausgewertet wird. Ein Barrierefreiheits-Gate, das nur die
schwerste Stufe wertet. Eine Redirect-Tabelle, die gepflegt, aber nirgends
angewendet wird. Eine Definition of Done, die drei Bildschirmbreiten nennt, die
nichts prüft. Ein Kommentar, der ein Verhalten beschreibt, das die Anwendung
seit dem letzten Umbau nicht mehr hat.

Suche danach gezielt. Für jeden Prüfmechanismus im Projekt: Wer ruft ihn auf?
Blockiert er? Wann ist er zuletzt rot geworden? Für jede Aussage in Doku und
Kommentaren: Stimmt sie noch?
