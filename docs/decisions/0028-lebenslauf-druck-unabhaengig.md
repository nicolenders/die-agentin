# 0028 — Der Druck des Lebenslaufs hängt an nichts, was der Browser wegverhandelt

**Datum:** 24.08.2026
**Status:** angenommen

## Kontext

Nach 0027 stand im Stylesheet ein Seitenrand von 22–25 mm. Auf Papier kam er
trotzdem nicht an: Der Text lief bis an die Blattkante. Gemessen an einem
PDF aus dem Browser fehlte der Rand vollständig.

Der Grund ist die Mechanik von `@page`: Der dort gesetzte Rand ist ein
Vorschlag, den der Druckdialog überstimmt. Steht dort „Ränder: keine“ — oder
übergeht ein Druckertreiber die Angabe —, fällt er ersatzlos weg. Ein
Innenabstand am Blatt ist keine Alternative: Er gilt einmal für den ganzen
Block, Seite 2 stünde oben ohne Rand da.

Beim Nachsehen im erzeugten PDF fiel ein zweiter Befund auf: Inter und
JetBrains Mono waren als **Type-3-Schriften** eingebettet, Poppins dagegen als
CID TrueType. Type 3 heißt, dass der Browser jeden Buchstaben als Pfad zeichnet
statt die Schrift einzubetten. Im PDF wirken senkrechte Striche dadurch
ungleichmäßig — „I“, „l“ und Bindestriche mal dünn, mal fett —, und der Text
lässt sich schlechter durchsuchen. Der Unterschied zu Poppins war der Hinweis:
Poppins liegt als statische Schnitte vor, die beiden anderen als **variable
Schriften**. Chrome bettet variable Schriften beim Drucken nicht ein.

## Entscheidung

**1. Den Seitenrand liefert das Dokument, nicht der Druckdialog.**

| Richtung | Quelle |
| --- | --- |
| links/rechts | Innenabstand am Blatt — gilt auf jeder Seite eines umbrochenen Blocks |
| oben/unten | Kopf- und Fußzeile einer Tabelle, die der Browser auf jeder gedruckten Seite wiederholt (`components/cv/CvPrintFlow.tsx`) |

`@page` bekommt dafür ausdrücklich `margin: 0` — die Quellen dürfen sich nicht
addieren.

**2. Statische Schriftschnitte statt variabler Schriften.** Inter in 400/500/
600/700, JetBrains Mono in 400/700, erzeugt aus denselben variablen Dateien
(`fonttools varLib.instancer`). Das Aussehen ändert sich nicht.

**3. Eine zurückgerollte Migration ist kein Befund**, wenn zu demselben Namen
eine erfolgreiche Zeile existiert (`lib/startup/migration-health.ts`).

## Begründung

- **Tabellenkopf statt `@page`:** Die einzige Mechanik, die auf jeder Seite
  wirkt und die der Druckdialog nicht abschalten kann. Gemessen: Bei „Ränder:
  Standard“ und bei „Ränder: keine“ kommt jetzt dasselbe heraus — 24 mm oben,
  25 mm links, 22 mm rechts, auf jeder Seite eines 13-seitigen Auszugs.
  `role="presentation"` hält die Tabelle aus der Vorlesereihenfolge heraus: Sie
  ist Drucktechnik, keine Datenstruktur.
- **Statische Schnitte:** 136 KB statt 87 KB. Fünfzig Kilobyte gegen ein PDF,
  das man einer Bewerbung beilegen kann, ist kein Handel, über den man lange
  nachdenkt. Geprüft mit `pdffonts`: keine einzige Type-3-Schrift mehr.
- **Zurückgerollte Migration:** `scripts/start.sh` löst eine historisch
  steckengebliebene Migration mit `migrate resolve --rolled-back` auf; der
  nächste Lauf wendet sie sauber an. In `_prisma_migrations` stehen danach zwei
  Zeilen zu demselben Namen. Die Auswertung zählte die alte als Blockade und
  meldete dauerhaft „Migration prüfen“ — für etwas, das längst erledigt war und
  sich nicht abstellen ließ. Eine Warnung, die man nicht abstellen kann, wird
  ignoriert; danach wird auch die echte ignoriert.

## Konsequenzen

- Wer im Druckdialog absichtlich größere Ränder einstellt, bekommt sie
  zusätzlich. Das ist gewollt: Die Einstellung bleibt eine Ergänzung, nur der
  Verzicht darauf kostet nichts mehr.
- Die variablen Schriftdateien sind aus `app/fonts/` entfernt. Wird ein
  weiterer Schnitt gebraucht, wird er aus derselben Quelle erzeugt — der Weg
  steht in `lib/fonts.ts`.
- Für den Bildschirm ändert sich nichts: Dort macht weiter der Innenabstand des
  Blattes den Rand, Kopf- und Fußzeile der Tabelle sind ausgeblendet.
