# 0012 — Bildmarke als Erkennungszeichen: Favicon, Kopfzeile, Zentrale

## Kontext

Das Logo-Kit liegt seit Kurzem unter `docs/die-agentin-logo-kit`. Bisher stand in
der Kopfzeile ein Buchstabenkreis („NEO", Tooltip „Nicole Enders is Online"), das
Favicon war ein handgezeichnetes dünnes Fadenkreuz (`app/icon.svg`), das bei
16 px praktisch verschwand. Die Marke soll überall wiedererkennbar sein — auch im
Adminbereich — und dabei auf verschiedenen Browsern, Geräten und Oberflächen
funktionieren (hell/dunkel, iOS, Android, alte Browser).

## Entscheidungen

### 1. Alle Icons werden aus einem Original abgeleitet

`scripts/brand-icons.mjs` erzeugt sämtliche Fassungen aus **einer** Kit-Datei
(`favicon-512x512.png`). Ändert sich die Marke, wird das Kit ausgetauscht und der
Befehl einmal ausgeführt — Größen und Varianten bleiben zueinander stimmig. Die
erzeugten Dateien liegen im Repo (kein Build-Schritt zur Laufzeit).

Zwei Schritte sind dabei nicht offensichtlich:

- **Freistellen über die Leuchtkraft.** Die Marke ist Leuchtgrafik auf fast
  schwarzem Grund. Das Alpha wird aus dem hellsten Farbkanal je Pixel gebildet
  (weicher Übergang zwischen 34 und 120). So bleibt der Schein erhalten, und die
  Marke liegt auf jedem dunklen Grund ohne sichtbare Kachelkante auf.
- **Abgerundete Maske vor dem Freistellen.** Die Kit-Kachel hat eine helle
  Randlinie, die heller als der Schwellwert ist und sonst als Geisterkante in den
  Ecken stehen bliebe. Eine abgerundete Maske schneidet genau diesen Rand weg;
  die Arme des Fadenkreuzes bleiben.

### 2. Freigestellte Marke innen, Kachel außen

Die Unterscheidung folgt der Frage, wer den Hintergrund bestimmt:

- **Innerhalb der Seite** (Kopfzeile, Fußzeile, Zentrale, Anmeldung, Social-Bild)
  ist der Grund immer dunkel und uns bekannt → freigestellte Marke (`mark-*.png`).
- **Außerhalb der Seite** (Browserreiter, Lesezeichen, Startbildschirm) bestimmt
  fremdes Chrome den Grund, hell wie dunkel → **Kachel** mit eigenem dunklem
  Untergrund. Eine freigestellte Leuchtgrafik würde auf dunklem Chrome
  verschwinden; die Kachel ist in beiden Fällen erkennbar.

Daraus die Fassungen: gerundete Kachel (transparente Ecken) fürs Favicon-PNG,
randlos gefüllt und deckend für iOS (Apple legt Transparenz auf Schwarz und
rundet selbst), „maskable" mit Sicherheitsabstand für Android (beschneidet je
nach Hersteller zu Kreis, Squircle oder Rechteck), und `favicon.ico` mit 16/32/48
für alte Browser, Lesezeichen und Feed-Reader.

Bei 16 px füllt die Marke mehr Fläche als bei den größeren Kacheln — sonst
zerfällt sie im Reiter.

### 3. Icons stehen an einer Stelle, nicht in zwei Systemen

`lib/brand.ts` hält alle Verweise; die drei Layout-Wurzeln (Website, Zentrale,
Vorschau) beziehen sie von dort. Deshalb liegt `favicon.ico` in `public/` und
nicht als `app/favicon.ico`: Next fügt Datei-Konventionen (`app/icon.*`) selbst in
den Kopf ein, und in Kombination mit `metadata.icons` entstünden doppelte
`<link>`-Tags. Das alte `app/icon.svg` ist entfallen.

### 4. ICO ohne zusätzliche Abhängigkeit

Das ICO-Format ist ein 6-Byte-Kopf, je Bild ein 16-Byte-Eintrag und die
PNG-Daten am Stück. Das Skript schreibt es selbst (~30 Zeilen), statt ein Paket
allein fürs Verpacken aufzunehmen. Ergebnis: 6 KB statt der 130 KB des Kit-ICO,
das eine 256er-Fassung mitschleppt, die kein Browser für einen Reiter braucht.

### 5. „NEO" entfällt ersatzlos

Der Buchstabenkreis war ein Platzhalter, der Tooltip („Nicole Enders is Online")
eine Erklärung dafür. Beides ist mit der Bildmarke überflüssig — sie steht
neben dem ausgeschriebenen „DIE AGENTIN", das Bild ist dekorativ (`alt=""`), der
Link trägt weiterhin ein `aria-label`. Ein Tooltip, den nur Mauszeiger sehen und
der nichts hinzufügt, wäre kein Gewinn.

### 6. Weitere Berührungspunkte

Neben Favicon und Kopfzeile: Fußzeile, Seitenleiste und Anmeldung der Zentrale,
das Social-Sharing-Bild (statt des gezeichneten „N.E"-Kreises), das Web-Manifest
für den Startbildschirm und die Bildmarke im RSS-Feed (Reader zeigen sie neben
dem Titel).

Bewusst **nicht**: JSON-LD. Für eine Person ist `image` ein Foto, kein Logo — die
Bildmarke dort einzutragen wäre semantisch falsch.

## Konsequenzen

- `theme_color` und `colorScheme` sind auf den dunklen Seitengrund gesetzt, für
  helle wie dunkle Systemeinstellung gleich. Die Seite ist durchgehend dunkel;
  eine helle Browserleiste über einer dunklen Seite wäre ein Bruch.
- Die erzeugten Dateien sind Raster (PNG). Ein SVG-Favicon wäre schärfer, ließe
  sich aus der Leuchtgrafik aber nicht ehrlich ableiten — die 512er-Kachel deckt
  alle heute üblichen Auflösungen ab.
- Das Kit bleibt unter `docs/`, weil es die Quelle ist und nicht ausgeliefert
  werden soll. Ausgeliefert wird nur, was das Skript nach `public/` schreibt.
