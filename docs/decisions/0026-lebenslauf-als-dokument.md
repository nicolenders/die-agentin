# 0026 — Der Lebenslauf ist ein Dokument, die Auswahl steht in der Adresse

**Datum:** 24.08.2026
**Status:** angenommen

## Kontext

Die Seite `/[locale]/cv` gab bisher die Website-Bausteine der Nachweis- und
Publikationsseiten in dunklem Layout aus: Badge-Kacheln, Cover-Raster,
Radar-Themen. Gedruckt kam ein Website-Auszug heraus, kein Lebenslauf, den man
einer Bewerbung beilegt. Der Auszug ließ sich nur grob eingrenzen — nach
Datenart und Jahresspanne, nicht nach einzelnen Einträgen.

Gleichzeitig war die Pflegemaske eine einzige lange Seite: vier Rubriken,
jeder Eintrag als aufgeklapptes Formular, die Reihenfolge über ein Zahlenfeld
in jedem dieser Formulare.

## Entscheidung

**1. Eigene Darstellung für das Dokument.** `/cv` rendert ein weißes A4-Blatt
mit eigenen Bausteinen (`components/cv/`): links eine feste Zeitspalte, rechts
der Inhalt. Die öffentlichen Kachel-Komponenten (`CertificationSections`,
`PublicationSections`) werden dort nicht mehr verwendet. Das Blatt ist auch am
Bildschirm hell — was zu sehen ist, kommt so aus dem Drucker.

**2. Die Auswahl reist in der Adresse, sie wird nicht gespeichert.** Der
Auswahldialog hängt `nur=<ids>` oder `aus=<ids>` an die Adresse
(`lib/resume/selection.ts`). Gewählt wird die kürzere der beiden Schreibweisen;
ohne Parameter ist der Lebenslauf vollständig.

**3. Ein zweites Bild für den Lebenslauf.** `ResumeProfile.portraitAssetId` ist
optional und fällt auf das Porträt der Legende zurück. Ein Bild dort wirkt
nicht auf die Legende zurück.

**4. Die Maske bekommt Register, Tabellen und Dialoge.** Je Themenfeld eine
Tabelle mit den bestehenden Einträgen, Bearbeiten und Anlegen im modalen
Dialog, Reihenfolge über ↑/↓ direkt in der Tabelle. Publikationen,
Zertifizierungen und Awards erscheinen lesend — gepflegt werden sie weiter dort,
wo sie hingehören.

## Begründung

- **Kein gespeicherter Zustand:** Eine Bewerbung braucht mal diesen, mal jenen
  Zuschnitt. Gespeicherte „Lebenslauf-Varianten" wären ein zweiter Datenbestand,
  der gepflegt sein will — bei einer Person, die die Seite nebenbei betreibt,
  eine Belastung ohne Gegenwert. Ein Link dagegen lässt sich aufheben,
  weitergeben und wegwerfen.
- **Kürzere der beiden Listen:** Bei 60 Einträgen und zwei Abwahlen wäre eine
  Positivliste über tausend Zeichen lang. Die Umkehrung hält die Adresse in
  jedem Fall unter der Hälfte.
- **Zahlenfeld ersetzt:** Eine Reihenfolge über Zahlen zu pflegen heißt, sich
  Zahlen zu merken, die niemand sieht. Zwei Pfeile in der Tabelle brauchen
  keine Erklärung.
- **Gleichnamige Nachweise gruppiert:** Sieben MVP-Awards in sieben Zeilen liest
  niemand. `groupRecords` macht daraus eine Zeile mit Jahresspanne — und
  behauptet nur dann eine Spanne, wenn wirklich jedes Jahr belegt ist.

## Konsequenzen

- Die Query-Parameter `art`, `von` und `bis` an `/cv` entfallen. Die Seite ist
  nicht verlinkt und nicht indexiert; alte Adressen mit diesen Parametern
  liefern jetzt den vollständigen Lebenslauf statt eines Ausschnitts.
- Die Radar-Themen („Aktuelle Themen") erscheinen nicht mehr im Lebenslauf.
  Sie stehen weiter auf der Nachweisseite.
- Videos bleiben aus dem Abschnitt „Publikationen" heraus (`publicationsForCv`)
  — wie zuvor, jetzt aber an einer Stelle entschieden statt über ein Flag an
  der Komponente.
- Die Druckregel blendet nur noch `body > header` und `body > footer` aus. Ein
  pauschales `header` hätte den Kopf des Lebenslaufs selbst mitgenommen: Name,
  Foto und Kontaktzeile wären ausgerechnet auf dem Papier verschwunden.
