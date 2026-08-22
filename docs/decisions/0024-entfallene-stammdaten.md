# 0024 — Schlagworte, Weiterleitungen und Zertifizierungs-Kategorien entfallen

**Datum:** 22.08.2026
**Status:** angenommen

## Kontext

Unter „Stammdaten" standen vier Listen: Fachgebiete, Zertifizierungs-
Kategorien, Schlagworte und Weiterleitungen. Drei davon wurden gepflegt, ohne
dass irgendetwas davon abhing:

- **Schlagworte** hingen an den Alt-Beiträgen (`Post`) und an Depeschen, wurden
  öffentlich aber nirgends gezeigt und filterten nichts. Öffentlich sortiert
  wird nach Format, Fachgebiet und Radar-Thema.
- **Zertifizierungs-Kategorien** wurden an Einträgen gespeichert und in der
  Admin-Liste als Teil der Metazeile ausgegeben; die öffentliche Darstellung
  gliedert sich nach Art (Zertifizierung, MVP, Training, Auszeichnung) und
  Familie (Microsoft, methodisch).
- **Weiterleitungen** waren zuletzt an den Depeschen-Detailseiten angeschlossen,
  setzten aber voraus, dass jemand nach einer Slug-Änderung von Hand einen
  Eintrag anlegt — was in der Praxis nicht passiert ist. Für die eine
  URL-Umstellung, um die es je ging, gibt es die statischen Regeln in
  `next.config.ts` und `lib/seo/legacy-redirects.ts`.

Ebenso entfallen die freien **Merkmale** der Identitäten: ein Ausweichfach für
das, was nicht ins Schema passte. Genutzt wurde es nicht.

## Entscheidung

Alle vier verschwinden — Tabellen, Masken und Lesestellen. Übrig bleiben die
Fachgebiete, und die ziehen aus den Stammdaten in die Einstellungen um
(Register „Fachgebiete"). `/admin/struktur` bleibt als Weiterleitung stehen.

## Begründung

Jede dieser Listen kostete Pflegezeit und Aufmerksamkeit in der Navigation,
ohne dass ein Leser der Website je etwas davon gesehen hätte. Sie halb stehen
zu lassen — sichtbar, aber wirkungslos — ist die schlechtere Variante: Man
pflegt sie weiter in der Annahme, es tue etwas.

## Konsequenzen

- Die Migration `20260822120000_admin_umbau` löscht `Tag`, `PostTag`,
  `_DispatchTags`, `Redirect`, `IdentityAttribute`, `_CertificationCategories`
  und `Certification.categoryId` und räumt die Taxonomie-Einträge der Art
  `CERTIFICATION` ab. Das ist **nicht** rückholbar — vor dem Deployment gehört
  ein Azure-SQL-Snapshot dazu.
- Ein nach der Umstellung geänderter Slug führt auf einen 404. Wird das
  relevant, ist der Ort dafür `lib/seo/legacy-redirects.ts`: eine Regel im
  Code, die niemand nachpflegen muss.
- Der Platzhalter `{{depesche.schlagworte}}` gibt es in der Prompt-Werkstatt
  nicht mehr; Vorlagen, die ihn nutzten, bleiben gültig und lassen ihn
  schlicht weg.
