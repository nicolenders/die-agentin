# 0030 — Fotos eines Einsatzes als justierte Zeilen

**Datum:** 04.09.2026
**Status:** angenommen

---

## Kontext

Die Fotos eines Einsatzes standen in einer waagerecht scrollbaren Leiste: alle
Bilder mit `min-width: 290px` nebeneinander, darüber zwei Knöpfe „←" und „→".
Nicole mischt regelmäßig Hoch- und Querformat. In dieser Leiste standen die
Bilder dann unterschiedlich hoch, an der Unterkante ausgefranst, und der größere
Teil der Fotos lag außerhalb des Bildes — sichtbar nur, wer scrollte.

Dazu kam: Ein Klick auf ein Foto öffnete die Großansicht **dieses einen** Bildes.
Um das nächste zu sehen, musste man schließen und neu klicken.

## Entscheidung

### Justierte Zeilen statt Scrollleiste

Die Galerie ist jetzt ein Mosaik aus justierten Zeilen — das Verfahren, das
Flickr, Google Fotos und Unsplash benutzen: Jede Zeile füllt die volle Breite,
alle Bilder einer Zeile sind gleich hoch, und **kein Bild wird beschnitten**.
Ein Hochformat wird dabei schmal, ein Querformat breit — beide gleich hoch.
Alle Fotos sind auf einen Blick da, ohne Scrollleiste und ohne Knöpfe.

Zwei Alternativen wurden verworfen:

- **Starres Raster.** Es müsste Bilder anschneiden (Gesichter!) oder Löcher
  lassen. Bei gemischten Formaten immer eines von beidem.
- **Masonry** (`grid-template-rows: masonry`). Steht in Safari 26 und hinter
  einem Flag in Firefox, ist aber im Spannen und in der Reihenfolge zwischen den
  Engines noch nicht gleich implementiert [1][2] — als Grundlage für die
  Standarddarstellung zu früh. Zudem liest sich Masonry spaltenweise; die
  Reihenfolge der Fotos ist bei uns redaktionell gepflegt.

### Die Aufteilung ist optimal, nicht gierig

`lib/media/justified.ts` entscheidet, welche Bilder in eine Zeile gehören. Das
übliche gierige Verfahren („Bilder aufnehmen, bis die Zeile zu niedrig wird")
lieferte im Versuch eine 223 px hohe Zeile direkt über einer 313 px hohen und
ließ am Ende ein einzelnes Bild als Waise stehen. Stattdessen sucht eine
dynamische Programmierung über die Umbruchstellen die Aufteilung mit der
kleinsten Summe quadrierter Abweichungen von der Zielhöhe — O(n·k), bei einer
Handvoll Fotos nicht messbar. Ergebnis: gleichmäßige Zeilen und eine glatte
Kante an beiden Seiten.

Ein einzelnes Bild bleibt davon ausgenommen: Über die volle Breite gezogen wäre
ein Hochformat mehr als 1000 px hoch. Solche Zeilen werden auf das Anderthalb-
fache der Zielhöhe gedeckelt und stehen mittig.

### Die Breiten rechnet Flexbox, nicht wir

Berechnet wird nur die Zeilenaufteilung. Innerhalb der Zeile bekommt jede Kachel
`flex-grow` im Verhältnis ihres Seitenverhältnisses und `flex-basis: 0`; die
Höhe folgt über `aspect-ratio`. Damit verteilt der Browser subpixelgenau und die
Zeile passt bei jeder Breite exakt — was mit selbst gerechneten Pixelwerten nie
gelänge (Scrollbalken, Rundung, Zoomstufe).

Die Zielhöhe hängt an der gemessenen Breite: am Telefon rund 62 % der Breite
(ein Querformat allein oder zwei Hochformate nebeneinander), am großen
Bildschirm 290 px. Gemessen wird mit einem `ResizeObserver` — Drehen des
Telefons und Ziehen des Fensters ordnen neu.

### Großansicht mit Blättern

Aus der Großansicht ist eine echte Bildreihe geworden: Pfeile links und rechts,
Pfeiltasten, Escape, ein Zählwerk („Bild 2 von 5"), endlos umlaufend. Am Telefon
sitzen die Pfeile unten nebeneinander — an der Seite wären sie mit dem Daumen
kaum zu treffen und lägen über dem Bild.

## Konsequenzen

- Keine Migration. Die Maße (`MediaAsset.width/height`) stehen längst in der
  Datenbank und werden jetzt bis zur Galerie durchgereicht.
- Keine neue Abhängigkeit. Kein Layout-Paket, kein Lightbox-Paket.
- Die Galerie im Fließtext (TipTap-Node `gallery`, also Depeschen und Dossiers)
  bekommt dieselbe Darstellung — es ist dieselbe Komponente.
- Beschriftungen der Galerie standen fest auf Deutsch im Bauteil und erschienen
  so auch auf `/en`. Sie kommen jetzt aus dem Wörterbuch (`galleryLabels`),
  gleiches Muster wie `embedLabels` und `aiImageLabels`.
- **Ohne JavaScript** wird die Zeilenaufteilung für eine angenommene Breite von
  880 px gerechnet: Die Bilder stehen dann am Telefon kleiner, aber vollständig,
  in richtigem Seitenverhältnis und ohne Überlauf. Bewusst so — die Alternative
  wäre, vor dem Messen gar nichts zu zeigen.

---

[1] „Brick by brick: Help us build CSS Masonry", Chrome for Developers,
    https://developer.chrome.com/blog/masonry-update
[2] `grid-template-rows: masonry`, Can I use,
    https://caniuse.com/mdn-css_properties_grid-template-rows_masonry
