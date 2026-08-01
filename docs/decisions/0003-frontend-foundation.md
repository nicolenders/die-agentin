# 0003 — Fundament-Entscheidungen (M0)

**Datum:** 01.08.2026
**Status:** angenommen

## Kontext

Beim Aufsetzen von Next.js 16 (App Router) für eine zweisprachige Seite mit
getrenntem Admin-Bereich waren einige kleine Entscheidungen nötig, die die
Spezifikation offenließ.

## Entscheidungen

### 1. Mehrere Root-Layouts über Route Groups
Öffentliche Seiten liegen unter `app/(site)/[locale]/`, der Admin unter
`app/(admin)/admin/`. Jede Route Group hat ihr eigenes Root-Layout mit `<html>`
und `<body>`. So kann `<html lang>` je Sprache korrekt gesetzt werden, ohne die
Anfrage-Header zur Laufzeit zu lesen — das hätte alle Seiten dynamisch gemacht
und die Caching-Strategie aus SPEC §2.1 gebrochen.

### 2. Locale-Routing über `proxy.ts`
Next.js 16 hat `middleware.ts` in `proxy.ts` umbenannt. Wir folgen der neuen
Konvention. Der Proxy leitet `/` und alle Pfade ohne Sprachpräfix auf `/de`
bzw. `/en` um; Accept-Language wird nur beim ersten Besuch ausgewertet.

### 3. Fonts vorerst mit System-Fallback
SPEC §10 verlangt self-hosted Fonts ohne Google-CDN. Die Font-Dateien lagen
nicht vor und der Font-CDN ist in der Build-Umgebung gesperrt. Statt eines
Laufzeit-Requests an Google (unzulässig) referenzieren wir die Familien per CSS
mit robustem System-Fallback. Sobald die lizenzierten `.woff2`-Dateien vorliegen,
werden sie in `app/fonts/` abgelegt und über `next/font/local` registriert; die
Familiennamen in `_tokens.scss` bleiben unverändert. **Offener Punkt.**

### 4. Werkzeug-Versionen gepinnt
Prisma auf 6.19 (stabiler `sqlserver`-Connector; Prisma 7 ändert Client-Generierung
und Config-Format grundlegend) und TypeScript auf 5.9 (TS 7 wird vom Lint-/Test-
Ökosystem noch nicht durchgängig unterstützt). ESLint 9 nutzt die native
Flat-Config aus `eslint-config-next` 16.

## Konsequenzen

- Wechsel zwischen öffentlichem Bereich und Admin ist ein voller Seiten-Load
  (getrennte Root-Layouts). Das ist hier gewünscht.
- Die Font-Ablösung ist ein klar markierter, kleiner Folgeschritt.
- Ein späteres Upgrade auf Prisma 7 / TypeScript 7 ist ein eigener, bewusster
  Schritt.
