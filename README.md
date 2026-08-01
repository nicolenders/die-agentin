# nicolenders.com

Persönliche Website und Publikationsplattform von Nicole Enders — „Die Agentin".
Microsoft AI & Modern Work.

> Status: Spezifikationsphase. Es existiert noch kein Anwendungscode.

## Was hier drin liegt

| Pfad | Inhalt |
|---|---|
| `docs/SPEC.md` | Vollständige Spezifikation: Architektur, Datenmodell, Workflows, Infrastruktur, Meilensteine |
| `docs/mockups/` | Klickbare HTML-Mockups für Leser- und Adminansicht |
| `docs/decisions/` | Architekturentscheidungen (ADRs) |
| `CLAUDE.md` | Arbeitsregeln und Konventionen für Claude Code |

## Mockups ansehen

Beide Dateien sind eigenständig — im Browser öffnen, keine Installation nötig.

- `docs/mockups/mockup-leseransicht.html` — öffentliche Website
- `docs/mockups/mockup-adminansicht.html` — Redaktionsoberfläche

Alle darin gezeigten Daten sind Beispieldaten.

## Nächster Schritt

In Claude Code:

```
Lies docs/SPEC.md und CLAUDE.md. Setze anschließend Meilenstein M0 um.
```

Danach Meilenstein für Meilenstein weiterarbeiten — nicht mehrere gleichzeitig.

## Geplanter Stack

Next.js 16 (App Router) · TypeScript · SCSS + CSS Modules · Prisma + Azure SQL ·
Auth.js v5 mit Microsoft Entra ID · TipTap 3 · d3-geo · Azure Container Apps ·
Bicep · Azure DevOps Pipelines

Begründungen stehen in `docs/SPEC.md`, Abschnitt 1.
