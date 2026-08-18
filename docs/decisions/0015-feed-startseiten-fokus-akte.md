# 0015 — Feed mit Einsätzen und Briefings, Fokus auf der Startseite, Umbau der Akte

## Kontext

Vier Wünsche aus dem Betrieb, die sich alle um dasselbe drehen: Was Nicole
gerade tut, soll dort sichtbar sein, wo Leute es suchen, und sie soll es selbst
pflegen können, ohne dass jemand deployt.

1. Der RSS-Feed trug nur Depeschen.
2. Die Startseite sagte nicht, womit Nicole sich gerade beschäftigt.
3. Die Vortragsformate der Akte entstanden ausschließlich aus den Briefing-Dauern.
4. Die Akte reihte alles untereinander, obwohl Veranstalter zuerst Foto und
   Fakten brauchen.

Dazu kam ein Fehler: Der Hinweis „KI-generiert" stand an mehreren Stellen fest
auf Deutsch und erschien so auch auf `/en`.

## Entscheidungen

### 1. Ein Feed mit drei Arten, statt drei Feeds

`/feed.xml` und `/feed.en.xml` führen jetzt Depeschen, Einsätze und Briefings in
einem nach Datum sortierten Strom. Jeder Eintrag trägt seine Art als
`<category>`; Reader zeigen und filtern danach. Wer nur einen Teil will, hängt
`?art=depeschen`, `?art=einsaetze` oder `?art=briefings` an (mehrere mit Komma).

Bewusst **keine** eigenen Routen je Art: Das wären vier weitere Adressen, die
gepflegt, verlinkt, im `llms.txt` genannt und in der Autodiscovery geführt
werden müssten. Ein unbekannter Wert im Parameter liefert den vollen Feed, kein
leeres Ergebnis — ein Tippfehler soll nicht wie „nichts los" aussehen.

**Die GUIDs der Depeschen bleiben unverändert.** Ein neuer Schlüssel hätte in
jedem Reader alle alten Depeschen noch einmal als ungelesen erscheinen lassen.
Einsätze und Briefings bekommen eigene Präfixe (`mission-…`, `briefing-…`).

Als Zeitstempel eines Einsatzes dient `createdAt`, nicht `startDate`: Die
Neuigkeit ist die Ankündigung. Ein Termin in acht Monaten stünde sonst mit einem
Datum in der Zukunft im Reader und würde dort weggeblendet. Einsätze ohne
freigegebene Einsatzakte verlinken auf die Karte mit Vorauswahl, nicht auf eine
Detailseite, die es nicht gibt.

### 2. „Woran ich gerade arbeite" ist ein eigenes Datenobjekt

Neues Model `HomeFocus`: Titel und ein Satz je Sprache, dazu ein kleines Logo
aus der Mediathek. Gepflegt auf derselben Admin-Seite wie der Hero.

Bewusst **nicht** über die vorhandenen Modelle:

- `Tool` ist der Stammdatensatz für Filter und Verknüpfungen. Ein Werkzeug dort
  zu markieren hieße, die Startseite an eine Liste zu hängen, die aus einem
  ganz anderen Grund wächst.
- `FocusTopic` ist der Radar (Aufklärung, Ausbildung, Identitäten). Dort steht,
  was beobachtet wird, nicht, was auf die Startseite soll.

Beide hätten außerdem entweder Bild oder Text nicht gehabt. Der Wunsch war
„Werkzeuge **und** Themen" in einer Reihe: Genau dafür ist eine kuratierte Liste
das ehrlichere Modell.

**Höchstens sechs Einträge.** Drei Spalten füllen sechs Karten in zwei sauberen
Zeilen, fünf lassen die letzte Zeile offen. Ab dem siebten kippt der Block
optisch in eine Liste. Die Grenze steht in `lib/home-focus.ts` und wird in der
Server-Action geprüft, nicht nur im Formular erwähnt — Sichtbarkeit im UI ist
keine Regel.

Das Logo trägt seinen KI-Hinweis im Alt-Text statt als sichtbares Abzeichen,
wie die Identitäts-Thumbnails: Auf 44 px wäre der Hinweis nicht lesbar.

### 3. Formate der Akte: gepflegt schlägt abgeleitet

Neues Model `SpeakerFormat`. Die Ableitung aus den Briefing-Dauern
(`lib/briefings/formats.ts`) bleibt als Rückfall, solange die Liste leer ist.

Die Ableitung war richtig gegen veraltende Doppellisten, ließ Nicole aber nicht
anbieten, was das Repertoire noch nicht enthält (etwa einen Workshop, den es als
Briefing noch nicht gibt). Der Rückfall hält die alte Zusage: Ohne Pflege
verspricht die Akte weiterhin nur, was es wirklich gibt.

**Die Dauer wird als Minutenbereich gepflegt, nicht als Text.** So schreibt sie
sich in beiden Sprachen richtig („45 bis 60 Min." / „45 to 60 min", ab 90
Minuten in Stunden), ohne dass jemand dieselbe Angabe zweimal tippt. Die
Sprachen sind Ankreuzfelder, keine Freitextspalte.

### 4. Die Akte folgt der Reihenfolge der Fragen

Neue Reihenfolge: Pressefoto und Fakten nebeneinander oben, darunter die
Fachgebiete, dann die Bios, zuletzt Formate und Kontakt nebeneinander.

Die Bios stehen als **Register** statt untereinander: Gebraucht wird immer genau
eine Länge, drei aufgeklappte Textblöcke haben die Seite nur lang gemacht. Die
Register folgen dem WAI-ARIA-Tabs-Muster (Pfeiltasten, Pos1, Ende; nur das
aktive Register liegt im Tab-Verlauf).

Die Fachgebiete stehen **über** den Bios: „Worüber spricht sie?" kommt vor der
Wahl der Bio-Länge.

Fehlt ein Teil, fällt die Spalte weg statt leer zu bleiben — ohne Pressefoto
steht die Faktenbox über die volle Breite, ohne Formate der Kontakt.

### 5. Der KI-Hinweis hat genau eine Quelle

`common.aiGenerated` / `aiGeneratedShort` / `aiGeneratedImage` im Wörterbuch.
Jede Stelle, die den Hinweis zeigt, bekommt die Sprache durchgereicht: Lightbox,
Identitätsseiten, Hero der Startseite, Porträt der Legende, Buchcover. Die
Identitäts-Thumbnails hatten eine zweite Fassung im Code — die ist weg.

Der englische Wortlaut ist **„AI generated"**. `lib/media/ai-labels.test.ts`
hält beides fest: dass beide Sprachen aus dem Wörterbuch kommen und dass in der
englischen Fassung kein deutscher Rest steht.

Die deutschen Vorgaben in `AssetImage` bleiben: Diese Komponente läuft auch in
der Redaktion, und die ist deutschsprachig.

## Konsequenzen

- Zwei neue Tabellen (`HomeFocus`, `SpeakerFormat`), beide rein additiv und
  wiederholbar angelegt. Kein Bestand wird angefasst, kein Rückbau nötig.
- Der Feed berührt bei jedem Abruf drei Quellen statt einer. Alle drei sind
  gecacht und getaggt; fällt eine aus, bleibt der Feed mit den übrigen gültig,
  statt mit einem Fehler zu antworten.
- Wer die Zahl der Startseiten-Einträge ändern will, ändert `HOME_FOCUS_MAX` —
  das Raster, die Prüfung und die Fehlermeldung ziehen mit.
- Solange Nicole keine Formate anlegt, sieht die Akte aus wie vorher.
