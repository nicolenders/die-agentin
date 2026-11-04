# 0035 — Einsatzliste bleibt sichtbar, wenn das Veranstaltungs-Schema fehlt

**Datum:** 04.11.2026
**Status:** angenommen

---

## Kontext

Seit dem Deploy vom 20.10.2026 zeigt `/de/einsaetze` „0/0 Einsätze — Keine
Einsätze für diese Auswahl". Die Identitäten auf derselben Seite laden, die
Datenbank ist also erreichbar.

Mit PR #90 (ADR 0034) liest die Einsatzliste die Veranstaltung mit
(`eventSeries`), und Prisma fragt dabei die Spalten `Mission.eventSeriesId` und
`eventEditionId` ab. Beides entsteht erst mit der Migration
`20260914120000_event_series` — ausgeliefert im selben Deploy. Läuft die
Migration beim Start nicht durch, wirft die Abfrage, und `getMissions` machte
daraus **stumm** eine leere Liste. Derselbe Mechanismus hat am selben Tag die
Depeschen-Maske lahmgelegt (ADR 0033, Nachtrag): Auch `DispatchImage` fehlte —
die Migrationskette steht also in Produktion vor oder bei `event_series`.

Die Ursache, warum die Kette steht, lässt sich aus dem Code allein nicht
belegen. Auskunft gibt `GET /api/health/db` (`migrations`, `migrationDetail`)
und das Container-Protokoll (`[startup-migrate]`).

## Entscheidung

1. **Rückfall statt Totalausfall.** Liste und Einsatzakte
   (`lib/queries/missions.ts`) laden zuerst mit Veranstaltung. Scheitert das an
   einem fehlenden Schema (`isMissingSchemaError`, `lib/db-schema.ts`: Prisma
   P2021/P2022 oder SQL-Server-Meldung 207/208), laden sie erneut mit
   `omit: { eventSeriesId, eventEditionId }` und ohne Veranstaltung. Andere
   Fehler laufen unverändert durch.
2. **Nie mehr stumm.** Jeder abgefangene Fehler auf diesen Lesewegen landet mit
   Ursache im Protokoll.

## Konsequenzen

- Die Einsätze sind auch ohne angewandte Migration öffentlich sichtbar; die
  Veranstaltungs-Klammer (Filter, „Diese Veranstaltung") fehlt bis dahin.
- Ein Rückfall-Ergebnis liegt bis zur nächsten Invalidierung (spätestens 24 h)
  im Cache. Nach dem Anwenden der Migration hilft eine beliebige Änderung an
  einem Einsatz im Adminbereich.
- Der Rückfall deckt nur die öffentliche Einsatzliste und -akte ab. Andere
  Abfragen, die alle Spalten von `Mission` lesen (Adminliste, Planung, Feed),
  bleiben betroffen, bis die Migration angewandt ist. Das ist gewollt: Der
  Rückfall ist ein Sicherheitsnetz für Leser, kein Ersatz für eine laufende
  Migrationskette.
- Für künftige Schemaänderungen gilt weiter CLAUDE.md: erst Spalte deployen,
  dann den Code, der sie liest.
