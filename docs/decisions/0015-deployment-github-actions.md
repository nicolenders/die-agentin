# 0015 — Deployment über GitHub Actions, Azure-DevOps-Pipeline entfernt

**Datum:** 18.08.2026
**Status:** angenommen
**Ersetzt:** den Pipeline-Teil von [0007](./0007-operations.md)

## Kontext

SPEC §15, `README.md` und `CLAUDE.md` beschrieben Azure DevOps als
Deployment-Weg. Im Repository lagen dafür `azure-pipelines.yml` (Stages
`validate` und `deploy`) und `pipelines/rollback.yml`.

Gelaufen ist davon nie etwas. `infra/README.md` hält das selbst fest: „Nichts
davon wurde in dieser Umsetzung real ausgeführt." Deployt wird tatsächlich über
`.github/workflows/nicolenders-prod-web-AutoDeployTrigger-*.yml` — bei jedem
Push auf `main`, mit `azure/container-apps-deploy-action` und anschließendem
`az containerapp update`.

Aufgefallen ist die Lücke bei Audit-Aufgabe 1.1: Der kanonische Host wurde in
der Bicep-Vorlage gesucht, gesetzt wird er aber im Workflow. Zwei beschriebene
Wege, von denen einer nicht existiert, kosten genau dort Zeit, wo es darauf
ankommt.

Zwei Folgen hatte die Doppelung außerdem:

- **Es gab kein CI-Gate.** Die `validate`-Stage stand nur in der nie gestarteten
  Pipeline. SPEC §17 versprach „PR blockiert" — geprüft wurde nichts.
- **Rollback war nur auf dem Papier.** `pipelines/rollback.yml` hätte in Azure
  DevOps als zweite Pipeline angelegt werden müssen.

## Entscheidung

Ein Weg, und zwar der, der läuft.

1. `azure-pipelines.yml` und `pipelines/rollback.yml` entfernt.
2. `.github/workflows/validate.yml` neu: lint, typecheck, Unit-Tests, Build,
   Playwright-Rauchtest und axe-Lauf bei jedem Pull Request. Das ist das Gate,
   das SPEC §17 beschreibt — jetzt real.
3. `.github/workflows/rollback.yml` neu: Traffic-Switch auf eine ältere
   Revision, manuell mit Revisionsnamen gestartet.
4. SPEC §15 auf GitHub Actions umgeschrieben, mit den offenen Punkten
   (keine Staging-Stufe, Migration beim Containerstart) statt einer Beschreibung
   von etwas, das es nicht gibt.

Die Bicep-Vorlage unter `infra/` bleibt. Sie beschreibt die **Infrastruktur**
und ist der Weg für den Erstaufbau über Portal oder Kommandozeile. Das laufende
Deployment berührt sie nicht — diese Trennung ist jetzt in der Doku benannt.

## Konsequenz

- Der Deploy-Weg ist an einer Stelle beschrieben und an derselben Stelle
  ausgeführt. Für eine Person, die die Website nebenbei pflegt, ist das der
  entscheidende Punkt: keine zweite Wahrheit, die nur so aussieht.
- Pull Requests haben ab jetzt ein Gate, das wirklich läuft. Die Tests brauchen
  keine Datenbank, weil alle Query-Funktionen Fehler abfangen und leere
  Ergebnisse liefern.
- Ein Rollback ist ein Knopfdruck unter „Actions", kein Terminal.
- **Bewusst offen:** `npm audit --audit-level=high` schlägt fehl (Findings in
  `postcss` und `sharp` unterhalb von `next`). Der Schritt läuft sichtbar mit,
  blockiert den Merge aber nicht. Behoben wird das nur durch ein Next-Update
  über die festgelegte Version hinaus — eine Stack-Entscheidung, die eigens zu
  treffen ist.
- **Bewusst offen:** Es gibt weiterhin keine Staging-Stufe mit manueller
  Freigabe. Ein Push auf `main` geht live. Absicherung ist das Gate davor und
  der Rollback danach.
