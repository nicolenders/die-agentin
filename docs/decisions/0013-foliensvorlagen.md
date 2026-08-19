# 0013 — Foliensvorlagen für Einsätze: eine je Sprache, als Seiteneinstellung

**Datum:** 17.08.2026
**Status:** angenommen

---

## Kontext

Zu einem Einsatz gehören Folien. Der Weg dorthin ist immer derselbe: Vorlage
öffnen, Folien bauen, fertige Folien am Einsatz hinterlegen. Der letzte Schritt
existiert bereits (PDF-Upload im Einsatzformular, `Mission.slidesFilePath`), der
erste bisher nicht — die Vorlage lag außerhalb der Anwendung.

Gewünscht: eine PowerPoint-Vorlage auf Deutsch und eine auf Englisch, und im
Einsatz die zur gewählten Vortragssprache passende zum Download.

## Entscheidungen

### 1. Eine Vorlage je Sprache, nicht je Einsatz

Eine Vorlage ist keine Eigenschaft eines einzelnen Einsatzes — dieselbe Datei
dient allen. Sie liegt deshalb als **Seiteneinstellung** (`SiteSetting`) unter
den Schlüsseln `slideTemplate.<locale>.path` und `slideTemplate.<locale>.fileName`.

Folge: keine Migration, keine neue Tabelle, keine Spalte an `Mission`. Käme
später der Wunsch nach abweichenden Vorlagen je Einsatz, ist der Weg dorthin ein
optionales Feld am Einsatz, das diese Vorgabe überschreibt — die jetzige
Struktur steht dem nicht im Weg.

### 2. Gepflegt unter Medien → Vorlagen

Die Vorlagen sind Dateien und gehören dorthin, wo die übrigen Dateien liegen:
`/admin/medien?tab=vorlagen`, neben Bildern und Präsentationen. Das
Einsatzformular verlinkt dorthin, wenn für die gewählte Sprache nichts
hinterlegt ist — der leere Zustand führt zur Abhilfe, statt nur zu melden.

Sie bekommen **keinen** `MediaDocument`-Eintrag. Dort werden Folien-PDFs mit
ihrer Verwendung am Einsatz geführt; eine Vorlage hat keine solche Verwendung
und ließe sich dort löschen, obwohl sie in Gebrauch ist.

### 3. Typprüfung über den Inhalt, nicht über die Endung

