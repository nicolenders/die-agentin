# 0017 — Das Titelbild einer Depesche wird auch angezeigt

**Datum:** 18.08.2026
**Status:** angenommen

---

## Kontext

Eine Depesche konnte in der Redaktion schon immer ein Titelbild bekommen
(`Dispatch.heroAssetId`, Bildwähler in der Erfassungsmaske). Öffentlich
erschien es nirgends: Weder die Übersicht noch die Detailseite lasen die
Beziehung. Wer ein Bild hochlud und zuwies, sah es danach nur in der Mediathek
wieder — und dort nicht einmal als „wo verwendet", weil auch der
Verwendungsnachweis Depeschen nicht kannte.

## Entscheidungen

### 1. Die Abbildung Bild-Zeile → Ansicht liegt in `lib/media/hero.ts`

Dasselbe Titelbild wird an drei Stellen gebraucht: Karte, Detailseite,
OpenGraph. Die Auswahl des sprachrichtigen Alt-Texts, der leere Alt-Text für
dekorative Bilder und die Erkennung KI-generierter Bilder stehen deshalb einmal
in `toHeroImage` statt dreimal in einer Query. Die Funktion ist rein und
unit-getestet; die Queries reichen nur noch die Zeile durch.

Bestehende Stellen (Einsatz-Banner, Porträts, Startseiten-Hero) bleiben
vorerst, wie sie sind — sie funktionieren. Wer sie das nächste Mal anfasst,
kann sie auf `toHeroImage` umstellen.

### 2. In einer klickbaren Zeile kein Klick-Zoom, aber ein sichtbarer KI-Hinweis

Die Übersichtszeile ist als Ganzes ein Link. `AssetImage` öffnet beim Klick die
Lightbox — in einer Zeile hieße das: Der Klick aufs Bild führt nicht zur
Depesche. Das Thumbnail ist deshalb ein schlichtes `<img>` vom
`/media`-Proxy.

Anders als bei den Porträt-Avataren (Identitäten, Legende) bleibt der Hinweis
„KI-generiert" hier aber **sichtbar** am Bild, nicht nur im Alt-Text: Ein
Avatar von 40 px ist Beiwerk, ein 16:9-Titelbild ist Aussage. Auf der
Detailseite ist das Bild wieder ein `AssetImage` mit Lightbox — dort steht es
nicht in einem Link.

### 3. Die Übersicht sind Zeilen, keine Kacheln — und das Bild bleibt schmal

Zwei Kacheln pro Zeile mit Bild füllten fast einen Bildschirm: Man sah zwei
Depeschen und musste für jede weitere scrollen. Die Übersicht ist deshalb eine
Liste von Zeilen (wie die Briefings, nur ohne Akkordeon): Titelbild links in
fester Breite, Kennung/Titel/Zusammenfassung/Datum rechts. Vier Depeschen passen
so auf einen Bildschirm statt zwei, und der Text führt.

Das Thumbnail wird auf 16:9 geschnitten (`aspect-ratio` + `object-fit: cover`) —
dasselbe Verhältnis, das der Bildwähler in der Redaktion zeigt. Ohne festen
Schnitt bestimmt das Originalformat die Zeilenhöhe, und ein Hochformat zwischen
zwei Querformaten reißt die Liste auseinander.

Unter 560 px Breite blieben für den Text neben dem Bild keine 200 px — dort
steht das Bild oben und der Text darunter.

### 3a. Auf der Detailseite steht das Bild neben dem Kopf, nicht über dem Text

Über die volle Spaltenbreite gesetzt war das Bild auf einem 1440er Schirm rund
560 px hoch und schob den Textanfang aus dem Sichtfeld — man sah eine
Überschrift und ein Foto, aber keinen Satz. Es steht jetzt rechts neben Kennung,
Titel und Datum, in derselben Spaltenbreite (320 px) wie die Randbilder im
Fließtext (`.block`). Damit beginnt der Text direkt unter dem Kopf, und schon
beim Öffnen stehen mehrere Absätze auf dem Schirm.

Unter 900 px stapelt der Kopf: Titel, Bild, Text — auf dem Telefon liegt der
Textanfang damit weiterhin auf dem ersten Bildschirm.

### 3b. Die Zeile ist der Link, also ist nichts darin unterstrichen

Vorher war in der Übersicht jeder Titel und jede Zusammenfassung unterstrichen,
weil die ganze Karte ein `<a>` ist — drei unterstrichene Textblöcke pro Eintrag
lesen sich wie ein Fehler. Die Zeile setzt `text-decoration: none`; beim
Überfahren unterstreicht sich der Titel, und der Rahmen leuchtet auf. Der Fokus
bleibt der globale `:focus-visible`-Rahmen (SPEC §11).

### 4. Das Titelbild ist auch das Bild beim Teilen

`openGraph.images` und der `image`-Wert im BlogPosting-Knoten kommen aus
demselben Bild, mit absoluter URL (`absoluteAssetUrl`) — relative Pfade lösen
weder LinkedIn noch Suchmaschinen auf. Ohne Titelbild bleiben beide Felder weg,
statt auf ein Platzhalterbild zu zeigen.

## Konsequenzen

- Keine Migration: Die Spalte gibt es, sie wurde nur nie gelesen.
- Ohne Titelbild ist die Zeile einspaltig — es bleibt keine leere Spalte stehen.
- Die Mediathek zählt Depeschen jetzt beim „wo verwendet" mit — sowohl das
  Titelbild als auch Bilder im Text. Ein Bild, das nur in einer Depesche
  steckt, sieht dort nicht mehr wie ein Waisenkind aus.
- Die Startseite („Neueste Depeschen") zeigt weiter kein Bild. Die Kacheln dort
  sind bewusst kompakt; wenn das Bild auch dort hin soll, ist es dieselbe
  Zeile Code.
- Die Klassen `.dispatch-*` und `.artHead.with-media` gelten vorerst nur für
  Depeschen. Bekommen Dossiers oder Einsätze dieselbe Liste, sind sie schon
  allgemein genug — dann wandert nur der Name.
