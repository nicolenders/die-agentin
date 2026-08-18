# 0019 — Der KI-Hinweis sitzt überall an derselben Stelle

## Kontext

Der Transparenzhinweis „KI-generiert" erscheint an sieben verschiedenen Arten
von Bildern: Marken- und Hero-Bilder, Titelbilder der Depeschen, Bilder im
Fließtext, Galerien, das Popup der Weltkarte, Porträts der Identitäten, die
Vorschaubilder der Mediathek und die vergrößerte Ansicht (Lightbox). Er stand
nicht überall gleich: mal 6 px von der Bildkante, mal 3 px, in der Lightbox
sogar unterhalb des Bildes neben der Bildunterschrift.

Ein Hinweis, der je nach Bild woanders klebt, liest sich wie ein Zufall. Er ist
aber eine Aussage — und Aussagen stehen an einer festen Stelle.

## Entscheidungen

### 1. Ein Abstand, an einer Stelle im Stylesheet

`--ai-badge-inset: 8px` steht einmal in der Regel `.ai-badge` und gilt für alle
Bildgrößen. Die Kompaktvariante (kleine Vorschaubilder) ändert nur noch die
Schrift, nicht mehr die Position — vorher rutschte derselbe Hinweis je nach
Bildgröße um 3 px.

`position: absolute` misst vom Innenrand des umgebenden Kastens; ein Rahmen am
Bild verschiebt den Hinweis also nicht. Die Bedingung an jeden Aufrufer ist
damit nur eine: **Der umgebende Kasten muss deckungsgleich mit dem `<img>`
sein.**

### 2. Der Kasten umschließt das Bild, nicht den Platz drumherum

Drei Stellen verletzten genau diese Bedingung:

- **Lightbox**: Der Hinweis hing an der `<figure>`, die auch die
  Bildunterschrift enthält — er saß deshalb unter dem Bild. Bild und Hinweis
  liegen jetzt in einem eigenen, das Bild umschließenden Kasten.
- **`.asset-image`** war `inline-block` und umschloss das Bild — außer als Kind
  eines Grid- oder Flex-Containers, der es streckt. `width: fit-content` hält
  den Kasten auch dort am Bild.
- **Galerie**: Die Mindestbreite (290 px) und die Streckung auf die Höhe des
  höchsten Bildes saßen am Kasten. Beides sitzt jetzt am Bild
  (`align-self: start`, `min-width` am `<img>`), sodass ein schmales Bild den
  Platz füllt, statt den Hinweis 80 px neben sich stehen zu lassen.

### 3. Nachgemessen, nicht geschätzt

Alle neun Zusammenhänge sind im Browser vermessen worden — Abstand der
Hinweis-Ecke zur Bildecke, rechts und unten. Ergebnis überall 8/8 px. Das ist
kein automatischer Test (er bräuchte laufende Anwendung samt Datenbank und
KI-Bildern in allen Bereichen); wer die Bildkästen umbaut, misst bitte erneut
nach.

### 4. Winzige Bilder bekommen die Kurzform, nicht eine andere Position

Auf einem 40- bis 72-px-Vorschaubild ist „KI-GENERIERT" breiter als das Bild.
Dort steht die Kurzform „KI" (`compact`) — in der Mediathek, der Bildauswahl und
an den Zertifikatslogos. Der volle Wortlaut bleibt in `title`/`aria-label`, die
Position bleibt dieselbe.

## Konsequenzen

- Wer ein neues Bild mit Hinweis einbaut, braucht nur einen Kasten, der das Bild
  umschließt und `position: relative` trägt — den Rest macht `.ai-badge`.
- Die Galerie skaliert schmale Bilder jetzt auf die Slotbreite, statt sie mit
  Rand stehen zu lassen. Das ist die Gegenleistung dafür, dass der Hinweis am
  Bild klebt.
