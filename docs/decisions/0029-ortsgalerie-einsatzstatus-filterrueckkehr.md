# 0029 — Ortsgalerie auf der Karte, Einsatzstatus im Filter, Rückkehr in die gefilterte Liste

**Datum:** 04.09.2026
**Status:** angenommen

---

## Kontext

Drei Beobachtungen aus dem laufenden Betrieb. Zwei davon haben dieselbe Wurzel:
etwas ist da, aber der Weg dorthin fehlt.

## Entscheidungen

### 1. Mehrere Einsätze an einem Ort sind eine Galerie im Popup

Nicole spricht wiederholt am selben Ort. Auf der Weltkarte liegen diese Einsätze
als ein Punkt übereinander; anklickbar war nur der zuletzt gezeichnete, und das
Popup zeigte genau diesen einen. Die übrigen gab es für den Betrachter nicht —
sie standen nur in der Tabelle unter der Karte.

Das Popup führt jetzt über Pfeile links und rechts endlos durch alle Einsätze
desselben Ortes, neuester zuerst; hinter dem letzten kommt wieder der erste. Wer
einen bestimmten Einsatz auswählt (Tabellenzeile, Deep-Link `?einsatz=`), landet
in der Galerie an dessen Stelle, nicht am Anfang. Die Pfeiltasten tun dasselbe
wie die Pfeile, Escape schließt weiterhin.

**„Derselbe Ort" heißt: gleiche Koordinaten auf zwei Nachkommastellen** (rund
ein Kilometer, `lib/map/location-group.ts`). Das ist die Auflösung, ab der zwei
Punkte auch im engsten Ausschnitt — DACH, etwa 15 Längengrade auf 1000 px —
übereinanderliegen. Genauer zu prüfen hieße: zwei Einträge, die der Betrachter
als einen Punkt sieht, blieben getrennt, und einer davon wäre weiter
unerreichbar. Genau das sollte die Änderung beheben. Gröber zu prüfen würde
benachbarte Städte zusammenwerfen.

Die Galerie zeigt, was die Karte zeigt: die aktuell gefilterte Menge. Ein durch
Jahr, Identität oder Werkzeug ausgefilterter Einsatz taucht auch hier nicht auf
— sonst widerspräche das Popup der Zählung über der Karte.

### 2. Der Statusfilter der Einsätze meint den Einsatz, nicht die Veröffentlichung

Der Filter „Status" in der Einsatzliste bot `DRAFT`, `SCHEDULED`, `PUBLISHED`
und `ARCHIVED` an — die Zustände der **Veröffentlichung**, von denen ein Einsatz
zwei nie annimmt: `contentStatus` wird ausschließlich aus dem Speichern
abgeleitet (Entwurf, veröffentlichen, ins Archiv legen), `SCHEDULED` kommt dabei
nicht vor. Wer nach „Eingeplant" filterte, bekam garantiert nichts.

Ein Einsatz ist **geplant, abgeschlossen, abgesagt oder archiviert**. Diese vier
stehen jetzt im Filter und in der Spalte „Status". Technisch stecken sie in zwei
Feldern — `status` (im Formular gepflegt) und `contentStatus` (`ARCHIVED` über
„Ins Archiv legen") —, `lib/admin/mission-status.ts` führt beide zusammen. Das
Archiv gewinnt: ein abgelegter Einsatz steht nicht mehr unter „Geplant".

Die Veröffentlichung ist deswegen nicht verschwunden, sondern hat eine eigene
Spalte bekommen. Sie entscheidet, ob die öffentliche Einsatzakte existiert; das
muss in der Liste ablesbar bleiben.

### 3. Ein gesetzter Filter überlebt das Bearbeiten

Wer in Einsätzen, Briefings oder Depeschen filtert, einen Eintrag öffnet und
zurückgeht, landete in der vollständigen Liste. Der Filter war jedes Mal neu zu
setzen — bei einer Liste, die man Zeile für Zeile durchgeht, einmal pro Zeile.

Die Listen tragen ihren Zustand ohnehin in der Adresse. Er reist jetzt als
`?zurueck=` mit in die Maske und wird von „Zurück zur Liste" und vom Speichern
wieder angesteuert; dasselbe gilt für Löschen, Archivieren und Sortieren aus der
Liste heraus. Bei den Einsätzen fährt auch die Seitenzahl mit.

`safeReturnTo` (`lib/admin/return-to.ts`) lässt nur einen relativen Pfad zu, der
genau zu der erwarteten Liste gehört. Eine Adresse aus der URL darf niemanden
auf eine fremde Seite schicken — auch nicht über `//host`, eine absolute URL
oder einen Pfad, der bloß mit dem Listenpfad anfängt.

## Konsequenzen

- Keine Migration, kein SQL. Alle drei Punkte sind Anzeige-, Filter- und
  Navigationslogik.
- `?zurueck=` ist ein neuer Parameter der drei Bearbeitungsmasken. Alte Links
  ohne ihn führen wie bisher in die ungefilterte Liste.
- Der Statusfilter der Einsätze versteht die alten Werte (`PUBLISHED` &c.) nicht
  mehr; ein alter Link mit `?status=PUBLISHED` zeigt die Liste ungefiltert statt
  leer.
- Damit „Abgeschlossen" trägt, muss der Status am Einsatz gepflegt sein. Er wird
  bewusst **nicht** aus dem Datum abgeleitet: ein Auftritt, der abgesagt wurde,
  ist auch nach seinem Termin nicht abgeschlossen.
