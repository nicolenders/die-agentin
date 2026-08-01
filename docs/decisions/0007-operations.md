# 0007 — Betrieb: CSP, Infrastruktur, Rechtstexte

**Datum:** 01.08.2026
**Status:** angenommen; Deployment/Validierung **offen**

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

## Infrastruktur (Bicep)

Alle Ressourcen als Bicep unter `infra/`. **Nicht deployt** — kein Azure-Zugang
in der Umsetzungsumgebung, keine `bicep build`-Validierung möglich. Vor dem
ersten Rollout ist `az deployment group what-if` Pflicht. API-Versionen sind
nach bestem Wissen gewählt und zu verifizieren.

## Rechtstexte

Struktur und Felder (`LegalDoc`, Admin unter `/admin/einstellungen`, öffentliche
Seiten `/impressum`, `/datenschutz`, `/barrierefreiheit`) sind umgesetzt. **Kein
Rechtstext im Code** — der Inhalt wird von Nicole beigestellt bzw. anwaltlich
geprüft (SPEC §12).

## Rollback

Container App im Revisions-Modus „Multiple" mit Traffic-Splitting: Rollback ist
ein Traffic-Switch auf die vorige Revision (`promote.yml`), kein Redeploy.
