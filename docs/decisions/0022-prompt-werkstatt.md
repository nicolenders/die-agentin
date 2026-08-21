# 0022 — Prompt-Werkstatt: Vorlagen statt KI-Generator

**Datum:** 21.08.2026
**Status:** angenommen

## Kontext

Bilder und Begleittexte entstehen bisher außerhalb der Website: Prompts stehen
teils in `docs/BILDPROMPTS.md`, teils in Skills, teils nirgends. Wer ein Motiv
für einen bestimmten Einsatz braucht, sucht die Eckdaten im Adminbereich
zusammen und tippt sie in einen Prompt ab — jedes Mal neu, jedes Mal anders.

Gewünscht war ein Bereich, in dem sich Prompts pflegen lassen und in dem man
einen Einsatz, ein Briefing oder eine Depesche plus eine oder mehrere
Identitäten auswählt und den fertigen Prompt bekommt.

## Entscheidung

Eine **Werkstatt aus Vorlagen mit Platzhaltern**, serverseitig
zusammengesetzt. Kein Modellaufruf.

- `PromptTemplate` hält Vorlagentext, Art (Bild/Text), Bezug (Einsatz,
  Briefing, Depesche, Identität, keiner) und ob Identitäten wählbar sind.
- `PromptSnippet` hält wiederverwendbare Bausteine; der Stil-Baustein steht
  damit genau einmal und wirkt auf jedes Bildmotiv.
- Drei Regeln in der Vorlagensprache: `{{platzhalter}}`, `{{baustein.x}}` und
  `[[Wahlteil mit {{platzhalter}}]]`, der ganz wegfällt, wenn eine Angabe
  fehlt.
- Der erzeugte Prompt wird **nicht gespeichert**. Er entsteht bei jedem Aufruf
  neu aus Vorlage plus aktuellen Daten.
- Der mitgelieferte Standardsatz liegt in `lib/prompts/defaults.ts` und wird im
  Adminbereich per Knopfdruck eingespielt. Er ergänzt nur, was fehlt.
- Der Satz kommt **fertig formuliert**: 10 Bausteine, 14 Bild- und 18
  Textvorlagen. Sein Inhalt ist nicht neu erfunden, sondern zusammengezogen aus
  dem, was für die Website ohnehin schon galt — Bildstile, Schreibstimme,
  Verbotslisten, Plattformregeln —, das bisher über Skills und
  Markdown-Dateien verteilt lag.

Gegen die Alternative, den Prompt von Microsoft Foundry ausformulieren zu
lassen (die Anbindung gibt es für Übersetzungen bereits).

## Begründung

- **Vorhersagbar.** Dieselbe Auswahl ergibt denselben Prompt. Ein Bildmotiv,
  das einmal funktioniert hat, funktioniert wieder — genau das macht eine
  Bildserie zur Serie.
- **Wartbar.** Was im Prompt steht, hat Nicole geschrieben. Wenn ein Ergebnis
  nicht passt, ist die Ursache im Vorlagentext sichtbar und dort zu ändern.
- **Ohne Betriebsrisiko.** Keine Abhängigkeit von Verfügbarkeit, Latenz,
  Kosten oder Modellwechseln für eine Aufgabe, die Textbausteine lösen.
- **Prüfbar.** Die Ersetzung ist reine Logik in `lib/prompts` und liegt unter
  Unit-Tests, einschließlich der Prüfung, dass jede mitgelieferte Vorlage nur
  Platzhalter anspricht, die es gibt.

## Konsequenz

- Vorlagen sind Redaktionsarbeit: Wer ein besseres Motiv will, ändert den Text
  in der Vorlage, nicht eine Modellinstruktion.
- Ein neues Datenfeld im Prompt heißt: Platzhalter in `lib/prompts/catalog.ts`
  eintragen, Wert in `lib/prompts/context.ts` bauen, in `lib/queries/prompts.ts`
  laden. Der Katalog ist zugleich die Prüfung beim Speichern.
- `docs/BILDPROMPTS.md` bleibt als Erklärung des Bildstils bestehen, ist aber
  nicht mehr der Ort, an dem Prompts gepflegt werden.
- Sollte später doch eine KI-Politur gewünscht sein, lässt sie sich als
  zusätzlicher Schritt hinter der Werkbank ergänzen, ohne das Datenmodell zu
  ändern.
