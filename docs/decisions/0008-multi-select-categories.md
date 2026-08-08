# 0008 — Kategorien als Mehrfachauswahl

## Kontext

Bisher hatte jede kategorisierbare Entität (Dossier, Briefing/Talk, Zertifizierung)
genau **eine** Kategorie (`categoryId` → `Taxonomy`). Gewünscht ist, an allen
Stellen **mehrere** Kategorien wählen zu können.

## Entscheidung

- Zusätzlich zu `categoryId` gibt es jetzt eine **Many-to-many-Beziehung**
  `categories` (Prisma-implizite Join-Tabellen `_DossierCategories`,
  `_TalkCategories`, `_CertificationCategories`).
- `categoryId` bleibt als **primäre** Kategorie erhalten und wird beim Speichern
  weiter gepflegt (= erste Auswahl). Das hält die Migration **abwärtskompatibel**
  (CLAUDE.md): erst hinzufügen/backfillen, altes Feld bleibt bestehen; ein
  späterer Schritt kann `categoryId` entfernen.
- Reads, die eine Auflistung nach Kategorie brauchen (öffentliche Dossiers-,
  Briefings-, Ausbildungsseite), nutzen die m2m-Seite: ein Eintrag mit mehreren
  Kategorien erscheint unter **jeder** seiner Kategorien.
- Admin-Formulare verwenden Mehrfach-Auswahllisten (`<select multiple>` bzw.
  Client-State-Arrays). „In Verwendung"-Prüfungen und Zählungen laufen über die
  m2m-Beziehung.

## Migration (manuell, vor dem Deploy)

`prisma/migrations/20260808210000_multi_categories/migration.sql` legt die drei
Join-Tabellen an und **backfillt** die bestehende Einzel-Kategorie hinein. Die
Migration ist rein additiv (nichts wird gelöscht), daher gefahrlos vor dem
Deploy des neuen Codes im Azure-Query-Editor ausführbar.

## Konsequenz

- Talks behalten die Pflicht „mindestens eine Kategorie" (die Spalte
  `Talk.categoryId` ist NOT NULL).
- Kategorien lassen sich weiterhin nicht löschen, solange sie (per m2m) zugeordnet
  sind.
- Offen für später: `categoryId`-Spalten entfernen, sobald sichergestellt ist,
  dass kein Code mehr darauf zugreift.
