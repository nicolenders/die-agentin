# 0016 — Die Dauer eines Vortragsformats bekommt ihre eigene Einheit

**Datum:** 18.08.2026
**Status:** angenommen

---

## Kontext

Die Vortragsformate der Akte (Entscheidung 0015) speicherten ihre Dauer als
Minutenbereich. Für einen Lightning Talk und eine Session stimmt das. Für einen
Workshop nicht: Der dauert Stunden oder Tage. Ihn in Minuten zu erfassen heißt,
bei jeder Pflege umzurechnen — und „960 Min." liest niemand als zwei Tage.

## Entscheidungen

### 1. Die Einheit wird je Format gewählt, nicht abgeleitet

Neue Spalte `durationUnit` mit den Werten `MINUTES`, `HOURS`, `DAYS`. In der
Redaktion steht neben den beiden Zahlenfeldern ein Auswahlfeld.

Bewusst **keine** automatische Umrechnung: Wer 180 Minuten pflegt, meint
Minuten, und auf der Seite steht „180 Min.". Für „3 Std." gibt es die Einheit.
Das ist der Unterschied zu `formatDuration` in `lib/format.ts`, das
Briefing-Dauern ab 90 Minuten in Stunden schreibt — dort **gibt** es keine
gewählte Einheit, die Zahl kommt aus dem Repertoire und ist immer in Minuten
erfasst (Audit 4.7). Der Rückfall der Akte auf die abgeleiteten Formate benutzt
weiterhin genau diese Regel; er zeigt ja auch genau diese Zahlen.

Ein Zahlenbereich statt Freitext bleibt: So schreibt sich die Dauer in beiden
Sprachen richtig, ohne dass dieselbe Angabe zweimal getippt wird. Die Einheit
steht einmal am Ende des Bereichs („1 bis 2 Tage", nicht „1 Tag bis 2 Tage") und
richtet sich in der Mehrzahl nach dem oberen Wert.

### 2. Die Spalten heißen in der Datenbank weiter `minutesMin`/`minutesMax`

Im Code heißen die Felder `durationFrom` und `durationTo`; die Zuordnung auf die
bestehenden Spalten macht `@map`.

Der Grund ist der Bestand: Alle bereits erfassten Formate stehen in Minuten, und
`durationUnit` steht per Vorgabe auf `MINUTES`. Damit bedeuten diese Zeilen nach
der Migration **genau dasselbe wie vorher** — es wird keine Zeile angefasst,
nichts umgerechnet, nichts kopiert. Die Migration fügt eine einzige Spalte hinzu.

Die Alternativen waren beide schlechter:

- **Spalten umbenennen** (`sp_rename`): Zwischen der manuell ausgeführten
  Migration und dem Deployment des neuen Codes läuft noch der alte Code. Der
  liest `minutesMin` — die Akte wäre in diesem Fenster kaputt.
- **Neue Spalten anlegen und die alten liegen lassen**: zwei tote Spalten, die
  jemand später aufräumen muss, plus eine Umschichtung im Bestand.

Ein Spaltenname, den nur noch Migration und Schema kennen, ist der kleinere
Preis. Er steht als Kommentar am Model, damit niemand beim Lesen der Datenbank
über „minutesMin" mit dem Wert 2 stolpert.

## Konsequenzen

- Rein additive Migration (`20260818160000_speaker_format_duration_unit`), eine
  Spalte, wiederholbar geschrieben. Kein Rückbau nötig.
- Vor dem Deployment ausgeführt ist sie unschädlich: Der alte Code kennt die
  Spalte nicht, und die vorhandenen Werte bedeuten unverändert Minuten.
- Wer eine vierte Einheit will (Wochen?), ergänzt `DURATION_UNITS`; die
  Beschriftung in der Redaktion fällt dann beim Typecheck als fehlend auf, weil
  `DURATION_UNIT_LABEL` aus derselben Liste gebaut wird.
