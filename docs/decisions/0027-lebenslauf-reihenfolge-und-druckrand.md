# 0027 — Reihenfolge im Lebenslauf und ein druckbarer Seitenrand

**Datum:** 24.08.2026
**Status:** angenommen

## Kontext

Drei Beobachtungen aus der ersten Pflegerunde am neuen Lebenslauf (0026):

1. Gedruckt blieb zu wenig Rand — auf Papier unbrauchbar.
2. Werdegang und Projekte standen in der Reihenfolge, die zufällig in
   `sortOrder` stand. Bei 75 importierten Projekten ist das Sortieren von Hand
   keine Arbeit, die ein Mensch machen sollte.
3. Von den älteren Projekten ist in den Quelldokumenten kein Zeitraum
   überliefert, sondern nur eine Dauer („6 Monate“). In derselben Liste wie die
   datierten Projekte springt die Zeitspalte zwischen Datum und Dauer.

## Entscheidung

**1. Zwei Arten von Reihenfolge, je Rubrik entschieden** (`lib/resume/order.ts`).
Werdegang und Projektreferenzen sortieren sich aus „von“/„bis“ selbst, neueste
zuerst. Ausbildung und Fähigkeiten bestimmt Nicole mit den Pfeilen in der
Tabelle. Eine Funktion, `inDisplayOrder`, liefert die Reihenfolge an alle vier
Stellen, die sie brauchen: Dokument, Tabelle, Auswahldialog und die
Pfeil-Aktion.

**2. Ältere Projekte als eigene Rubrik, abgeleitet aus den Daten.** Ein Projekt
mit lesbarem Zeitraum steht unter „Projektreferenzen“, eines mit reiner Dauer
unter „Ältere Projekte“ — kein zusätzliches Feld, keine Migration.

**3. Der Seitenrand gehört an `@page`,** nicht an das Blatt: 22 mm oben, rechts
und unten, 25 mm links. Das Website-Raster (`.wrap`) wird im Druck
neutralisiert.

**4. Die Lebenslauf-Seite erklärt sich beim Drucken als helles Dokument**
(`html:has(.cv-page) { color-scheme: light }` im Druck-Block).

## Begründung

- **Pfeile nur, wo sie etwas bewegen:** In automatisch sortierten Rubriken
  erscheinen keine Pfeile. Ein Knopf, der nichts tut, ist schlimmer als keiner.
- **Eine Reihenfolge-Funktion für alle:** Zeigte die Tabelle etwas anderes als
  das Dokument, verschöbe ein Pfeil einen anderen Eintrag als den, neben dem er
  steht.
- **Abgeleitet statt gespeichert:** Trägt Nicole bei einem älteren Projekt
  später einen Zeitraum nach, rückt es von selbst zu den Projektreferenzen.
- **`@page` statt Innenabstand:** Ein Innenabstand am Blatt gilt einmal für den
  ganzen Block. Bei einem mehrseitigen Lebenslauf stünde Seite 2 oben ohne
  Rand.
- **Farbschema statt Hintergrundfarbe:** Die Website meldet sich als dunkles
  Design an (`colorScheme: "dark"`, `lib/brand.ts`). Der Browser füllt den
  Bereich zwischen Papierkante und Satzspiegel daraufhin mit seiner dunklen
  Grundfarbe — ein schwarzer Rahmen um jede Seite, sobald Hintergrundgrafiken
  mitgedruckt werden oder jemand als PDF sichert. Eine weiße Hintergrundfarbe
  auf `html` oder `body` hilft dagegen nicht: Über diesen Bereich entscheidet
  allein das Farbschema. Ein `viewport`-Export auf der Seite oder in einem
  eigenen Layout setzt sich gegen das übergeordnete Layout nicht durch —
  geprüft, beides blieb wirkungslos. Der `:has()`-Selektor im Druck-Block ist
  das, was messbar funktioniert.

## Konsequenzen

- Ändert Nicole bei einem Werdegangs- oder Projekteintrag den Zeitraum, ändert
  sich damit auch seine Position. Das ist beabsichtigt.
- Ältere Projekte lassen sich weiterhin von Hand ordnen; sie stehen im Dokument
  immer hinter den datierten Projekten.
- Die Ränder stehen an einer Stelle (`$cv-margin-*` in `styles/globals.scss`)
  und gelten für Bildschirm und Druck gleichermaßen.
