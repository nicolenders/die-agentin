# 0004 — Enums gegen SQL Server als String

**Datum:** 01.08.2026
**Status:** angenommen

## Kontext

SPEC §3.1 modelliert mehrere Prisma-Enums (`PostType`, `ContentStatus`,
`TransState`, `MissionStatus`, `Platform`, `TaskState`, `TaxonomyKind`, …).
Der Prisma-`sqlserver`-Connector unterstützt jedoch **keine nativen Enums** —
`prisma validate` schlägt fehl.

## Entscheidung

Alle Enum-Felder werden als `String` gespeichert. Die zulässigen Werte und
ihre TypeScript-Typen liegen zentral in `lib/domain.ts` (`POST_TYPES`,
`CONTENT_STATUSES`, …) und werden

- beim Schreiben in Server Actions und im Seed validiert (`isOneOf`),
- über TypeScript-Union-Typen im gesamten Code typsicher verwendet.

Wo sinnvoll, sichern zusätzlich Anwendungslogik und (später) Prüf-Constraints
die Integrität.

## Begründung

- Kein Umweg über eine Lookup-Tabelle für reine Status-Aufzählungen.
- Ein Wechsel des Wertebereichs ist eine Code-Änderung in `lib/domain.ts` plus
  ggf. eine Daten-Migration — nachvollziehbar und klein.

## Konsequenz

- Die Datenbank erzwingt die Wertebereiche nicht selbst; die Anwendung ist die
  Autorität. Deshalb ist die Validierung in Server Actions Pflicht.
- Prisma-Abfragen filtern über Strings (`where: { status: "PUBLISHED" }`).
