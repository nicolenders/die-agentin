# CLAUDE.md — Arbeitsregeln für dieses Repository

Dieses Projekt ist die persönliche Website von Nicole Enders („Die Agentin"), nicolenders.com.
Die vollständige Spezifikation steht in `docs/SPEC.md`. **Lies sie, bevor du etwas änderst.**
Die visuelle Referenz liegt als klickbares Mockup in `docs/mockups/`.

## Kontext in einem Satz

Eine einzelne Person pflegt diese Website nebenbei. Jede Entscheidung wird daran gemessen,
ob sie den Wartungsaufwand für einen Menschen senkt oder erhöht.

Der aktuelle Arbeitsplan steht in CLAUDE_TASKS.md.

## Befehle

```bash
npm run dev            # Entwicklung, Turbopack
npm run build          # Produktionsbuild
npm run lint           # ESLint
npm run typecheck      # tsc --noEmit
npm run test           # Vitest
npm run test:e2e       # Playwright
npm run test:a11y      # axe-core über die Hauptrouten
npm run db:migrate     # prisma migrate dev
npm run db:studio      # Prisma Studio
docker compose up      # App + SQL Server lokal
```

Vor jedem Commit laufen `lint`, `typecheck` und `test`. Ein Commit mit rotem Gate wird nicht erstellt.

## Stack — nicht ohne Rückfrage ändern

Next.js 16 App Router · React 19 · TypeScript strict · SCSS + CSS Modules · Prisma + Azure SQL ·
Auth.js v5 mit Microsoft Entra ID · TipTap 3 · d3-geo für die Karte · Azure Container Apps.

Keine zusätzlichen UI-Bibliotheken, keine Utility-CSS-Frameworks, keine State-Management-Bibliothek.
Wenn du meinst, eine neue Abhängigkeit zu brauchen: erst begründen, dann fragen.

## Struktur

```
app/[locale]/...        öffentliche Seiten
app/admin/...           Redaktion, immer noindex
app/api/...             Route Handler (Jobs, OAuth-Callbacks, Uploads)
components/             wiederverwendbare Komponenten
components/content/     Renderer für TipTap-Nodes
lib/                    Geschäftslogik, hier liegt die Testabdeckung
lib/db.ts               Prisma-Singleton
styles/_tokens.scss     Design-Tokens, einzige Quelle für Farben und Typo
prisma/                 Schema und Migrationen
infra/                  Bicep
pipelines/              Azure DevOps
docs/                   SPEC.md, Mockups, Architekturentscheidungen
```

## Konventionen

- **Sprache im Code:** Bezeichner, Kommentare und Commit-Messages auf Englisch.
  Alles, was Nicole oder Leser sehen, auf Deutsch bzw. Englisch über i18n-Keys — niemals hartcodiert.
- **Server zuerst:** Server Components als Standard. `"use client"` nur, wo Interaktivität es erzwingt,
  und dann so weit unten im Baum wie möglich.
- **Schreiben ausschließlich über Server Actions** mit serverseitiger Rollenprüfung als erster Zeile.
  Sichtbarkeit im UI ist keine Autorisierung.
- **Keine Rohabfragen** ohne Not; Prisma-Parameterbindung überall.
- **Kein `dangerouslySetInnerHTML`** auf gespeicherten Inhalten. Der Renderer bildet Node-Typen
  auf Komponenten ab; unbekannte Node-Typen werden verworfen, nicht durchgereicht.
- **Zeit:** In der Datenbank immer UTC. Umrechnung nach `Europe/Berlin` nur in der Darstellung.
- **Fehler:** sagen, was passiert ist und was zu tun ist. Keine Entschuldigungen, keine vagen Meldungen.
  „Beitrag konnte nicht auf LinkedIn veröffentlicht werden: Zugriff abgelaufen. Verbindung erneuern."
- **Leere Zustände** sind eine Einladung zum Handeln, kein trauriger Satz.
- **Karten in einem Raster sind gleich hoch, Aktions-Buttons sitzen auf gemeinsamer Grundlinie.**
  Unterschiedlich lange Titel/Texte dürfen den „Zum Kurs"/„Mehr"-Button nicht verschieben — Textkörper
  füllt die Kartenhöhe, der Button wird per `margin-top: auto` nach unten geschoben.
- **Migrationen abwärtskompatibel:** erst Spalte hinzufügen, dann Code deployen, dann Altes entfernen.

## Definition of Done

Eine Aufgabe ist fertig, wenn alles davon zutrifft:

- [ ] Typecheck, Lint und Tests grün
- [ ] Neue Logik in `lib/` hat Unit-Tests
- [ ] Mit Tastatur vollständig bedienbar, Fokus sichtbar
- [ ] Bilder haben Alt-Texte, Formulare haben Labels
- [ ] Funktioniert in DE und EN, auch wenn die Übersetzung fehlt
- [ ] Responsive geprüft bei 380 px, 768 px und 1440 px
- [ ] Keine neuen Requests an Drittanbieter-Domains ohne Consent-Prüfung
- [ ] Keine Secrets im Code, in Logs oder in Fehlermeldungen

## Was du nicht tust

- Keine Analytics, keine Tracking-Pixel, keine externen Schriftarten-CDNs.
- Keine Rechtstexte formulieren. Struktur und Felder ja, Inhalt nein.
- Keine Migration von WordPress-Inhalten, solange das nicht ausdrücklich beauftragt ist.
- Keine automatische Veröffentlichung eines KI-Übersetzungsentwurfs.
- Keine Kartendienste mit Tile-Servern einbauen.

## Bei Unsicherheit

Wenn eine Anforderung mehrdeutig ist: erst fragen, nicht raten. Wenn eine Annahme nötig war:
in `docs/decisions/` als kurzen Eintrag festhalten (Kontext, Entscheidung, Konsequenz).
