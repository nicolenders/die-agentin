# 0017 — Das Titelbild einer Depesche wird auch angezeigt

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

### 2. In einer klickbaren Karte kein Klick-Zoom, aber ein sichtbarer KI-Hinweis

Die Übersichtskarte ist als Ganzes ein Link. `AssetImage` öffnet beim Klick die
Lightbox — in einer Karte hieße das: Der Klick aufs Bild führt nicht zur
Depesche. Das Thumbnail ist deshalb ein schlichtes `<img>` vom
`/media`-Proxy.

Anders als bei den Porträt-Avataren (Identitäten, Legende) bleibt der Hinweis
„KI-generiert" hier aber **sichtbar** am Bild, nicht nur im Alt-Text: Ein
Avatar von 40 px ist Beiwerk, ein 16:9-Titelbild ist Aussage. Auf der
Detailseite ist das Bild wieder ein `AssetImage` mit Lightbox — dort steht es
nicht in einem Link.

### 3. Das Thumbnail hat ein festes Seitenverhältnis

`.card-thumb` schneidet auf 16:9 (`aspect-ratio` + `object-fit: cover`). Sonst
bestimmt das Originalformat des Bildes die Kartenhöhe, und ein Hochformat
zwischen zwei Querformaten reißt die Zeile auseinander — CLAUDE.md verlangt
gleich hohe Karten im Raster.

### 4. Das Titelbild ist auch das Bild beim Teilen

`openGraph.images` und der `image`-Wert im BlogPosting-Knoten kommen aus
demselben Bild, mit absoluter URL (`absoluteAssetUrl`) — relative Pfade lösen
weder LinkedIn noch Suchmaschinen auf. Ohne Titelbild bleiben beide Felder weg,
statt auf ein Platzhalterbild zu zeigen.

## Konsequenzen

- Keine Migration: Die Spalte gibt es, sie wurde nur nie gelesen.
- Ohne Titelbild sieht die Karte exakt aus wie vorher; das ist der Bestand.
- Die Mediathek zählt Depeschen jetzt beim „wo verwendet" mit — sowohl das
  Titelbild als auch Bilder im Text. Ein Bild, das nur in einer Depesche
  steckt, sieht dort nicht mehr wie ein Waisenkind aus.
- Die Startseite („Neueste Depeschen") zeigt weiter kein Bild. Die Kacheln dort
  sind bewusst kompakt; wenn das Bild auch dort hin soll, ist es dieselbe
  Zeile Code.
