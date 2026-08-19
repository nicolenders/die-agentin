# 0018 — Anteile im Feed, Kartenansicht als Filter, Suche in den Depeschen

**Datum:** 18.08.2026
**Status:** angenommen

---

## Kontext

Drei Beobachtungen aus dem laufenden Betrieb, die dieselbe Wurzel haben: Eine
Liste ist erst brauchbar, wenn man ihr ansieht, was sie zeigt und was sie
weglässt.

## Entscheidungen

### 1. Der Feed gibt jeder Art einen garantierten Anteil

Der Feed sammelte je Art bis zu 30 Einträge, sortierte alles nach Datum und
schnitt bei 50 ab. Das Datum ist aber nicht dasselbe: Depeschen tragen ihre
Veröffentlichung, Einsätze und Briefings den Zeitpunkt, an dem die Zeile
angelegt wurde. Beim Aufbau des Bestands entstanden Dutzende Zeilen an einem
Tag — damit waren sie alle „neuer" als jede Depesche und füllten die 50 Plätze
vollständig. Im Feed kamen Einsätze und Briefings an, Depeschen nicht eine.

`mergeFeedEntries` gibt deshalb jeder **vorhandenen** Art zuerst ihren Anteil
(`Limit / Anzahl der Arten`, also 16 von 50); die restlichen Plätze verteilt das
Datum. Die Reihenfolge im fertigen Feed bleibt chronologisch, die GUIDs bleiben
unverändert — kein Reader zeigt alte Einträge noch einmal als ungelesen.

Die Alternative wäre gewesen, den Einsätzen und Briefings ein inhaltliches Datum
zu geben (Einsatzdatum, erste Aufnahme ins Repertoire). Das ist auf Dauer das
Richtige, ändert aber die Sortierung bestehender Einträge und war für diesen
Fehler nicht nötig.

### 2. Die Kartenansicht filtert auch die Einsatzliste

Die Ansicht (Welt, Kontinente, DACH) saß in der Karte und schnitt nur den
gezeichneten Ausschnitt zu. Wer „Europa" wählte, sah eine Europakarte — darunter
unverändert alle Einsätze weltweit. Der Zustand liegt jetzt im Explorer, neben
Suche, Jahr und Identität, und filtert beide Darstellungen. Er steht als
`?ansicht=` in der Adresse und bleibt in der Sitzung erhalten wie die übrigen
Filter.

Für DACH reicht das Rechteck nicht: Es umfasst auch Prag und Mailand, während
die Karte nur DE/AT/CH zeichnet. Die Ansicht führt deshalb zusätzlich eine
Länderliste (`countryCodes`), und `matchesView` prüft beides. Karte und Liste
zeigen damit dieselbe Menge.

„Online-Events" steht jetzt neben den Kontinenten statt unter der Karte: Es ist
dieselbe Frage — was sehe ich gerade? Online-Einsätze liegen auf der Karte in
der Antarktis; bei einem Kontinent fallen sie ohnehin heraus.

### 3. Eine Aktion braucht keine eigene Spalte

Die Einsatzliste hatte eine siebte Spalte, in der in jeder Zeile derselbe Knopf
„Auf der Karte" stand. Die Aktion sitzt jetzt als Weltkugel direkt vor dem Ort —
dort, wo sie hingehört. Es bleibt ein echter `<button>` mit `aria-pressed`,
Titel und ausgeschriebenem `aria-label` („Auf der Karte: Wiesbaden"), also
unverändert mit Tastatur bedienbar; nur die Spalte ist weg.

### 4. Die Depeschensuche bleibt serverseitig

Freitextsuche und Jahres-Blibs laufen über die Adresse (`?q=`, `?jahr=`), nicht
über einen Client-Zustand: Die Übersicht bleibt eine Server Component, jeder
Filterstand ist verlink- und teilbar, die Zurück-Taste tut das Erwartete, und
ohne JavaScript funktioniert die Suche trotzdem — es ist ein gewöhnliches
GET-Formular. Der Preis ist ein Klick auf „Suchen" statt Tippen-und-Filtern;
bei einer Liste dieser Größe ist das der bessere Tausch.

Jahres-Blibs erscheinen erst ab zwei Jahrgängen — ein einzelner Blib, der nichts
ändert, ist eine Attrappe. Das Jahr kommt aus dem Datum, das an der Depesche
**steht** (bei Nachschlagewerken die letzte Prüfung) und wird in Berliner Zeit
gelesen, damit ein Silvestereintrag nicht ins falsche Jahr rutscht.

## Konsequenzen

- Keine Migration, kein SQL. Alle vier Punkte sind Anzeige- und Filterlogik.
- Der Feed ändert seine Zusammensetzung ab dem nächsten Abruf; abonnierte Reader
  bekommen die fehlenden Depeschen nach.
- `?ansicht=` ist ein neuer Parameter der Einsätze; alte Links ohne ihn zeigen
  weiterhin die Welt.
- Wer später Dossiers in den Feed nimmt, bekommt automatisch seinen Anteil —
  `mergeFeedEntries` rechnet mit der Zahl der vorhandenen Arten.
