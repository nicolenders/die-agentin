# 0013 — Foliensvorlagen für Einsätze: eine je Sprache, als Seiteneinstellung

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

## Konsequenzen

- Vorlagen sind nur im Adminbereich sichtbar. Öffentlich ändert sich nichts.
- Beim Entfernen einer Vorlage wird die Verknüpfung gelöst, die Datei bleibt in
  der Ablage. Ein Fehlgriff kostet damit keine Datei.
- Obergrenze 100 MB; der Speicherbedarf ist von der Dateigröße entkoppelt.
- Der Medien-Proxy streamt jetzt generell. Bei sehr langsamen Verbindungen hält
  eine Antwort länger eine Verbindung offen, belegt dafür aber kaum Speicher.
