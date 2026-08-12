# docs/IMPORT.md — Sessionize-/MVP-Backfill (Phase 8)

Wie Einsätze (Missionen) und Briefings aus externen Quellen in die Datenbank
kommen. Ziel: die Weltkarte und die Kennzahlen mit **echten** Daten füllen — heute
zeigt der Seed nur erfundene Beispiele.

## Stand / STOP

Im Repository gibt es **noch keine Quelldaten** und keinen Alt-Generator
(`build.py`, `die-agentin/import` existierten nicht — nur in der Aufgabe erwähnt).
Neu angelegt wurden:

- **Import-Schema** (Version 1, `die-agentin/import`) — siehe unten.
- **Importer** `scripts/import.ts` (Aufruf `npm run db:import`), idempotent, mit
  Dry-Run und Datenqualitäts-Regeln.
- **Reine Helfer** `lib/import/online.ts` (Antarktis-Ring) mit Tests.

**Braucht Input von Nicole (Anhang B):**
- MVP-Portal-Export (2019–2026),
- Sessionize-Export mit **bestätigten** Veranstaltungsdaten,
- neuer LinkedIn-Datenexport (der letzte war leer).

Ohne bestätigte Daten wird nichts stillschweigend publiziert (siehe Regeln).

## Ablauf

1. Quelldateien nach `data/import/` legen: `missions.json` und/oder
   `briefings.json` (oder eine gemeinsame `index.json`).
2. Trockenlauf: `npm run db:import -- --dry-run` — zeigt, was angelegt/geändert
   würde, plus Review-Liste und Übersprungene, **ohne** zu schreiben.
3. Echt: `npm run db:import`.
4. Wiederholbar: Upsert über den Import-`slug` — ein zweiter Lauf dupliziert nicht.

## Schema (Version 1)

```jsonc
{
  "$schema": "die-agentin/import",
  "version": 1,
  "missions": [
    {
      "slug": "experts-live-austria-2026",   // stabiler Import-Schlüssel (Pflicht)
      "eventName": "Experts Live Austria",
      "city": "Linz",
      "countryCode": "AT",
      "lat": 48.31, "lon": 14.29,             // entfällt bei Online-Events
      "startDate": "2026-06-02",              // ISO; fehlt → DRAFT + Review
      "endDate": "2026-06-02",                // optional
      "eventUrl": "https://…",                // optional
      "online": false,                         // true → AQ/Online + Antarktis-Ring
      "dateSource": "event",                   // "event" | "submission"
      "identities": ["agentic-ai"],            // Identitäts-Slugs (nur wenn sicher)
      "topics": ["foundry"],                   // Taxonomy-Slugs (nur wenn sicher)
      "de": { "slug": "experts-live-austria-linz", "eventText": "…", "talkText": "…" },
      "en": { "slug": "…-en", "eventText": "…", "talkText": "…" }
    }
  ],
  "briefings": [
    {
      "slug": "agents-in-produktion",
      "de": { "title": "Agents in Produktion", "abstract": "…" },
      "en": { "title": "Agents in production", "abstract": "…" },
      "categorySlug": "copilot-agents",
      "level": "300",
      "durationMin": 45,
      "deliveries": [
        { "missionSlug": "experts-live-austria-2026", "language": "de", "heldOn": "2026-06-02" }
      ]
    }
  ]
}
```

## Datenqualität (Phase 8.3) — die Regeln, hart

- **MVP-Einreichungszeitstempel ≠ Eventdatum.** Die `activities` aus dem
  MVP-Portal-Export (2022–2026) tragen das Einreichungsdatum, **nicht** das echte
  Veranstaltungsdatum. Solche Einträge müssen `dateSource: "submission"` tragen.
  Der Importer übernimmt sie **nie** stillschweigend als Eventdatum: sie landen
  als **DRAFT** und in der **Review-Liste**. Die Legacy-Einträge (2019–2022)
  haben echte Daten (`dateSource: "event"`).
- **Kein Datum → DRAFT**, nie publiziert; erscheint in der Review-Liste, die
  Nicole abarbeitet.
- **Online-Events:** `online: true` (oder `countryCode: "AQ"` / `city: "Online"`)
  → deterministischer Antarktis-Ring (`lib/import/online.ts`): `lat` −72…−78,
  Längengrad über den Ring verteilt. So trennen sie sich sichtbar von echten Orten.
- **Identitäten/Fachgebiete** werden nur übernommen, wenn in der Quelle angegeben.
  Der Importer **rät nicht**.
- Reihenfolge/Report: Der Lauf gibt Anzahl je Entität, Übersprungene mit Grund und
  die Review-Liste aus.

## Was noch fehlt (Folgepunkte)

- Der Briefings-Zweig des Importers ist strukturell angelegt, aber schlank
  gehalten, bis echte Quelldaten vorliegen (Deliveries-Upsert gegen
  `talkId+missionSlug+heldOn`).
- Ausführung gegen eine echte DB steht aus (in dieser Umgebung lief keine DB).
