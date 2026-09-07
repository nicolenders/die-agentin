# 0032 — Die Veranstaltung als eigene Entität, der Einsatz behält seine Momentaufnahme

**Datum:** 07.09.2026
**Status:** angenommen

---

## Kontext

Nicole ist bei denselben Veranstaltungen immer wieder — jährlich oder in einem
anderen Rhythmus. Bis jetzt trug jeder Einsatz seinen Veranstaltungsnamen und
seine Adresse als Freitext. Die Folge: „Experts Live Austria“ steht sechsmal
leicht verschieden in der Datenbank, eine Zusammengehörigkeit ist weder filter-
noch darstellbar, und eine geänderte Website müsste an jedem Einsatz einzeln
nachgezogen werden.

Gleichzeitig soll sich rückwirkend nichts ändern: Eine Einsatzakte von 2021
zeigt, wie die Veranstaltung damals hieß und wohin sie damals verwies. Ein
Stammdatensatz, der alte Akten mit umschreibt, wäre eine Geschichtsfälschung.

## Entscheidung

Zwei neue Entitäten, beide optional am Einsatz:

- **`EventSeries` (Veranstaltung)** — Name, Veranstalter, Website. Das, was über
  die Jahre gleich bleibt.
- **`EventEdition` (Ausgabe)** — Bezeichnung (in der Regel das Jahr) und
  Zeitraum. Der Historieneintrag der Veranstaltung: wann sie stattfand.

`Mission.eventName` und `Mission.eventUrl` **bleiben**. Sie sind ab jetzt
ausdrücklich die Momentaufnahme des einzelnen Auftritts; die Veranstaltung
liefert nur die Vorbelegung. Wer die Adresse in einem Einsatz ändert, bekommt
den Haken „auch in die Stammdaten übernehmen“ (vorbelegt) — nach vorn wirksam,
nach hinten wirkungslos.

Der Zeitraum der Veranstaltung wird **nicht** am Einsatz gespeichert. Er gehört
der Ausgabe; mehrere Einsätze derselben Ausgabe teilen sie sich. Der Einsatztag
bleibt davon unberührt — er ist der Tag des Auftritts, nicht der Konferenzwoche.

Zwei Fremdschlüssel am Einsatz statt einem (`eventSeriesId` **und**
`eventEditionId`): Der Filter „alles bei dieser Veranstaltung“ ist die
häufigste Frage und soll ohne Umweg über die Ausgabe zu beantworten sein. Und
ein Einsatz darf einer Veranstaltung zugeordnet sein, ohne dass jemand ihren
Zeitraum kennt.

## Dubletten: eine Regel im Code, keine Freitextprüfung

`lib/events/naming.ts` normalisiert einen Namen zu einem Vergleichsschlüssel:
Kleinschreibung, Umlaute, Satzzeichen, Jahreszahlen, Ordnungszahlen und
Ausgabe-Wörter („Edition“, „Ausgabe“) fallen weg. „TechDay 2024“, „TechDay
2025“ und „TechDay – 3. Ausgabe“ ergeben denselben Schlüssel. Er ist eindeutig,
also entsteht dieselbe Veranstaltung gar nicht erst zweimal — auch nicht beim
Anlegen aus der Einsatzmaske heraus.

Jahreszeiten bleiben stehen: „Community Day Spring“ und „Community Day Autumn“
sind zwei Veranstaltungen. Zwei wirklich verschiedene Veranstaltungen mit
identischem Namen brauchen einen unterscheidbaren Namen („Community Day Köln“).
Das ist die bewusste Grenze dieser Regel; die Alternative wäre eine
Ähnlichkeitssuche, die manchmal falsch liegt und die niemand nachvollziehen
kann.

## Bestand

Die Migration `20260914120000_event_series` ist rein additiv und ordnet nichts
zu. Das Zusammenfassen des Bestands macht `npm run db:backfill-events` —
idempotent, mit `--dry-run`, und standardmäßig nur für Namen, die mehr als
einmal vorkommen: Für einen einmaligen Auftritt braucht es keine Stammdaten.
Ausgaben legt das Skript **nicht** an; aus einem Einsatztag lässt sich der
Zeitraum einer Konferenz nicht ableiten.

Weil unscharfe Erkennung gelegentlich danebengreift, gibt es in
`/admin/veranstaltungen` das Gegenstück: Veranstaltungen lassen sich
zusammenführen (Einsätze und Ausgaben ziehen um), und die Zuordnung eines
einzelnen Einsatzes lässt sich in seiner Maske jederzeit ändern.

## Konsequenzen

- Der Adminbereich bekommt einen Punkt „Veranstaltungen“ (Stammdaten +
  Ausgaben-Chronik + Zusammenführen) und in der Einsatzliste einen Filter
  danach.
- Die Einsatzmaske pflegt zwei Namen: den der Veranstaltung (Stammdaten) und den
  dieses Einsatzes. Das ist eine Zeile mehr Erklärung in der Maske — dafür
  bleiben alte Akten unverändert.
- Öffentlich zeigt die Einsatzakte einen Block „Diese Veranstaltung“ mit
  Veranstalter, Website und den weiteren veröffentlichten Einsätzen dort; die
  Einsatzliste bekommt einen Filter „nur diese Veranstaltung“. Eine eigene
  öffentliche Veranstaltungsseite gibt es **nicht** — sie wäre eine weitere
  Route mit Slugs und Metadaten je Sprache, ohne Inhalt, den es nicht schon
  gäbe.
- Löschen einer Veranstaltung löscht keine Einsätze: Sie verlieren nur ihre
  Zuordnung und behalten Name und Adresse.
