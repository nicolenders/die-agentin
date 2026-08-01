# Fortschritt — Umsetzung M0–M8

Diese Datei wird nach jedem Meilenstein aktualisiert. Bei Beginn einer neuen
Sitzung zuerst hier weiterlesen.

## Arbeitsstand

| Meilenstein | Status |
|---|---|
| M0 — Fundament | ✅ erledigt |
| M1 — Daten und Auth | ✅ erledigt |
| M2 — Editor und Beiträge | ⏳ offen |
| M3 — Veröffentlichung und Zeitsteuerung | ⏳ offen |
| M4 — Dossiers und Zweisprachigkeit | ⏳ offen |
| M5 — Einsätze und Karte | ⏳ offen |
| M6 — Briefings, Publikationen, Ausbildung | ⏳ offen |
| M7 — Kanäle | ⏳ offen |
| M8 — Betrieb | ⏳ offen |

## Branch

Entwickelt wird auf `claude/milestones-m0-m8-y84x6k` (durch die Ausführungs-
umgebung vorgegebener Push-Zweig). Die Spezifikation nannte `feat/initial-build`;
der Zweigname weicht ab, der Inhalt und die Commit-Disziplin (ein Commit pro
Meilenstein) bleiben wie beauftragt.

Vor jedem Commit sind `npm run lint`, `npm run typecheck` und `npm run test` grün.

---

## M0 — Fundament ✅

**Umgesetzt**
- Next.js 16 (App Router, Turbopack) + React 19 + TypeScript `strict` mit
  `noUncheckedIndexedAccess`.
- SCSS + CSS Modules. Design-Tokens aus SPEC §10 in `styles/_tokens.scss` als
  CSS Custom Properties, globales Design-System in `styles/globals.scss`
  (aus dem Leser-Mockup übernommen).
- Zweisprachigkeit-Grundgerüst: `lib/i18n/` mit DE als Quellsprache, EN als
  typgeprüftes Wörterbuch. `proxy.ts` (Next-16-Nachfolger von `middleware.ts`)
  leitet `/` und pfad­lose Aufrufe auf `/de` bzw. `/en` um (Accept-Language nur
  beim ersten Besuch).
- Layout mit Kopfzeile (Marke, Navigation, Sprachumschalter, Mobilmenü),
  Fußzeile (Inhalts-/Über-/Rechts-Links) und Skip-Link.
- HQ-Startseite in DE und EN erreichbar, statisch gerendert (kein DB-Zugriff,
  SPEC §2.1).
- `Dockerfile` (mehrstufig, standalone output) und `docker-compose.yml`
  (App + SQL Server 2022 im Container).
- Prisma-Grundgerüst (`prisma/schema.prisma` mit Datasource/Generator),
  `lib/db.ts` Singleton mit Retry für den DB-Kaltstart.
- Sicherheits-Header in `next.config.ts` (HSTS, nosniff, Referrer-Policy,
  Permissions-Policy; `/admin/**` als `noindex`). CSP mit Nonce folgt in M8.
- `.env.example` mit allen Variablen aus SPEC §16 (nur Platzhalter).

**Getroffene Annahmen / Entscheidungen** (siehe `docs/decisions/0003-…`)
- Mehrere Root-Layouts über Route Groups `(site)` / `(admin)`, damit
  `<html lang>` je Sprache korrekt gesetzt wird und öffentliche Seiten statisch
  bleiben.
- Fonts: Familien (Poppins/Inter/JetBrains Mono) werden per CSS referenziert,
  mit System-Fallback. Die self-hosted `.woff2`-Dateien (SPEC §10) liegen noch
  nicht vor — **offener Punkt**, bis sie in `app/fonts/` ergänzt und via
  `next/font/local` registriert werden. Kein Google-CDN, kein Laufzeit-Request.
- Versionen zur Werkzeug-Stabilität gepinnt: Prisma 6.19, TypeScript 5.9.
  ESLint 9 mit nativer Flat-Config aus `eslint-config-next` 16.

**Offene Punkte**
- Self-hosted Font-Dateien ergänzen.
- HQ-Zähler/Vorschau später aus der DB speisen (aktuell Platzhalter aus dem
  Mockup, erfundene Beispieldaten).

**Fertig-Kriterium erfüllt:** `npm run dev` und `npm run build` laufen lokal,
die Startseite ist in DE (`/de`) und EN (`/en`) erreichbar; der Container-Build
ist über den mehrstufigen `Dockerfile` definiert.

---

## M1 — Daten und Auth ✅

**Umgesetzt**
- Vollständiges Prisma-Schema (SPEC §3.1 + `Publication`, `Certification`,
  `Taxonomy`, `Tag`/`PostTag`, `Redirect`, `AuditLog`). Erste Migration
  (`prisma/migrations/…_init`) offline via `prisma migrate diff` erzeugt.
- `lib/domain.ts`: App-seitige Enums als String-Unions (SQL-Server-Anpassung,
  siehe 0004) mit `isOneOf`-Validierung. Unit-getestet.
- Auth.js v5 (`auth.ts`) mit Microsoft-Entra-ID-Provider, JWT-Session,
  Autorisierung über Allow-List von Entra Object IDs (`lib/auth/allowlist.ts`,
  unit-getestet). `requireAdmin()`/`getSessionUser()` als serverseitige Guards.
- Admin-Shell: eigene Route Group `(admin)` mit Sidebar-Navigation aus dem
  Mockup, Topbar, Anmeldeseite. Geschützter Bereich `(protected)`: nicht
  angemeldet → Anmeldung, angemeldet ohne Allow-List-Eintrag → **403**
  (`forbidden()`), passend zur M1-Abnahme.
- Dashboard liest Kennzahlen aus der DB mit „DB wird geweckt"-Fallback.
- Seed (`prisma/seed.ts`) mit erfundenen Beispieldaten (Taxonomien, Tags, 4
  Talks + Deliveries für das Ranking, 8 Missionen, 4 Beiträge, 1 Dossier,
  Publikationen, Zertifizierungen, Kanäle).

**Vorab-Aufgabe §3.2** in `docs/decisions/0002-db-auth.md` dokumentiert:
ohne echten Azure-Zugang **Fallback** (SQL-Auth, Passwort nur im Key Vault via
Secret-Referenz); der Managed-Identity-Pfad ist klar als **zu verifizieren**
markiert.

**Annahmen / Entscheidungen**
- Enums als String gegen SQL Server (0004).
- Migration offline generiert; gegen eine echte DB mit `prisma migrate dev`
  bzw. `deploy` zu verifizieren (in dieser Umgebung lief keine DB).

**Offene Punkte**
- `npm run db:migrate` + `npm run db:seed` gegen laufende DB einmal ausführen
  (docker compose). Entra-App-Registrierung + `ADMIN_OBJECT_IDS` setzen.

**Fertig-Kriterium:** Login-Fluss steht (Entra ID), `/admin` liefert ohne
Allow-List-Eintrag 403, Seed-Daten sind definiert und einspielbar.
