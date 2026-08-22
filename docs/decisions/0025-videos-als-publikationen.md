# 0025 — YouTube-Videos als Publikationen, Vorschaubild in eigener Ablage

**Datum:** 13.09.2026
**Status:** angenommen

## Kontext

Nicole tritt in vielen YouTube-Videos auf, verstreut über die Kanäle von
Konferenzen, Communities und Arbeitgebern. Sie sollen unter „Publikationen"
verwaltet und öffentlich mit Vorschaubild gezeigt werden; ein Klick soll das
Video bei YouTube öffnen — im neuen Tab, am Telefon in der App.

Drei Fragen waren zu entscheiden.

## Entscheidung 1: Keine eigene Tabelle, kein neues Feld

Ein Video ist eine `Publication` mit `type = "VIDEO"`:

| Was          | Wo                                              |
| ------------ | ----------------------------------------------- |
| Adresse      | `url` (kanonisch, `watch?v=…`)                  |
| Kanal        | `publisher` — dort steht sonst „Verlag / Medium" |
| Vorschaubild | `coverAsset`                                    |
| Kennung      | wird aus `url` gelesen (`extractYouTubeId`)     |

**Konsequenz:** Das Ganze kommt ohne Migration aus. `type` ist eine
Zeichenkette ohne Check-Constraint (Azure SQL kennt in diesem Schema keine
Aufzählungstypen), die erlaubten Werte stehen in `lib/domain.ts`. Nach der
Migrationsblockade aus ADR-Umfeld dieser Woche ist eine Änderung, die keine
braucht, ein Wert für sich.

Die Kennung wird bewusst NICHT gespeichert. Zwei Felder, die dasselbe sagen,
laufen irgendwann auseinander — und die Ableitung ist eine reine, geprüfte
Funktion.

## Entscheidung 2: Vorschaubild in die eigene Medienablage, nicht verlinkt

Naheliegend wäre `<img src="https://i.ytimg.com/vi/…">`. Dann wäre aber **jeder
Aufruf der Publikationsseite eine Anfrage an Google** — mit IP-Adresse und
Referrer jedes Lesers, ohne dass jemand ein Video angesehen hätte. CLAUDE.md
schließt neue Anfragen an Drittanbieter-Domains ohne Zustimmungsprüfung aus,
und für ein Vorschaubild ein Zustimmungsfeld zu bauen wäre die falsche Antwort
auf die falsche Frage.

Deshalb wird das Bild **einmal beim Anlegen** geholt (`lib/media/import-image.ts`)
und liegt danach unter der eigenen Adresse. Es läuft durch dieselbe Prüfung wie
ein Upload: echter Typ über die Magic Bytes, Metadaten entfernt,
WebP-Varianten.

**Konsequenz:** Das Bild altert. Ändert jemand das Vorschaubild seines Videos,
merkt die Website davon nichts — dafür gibt es „Bild erneuern". Das ist der
Preis dafür, dass die Seite ohne fremde Verbindungen auskommt, und er ist
niedrig.

**Konsequenz:** Die Funktion holt Dateien von fremden Adressen. Damit daraus
kein Werkzeug wird, mit dem sich vom Server aus beliebige Ziele abrufen lassen
(SSRF, etwa in das interne Netz oder auf den Metadatendienst der Cloud), gilt
eine Liste erlaubter Hosts mit **genauer Gleichheit** (kein `endsWith` —
`ytimg.com.angreifer.example` endet auch auf die richtige Zeichenfolge),
ausschließlich `https`, und Weiterleitungen werden nicht verfolgt.

## Entscheidung 3: Verlinken statt einbetten

Für Videos im Fließtext gibt es die Zwei-Klick-Einbettung
(`components/content/VideoConsent.tsx`, SPEC §8/§12.2). Auf der Übersicht wird
sie **nicht** verwendet.

Der Grund: Eine Seite mit vielen Videos wäre damit eine Wand aus
Zustimmungsfeldern — und ein eingebettetes Video, das erst nach Zustimmung
lädt, ist mehr Aufwand als ein Klick, der YouTube öffnet. Die Kachel ist ein
Link auf die kanonische `watch`-Adresse; Android und iOS erkennen sie und
öffnen die App, wenn sie installiert ist. Ein eigenes App-Schema (`vnd.youtube:`)
wäre schlechter: Ohne installierte App liefe es ins Leere.

**Konsequenz:** Ohne Klick entsteht keine Verbindung zu Google. Kein iframe,
kein Skript, kein Cookie.

## Entscheidung 4: Titel und Kanal über oEmbed, Jahr von Hand

Titel und Kanalname kommen beim Sammel-Import von YouTubes oEmbed-Schnittstelle
— serverseitig, ohne Schlüssel, ohne Registrierung, ohne Kontingent. Die
Data-API hätte einen Schlüssel gebraucht und damit einen weiteren Dienst ins
Projekt geholt.

**Konsequenz:** oEmbed liefert **kein Veröffentlichungsdatum**. Ohne Angabe
steht deshalb das laufende Jahr im Eintrag. Wer es gleich richtig haben will,
schreibt es beim Import hinter einen senkrechten Strich (`… | 2021`); sonst ist
es ein Feld wie jedes andere und in der Maske änderbar.

**Konsequenz:** Ist YouTube beim Import nicht erreichbar, entsteht der Eintrag
trotzdem — mit „YouTube-Video <Kennung>" als Titel und ohne Bild. Ein
abgebrochener Import wäre schlechter als einer, der etwas zum Nacharbeiten
hinterlässt; die Liste zeigt genau diese Einträge mit „Bild holen".