`isOfficePresentation` verlangt die ZIP-Signatur **und** den Eintragsnamen
`ppt/presentation.xml` im Byte-Strom (er steht im lokalen ZIP-Header
unkomprimiert). Eine umbenannte `.docx` oder ein beliebiges ZIP fällt damit
durch. Das alte Binärformat `.ppt` wird eigens erkannt, damit die Meldung sagt,
was zu tun ist („bitte als .pptx speichern") statt nur „nicht erlaubt".

Am PowerPoint selbst wird nichts verarbeitet: hochgeladen, gespeichert,
ausgeliefert. Kein Parsen, kein Umschreiben.

### 4. Download mit sprechendem Namen

Gespeichert wird unter einer UUID. Damit die Datei nicht als `a3f1….pptx` im
Download-Ordner landet, akzeptiert der Medien-Proxy `?dl=<Dateiname>` und setzt
daraus `Content-Disposition` (RFC 6266, ASCII-Fallback plus `filename*` für
Umlaute). Steuerzeichen und Anführungszeichen werden entfernt, damit sich der
Header nicht aufbrechen lässt. Ohne den Parameter verhält sich `/media/…`
unverändert.

### 5. Fehlt die Vorlage der gewählten Sprache

Dann wird die der anderen Sprache angeboten — sichtbar gekennzeichnet. Ein
stiller Rückfall wäre schlechter: Nicole würde in der falschen Sprache anfangen
und es erst auf Folie zwölf merken.

### 6. Große Vorlagen: im Fluss statt im Speicher

Die erste Fassung übernahm die 20-MB-Grenze des Folien-Uploads. Die echten
Vorlagen wiegen **41,7 MB (DE) und 29,5 MB (EN)** — eine Corporate-Vorlage
trägt ihr Bildmaterial in den Folienmastern mit sich. Die Grenze anzuheben
allein hätte nicht gereicht:

- `request.formData()` liest den gesamten Upload in den Speicher, und
  `Buffer.from(await file.arrayBuffer())` legt eine zweite Kopie an.
- Der Medien-Proxy las die Datei vollständig ein und kopierte sie für die
  Antwort noch einmal.
- Die Container-App hat **0,5 GiB** (`infra/main.bicep`). Eine 42-MB-Vorlage
  hätte im Hoch- und Herunterladen jeweils rund das Doppelte belegt — und der
  Container bedient zugleich die öffentliche Website.

Deshalb fließt die Vorlage jetzt durch, statt zwischengelagert zu werden:

- **Upload:** roher Anfragekörper statt Formulardatei (Sprache und Dateiname in
  der Query), `Readable.fromWeb(request.body)` → `Transform` → `storeStream`.
  Der `PresentationScanner` prüft im Vorbeifließen (Signatur, Marker,
  Überlappung an den Blockgrenzen) und bricht bei Überschreiten der Grenze ab;
  angefangene Dateien werden mit `deleteMedia` weggeräumt. Im Speicher liegen
  nur die Blöcke, die gerade unterwegs sind (~8 MB beim Blob-Upload).
- **Download:** `openMedia` liefert einen Strom, `/media/…` reicht ihn durch.
  Das entlastet auch Bilder und Folien-PDFs.
- **Grenze: 100 MB.** Nicht mehr durch den Arbeitsspeicher begrenzt, sondern
  eine bewusste Obergrenze gegen Ausrutscher. Formular und API nennen dieselbe
  Zahl (`MAX_SLIDE_TEMPLATE_MB`), und das Formular sagt vor dem Hochladen ab,
  statt vierzig Megabyte zu übertragen und danach abzulehnen.

Der Multipart-Weg (`formData`) bleibt für Bilder und Folien-PDFs, wie er ist:
dort sind 20 MB die richtige Grenze, und die Bildverarbeitung braucht die Datei
ohnehin als Ganzes.

### 7. Nachtrag: der Upload kam an, die Datei war trotzdem kaputt

Nach Abschnitt 6 ging der Upload durch — ohne Fehlermeldung. Die Datei ließ sich
aber in PowerPoint nicht öffnen, und auch die angebotene Reparatur scheiterte.

Ein Round-Trip durch die Route-Handler (31-MB-Datei, SHA-256 vorher/nachher,
`zipfile.testzip()` danach) zeigte: die Verarbeitung ist byteweise korrekt. Es
war die **Übertragung** — und die war an keiner Stelle geprüft. Genau das ist der
gefährliche Fall: Bricht eine minutenlange Verbindung ab, kommt das serverseitig
als sauberes Dateiende an. Vorne sieht die Datei fehlerfrei aus, die Signatur
stimmt, der Präsentationsteil ist da. Was fehlt, steht am **Ende** — und dort hat
niemand hingesehen.

Zwei Änderungen, die zusammengehören:

**Der Upload läuft in Teilstücken** (4 MB, `?phase=part`), die am Ende zur Datei
zusammengesetzt werden (`?phase=commit`). Jedes Stück ist eine eigene, kurze
Anfrage und wird bei einem Aussetzer bis zu dreimal wiederholt. Produktiv sind
das die Blöcke eines Azure-Block-Blobs (`stageBlock`/`commitBlockList`), lokal
Teildateien. Nebeneffekt: keine Anfrage hält mehr als ein paar MB im Speicher,
und kein Ingress-Limit für einzelne Anfragen kann greifen. Der Fortschritt steht
auf der Schaltfläche — bei 42 MB will man sehen, dass etwas passiert.

**Geprüft wird, was in der Ablage liegt** — nicht, was wir geschickt haben
(`verifyTemplateArchive`):

| Prüfung | fängt ab |
|---|---|
| Größe gegen die angekündigte Größe | abgebrochene Übertragung |
| ZIP-Signatur am Anfang | Fremdformat, altes `.ppt` |
| Schlussmarke (`PK\x05\x06`) am Ende | **abgeschnittene Datei — der eigentliche Fehler** |
| `ppt/presentation.xml` im Verzeichnis | umbenannte .docx |

Erst wenn das alles stimmt, wird die Vorlage hinterlegt; sonst wird die Datei
gelöscht und die Meldung nennt die Zahlen („20,0 MB von 42,0 MB angekommen“).
Die hinterlegte Größe steht sichtbar in der Oberfläche — sie lässt sich mit der
Datei auf dem Rechner vergleichen, ohne sie herunterzuladen.

Beim Download setzt `openMedia` zusätzlich `maxRetryRequests`: reißt der Strom
mitten in einer 40-MB-Datei ab, holt das SDK den Rest nach, statt die Antwort
still zu beenden.

### 8. Nachtrag: Der Foliensatz gehört zum Briefing, nicht zum Einsatz

Ursprünglich hing die Sprachauswahl der Vorlage am Einsatz. Falsche Stelle: Die
Folien gehören zum **Vortrag**, nicht zum Termin. Dasselbe Briefing wird
mehrfach gehalten — die Folien jedes Mal neu zu hinterlegen, hieße dieselbe
Datei mehrfach zu pflegen und beim Nachbessern zu vergessen, welche Fassung wo
liegt.

Deshalb:

- **Am Briefing** liegt je Sprache ein Foliensatz (`TalkSlideDeck`, eindeutig je
  Briefing und Sprache). Dort steht auch die Vorlage zum Herunterladen — der Weg
  ist an einer Stelle vollständig: Vorlage laden, Folien bauen, Folien hinterlegen.
- **Am Einsatz** wird nur noch angeboten, was am zugeordneten Briefing hinterlegt
  ist, in der für diesen Einsatz gewählten Vortragssprache. Ohne Briefing steht
  dort der Hinweis, dass zuerst eines zu wählen ist.
- Die Vorlagen bleiben, wo sie sind (Medien → Vorlagen): Sie gelten für alle
  Briefings, ein Foliensatz nur für eines.

Der Upload-Weg ist derselbe wie bei den Vorlagen — Teilstücke, Prüfung der
abgelegten Datei — und liegt jetzt einmal in `lib/media/chunked-upload.ts`
statt zweimal in zwei Routen.

Fehlt die Sprache, wird die andere angeboten und **gekennzeichnet**
(`pickForLanguage`, unit-getestet). Ein stiller Rückfall wäre hier besonders
teuer: Man stünde mit deutschen Folien vor englischem Publikum.

## Konsequenzen

- Vorlagen sind nur im Adminbereich sichtbar. Öffentlich ändert sich nichts.
- Beim Entfernen einer Vorlage wird die Verknüpfung gelöst, die Datei bleibt in
  der Ablage. Ein Fehlgriff kostet damit keine Datei.
- Obergrenze 100 MB; der Speicherbedarf ist von der Dateigröße entkoppelt.
- Der Medien-Proxy streamt jetzt generell. Bei sehr langsamen Verbindungen hält
  eine Antwort länger eine Verbindung offen, belegt dafür aber kaum Speicher.
