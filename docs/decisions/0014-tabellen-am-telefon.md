# 0014 — Am Telefon: Tabellenzeile wird Karte, Einsätze zeigen Anstehendes

**Datum:** 17.08.2026
**Status:** angenommen

---

## Kontext

Am PC und am Tablet passt die öffentliche Seite. Am Telefon (380 px) nicht: Die
Einsatzliste hat sieben Spalten — Datum, Veranstaltung, Briefing, Sprache, Ort,
Status, Aktion. Das lässt sich auf dieser Breite weder anzeigen noch sinnvoll
kürzen. Dazu kommen ein Filterband mit Suchfeld, Jahres-Chips und
Identitäts-Chips, das mehr Höhe braucht als die Liste darunter, und ein
Karten-Popup von 320 px Breite, in dem gescrollt werden muss.

## Entscheidungen

### 1. Die Zeile kippt zur Karte, statt Spalten zu opfern

Unter 640 px werden `table.stack`-Tabellen zu Karten: Aus Kopfzeile und Zelle
wird ein Paar aus Beschriftung und Wert untereinander, die Veranstaltung steht
als Titel oben. Die Beschriftung kommt aus `data-label` am `<td>` — sie steht
damit genau einmal im Markup und ist automatisch übersetzt.

Bewusst als Auszeichnung am Element und nicht als Regel für alle Tabellen:
Zweispalter (Codebuch auf der Legende, Merkmale einer Identität) lesen sich als
Tabelle besser, und Tabellen aus dem Redaktionsinhalt (TipTap) haben keine
Beschriftungen, aus denen sich Karten bauen ließen.

**Zwingend dazu gehört:** `display: block` nimmt Tabellenelementen ihre Rolle.
Ohne Gegenmaßnahme hört ein Vorlesewerkzeug am Telefon nur eine Folge von Text
ohne Spaltenbezug. Deshalb tragen genau diese Tabellen ihre Rollen explizit im
Markup (`table`, `rowgroup`, `row`, `columnheader`, `cell`), und die Kopfzeile
bleibt erhalten, nur optisch verborgen. Wer die `display`-Regeln ändert, muss
die Rollen mitdenken — es steht als Hinweis an beiden Stellen.

### 2. Einsätze am Telefon: nur was ansteht, dafür ohne Filter

Am Telefon zeigt die Einsätze-Seite die Einsätze von **heute an**; das
Filterband entfällt. Wer unterwegs nachsieht, will wissen, wo Nicole als
Nächstes auftritt — nicht in fünf Jahren blättern.

„Heute" ist dabei der Kalendertag in Europe/Berlin (`berlinDay`), nicht der
Zeitstempel: Ein Einsatz, der heute läuft, ist nicht vorbei, obwohl seine
Startzeit (Mitternacht UTC) hinter der aktuellen Uhrzeit liegt. Genau dafür gibt
es `isUpcoming` als eigene, getestete Regel statt eines `>`-Vergleichs im JSX.

Das ist eine **Inhalts**änderung nach Fensterbreite, nicht nur eine
Darstellungsfrage — also nichts, was CSS erledigen kann. Umgesetzt über
`useIsPhone` (`useSyncExternalStore`, Server-Antwort `false`): Der Server liefert
weiterhin die vollständige Liste, erst im Browser wird eingegrenzt. Damit sehen
Suchmaschinen und KI-Systeme unverändert alle Einsätze, und es gibt keine
Abweichung beim Hydrieren.

Statt still zu kürzen, steht über der Liste, was sie zeigt („Anstehende
Einsätze — heute und später"), und ist nichts geplant, sagt die leere Liste, dass
die vergangenen am größeren Bildschirm zu sehen sind.

### 3. Das Einsatz-Popup füllt am Telefon den Bildschirm

Über der Karte hätte es sonst rund 300 px Breite und die Höhe eines
Briefmarkenbildes. Bildschirmfüllend ist es das, was es inhaltlich ist: die
Kurzakte des Einsatzes. Dazu gehören eine daumengroße Schließfläche, die
Buttons am unteren Rand, `Escape` zum Schließen und eine stehende Seite
darunter — sonst scrollt beim Wischen unbemerkt die Seite weiter und man landet
nach dem Schließen woanders.

### 4. Die Sprachspalte der Briefing-Einsätze entfällt am Telefon

In der Tabelle „Gehalten bei" genügen Datum, Veranstaltung und Ort. Die Sprache
steht als DE/EN-Marke ohnehin einige Zeilen darüber. Am großen Bildschirm bleibt
die Spalte, weil sie dort nichts kostet (`.hide-sm`).

## Konsequenzen

- Die Grenze ist 640 px — dieselbe wie im übrigen Stylesheet. Ein Telefon quer
  (844 px) bekommt die Tabellenansicht; das ist gewollt, dort ist Platz.
- Am Telefon sind vergangene Einsätze nicht erreichbar. Das ist so gewollt
  (keine Filter); ein späterer „auch Vergangenes"-Schalter wäre eine Zeile.
- Die Ansichtswahl der Karte (Welt / Europa / DACH) bleibt auch am Telefon: Sie
  filtert keine Einsätze, sie zoomt.
