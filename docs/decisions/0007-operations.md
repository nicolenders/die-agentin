# 0007 — Betrieb: CSP, Infrastruktur, Rechtstexte

**Datum:** 01.08.2026
**Status:** angenommen; Deployment/Validierung **offen**
**Nachtrag:** Der Pipeline-Teil dieser Entscheidung ist durch
[0015](./0015-deployment-github-actions.md) ersetzt — deployt wird über
GitHub Actions, die Azure-DevOps-Pipeline ist entfernt. Die Aussagen zu
Bicep, CSP und Rechtstexten gelten weiter.

## Content Security Policy

SPEC §13 fordert eine CSP mit Nonce ohne `unsafe-inline`. Die ideale nonce-
basierte `script-src` erzwingt in Next.js **dynamisches Rendering aller Seiten**
(statisch vorgerenderte Seiten können den per Request erzeugten Nonce nicht in
ihre Skript-Tags aufnehmen). Das kollidiert mit der statischen HQ-Seite und der
SSG-Lokalisierung.

**Entscheidung:** Vorerst eine strikte Quell-Policy in `next.config.ts`
(`default-src 'self'`, externe Quellen nur youtube-nocookie und Blob-Domain,
`object-src 'none'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`).
`script-src`/`style-src` erlauben `'unsafe-inline'` als bewusster Kompromiss.
**Folgeschritt:** Umstellung auf nonce-basierte `script-src` zusammen mit
durchgängig dynamischem Rendering (oder `'use cache'` je Route).

## Infrastruktur (Bicep) & Pipeline — auf einfachen Erstlauf ausgelegt

Alle Ressourcen als Bicep unter `infra/`, `infra/main.bicep` **kompiliert sauber**
(`bicep build`, keine Diagnostics). Vor dem ersten Rollout bleibt
`az deployment group what-if` empfohlen (README Schritt 6); real deployt wurde
nicht.

Bewusste Vereinfachungen, damit die Pipeline **direkt durchläuft** (Review durch
Azure-/DevOps-Brille):
- **SQL-Authentifizierung** statt Managed Identity gegen SQL (ADR 0002, Fallback)
  — passt zur App und ist für Einsteiger einfach. Passwort nur in der
  DevOps-Variablengruppe / als Container-App-Secret.
- **Container Registry per CLI vorab**, im Template als `existing` referenziert
  — löst die Henne-Ei-Situation „Image bauen vor Registry" und vermeidet das
  Zurücksetzen des Images bei erneutem Bicep-Deploy.
- **Remote-Build via `az acr build`** — kein Docker-Daemon/Registry-Login auf dem
  Agent nötig.
- **Deterministischer Image-Tag** (`Build.BuildId`) statt Cross-Stage-Variablen.
- **Traffic auf `latestRevision` = 100 %** im Multiple-Revisions-Modus: neue
  Deployments gehen automatisch live, Rollback bleibt ein Traffic-Switch
  (`pipelines/rollback.yml`).
- **Migration** mit temporär freigegebener Agent-IP an der SQL-Firewall.
- **Custom Domain & Budget** außerhalb des kritischen Pfads (Domain nur per
  Anleitung, Budget nur bei gesetzter E-Mail), damit der Erstlauf ohne DNS und
  ohne Sonderfälle durchläuft.
- Scheduler als **einmaliger** Cron-Tick (`scripts/job-once.mjs`, im Runtime-Image
  enthalten) statt eines Dauerläufers.

## Rechtstexte

Struktur und Felder (`LegalDoc`, Admin unter `/admin/einstellungen`, öffentliche
Seiten `/impressum`, `/datenschutz`, `/barrierefreiheit`) sind umgesetzt. **Kein
Rechtstext im Code** — der Inhalt wird von Nicole beigestellt bzw. anwaltlich
geprüft (SPEC §12).

## Rollback

Container App im Revisions-Modus „Multiple" mit Traffic-Splitting: Rollback ist
ein Traffic-Switch auf die vorige Revision (`pipelines/rollback.yml` bzw.
`az containerapp ingress traffic set`), kein Redeploy.
