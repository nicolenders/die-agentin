# nicolenders.com

Persönliche Website und Publikationsplattform von Nicole Enders — „Die Agentin".
Microsoft AI & Modern Work.

> Status: In Umsetzung (Meilensteine M0–M8, siehe `docs/PROGRESS.md`).

## Was hier drin liegt

| Pfad | Inhalt |
|---|---|
| `app/` | Next.js 16 App Router — `(site)` öffentlich, `(admin)` Redaktion |
| `components/` | Wiederverwendbare Komponenten |
| `lib/` | Geschäftslogik, i18n, DB-Zugriff (Testabdeckung) |
| `styles/` | Design-Tokens und globales Design-System (SCSS) |
| `prisma/` | Schema, Migrationen, Seed |
| `docs/SPEC.md` | Vollständige Spezifikation |
| `docs/mockups/` | Klickbare HTML-Mockups (verbindliche visuelle Referenz) |
| `docs/decisions/` | Architekturentscheidungen (ADRs) |
| `docs/PROGRESS.md` | Fortschritt je Meilenstein |

## Lokal starten

Voraussetzungen: Node.js ≥ 22, npm. Für die Datenbank optional Docker.

```bash
# 1. Abhängigkeiten
npm install

# 2. Umgebungsvariablen
cp .env.example .env        # Platzhalter genügen für die öffentliche Ansicht

# 3. Entwicklungsserver
npm run dev                 # http://localhost:3000  → leitet auf /de um
```

Die öffentliche Startseite ist ohne Datenbank erreichbar (statisch gerendert).
Für Admin, Editor und Seed wird eine Datenbank benötigt:

```bash
# SQL Server + App im Container
docker compose up --build

# Migrationen und Seed gegen die laufende DB
npm run db:migrate
npm run db:seed
```

## Qualität

```bash
npm run lint         # ESLint (flat config)
npm run typecheck    # tsc --noEmit
npm run test         # Vitest (Unit, lib/)
npm run test:coverage
npm run test:e2e     # Playwright
npm run test:a11y    # axe-core über die Hauptrouten
```

Vor jedem Commit laufen `lint`, `typecheck` und `test`.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript strict · SCSS + CSS Modules ·
Prisma + Azure SQL · Auth.js v5 (Microsoft Entra ID) · TipTap 3 · d3-geo ·
Azure Container Apps · Bicep · Azure DevOps Pipelines.

Begründungen: `docs/SPEC.md` §1 und `docs/decisions/`.
