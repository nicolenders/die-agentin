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

## Konsequenzen

- Vorlagen sind nur im Adminbereich sichtbar. Öffentlich ändert sich nichts.
- Beim Entfernen einer Vorlage wird die Verknüpfung gelöst, die Datei bleibt in
  der Ablage. Ein Fehlgriff kostet damit keine Datei.
- Obergrenze 20 MB, wie beim Folien-Upload.
