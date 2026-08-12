# docs/DATENVERARBEITUNG.md — Inventur der Datenverarbeitung

Grundlage für die Datenschutzerklärung (Phase 11.3). Basiert auf dem
**tatsächlichen Code**, nicht auf Annahmen. Wird in Phase 11.1 vervollständigt.

## Eingebettete Drittinhalte

### YouTube (Einsatzaufzeichnungen, Phase 9)
- Einsatzakten können ein Aufzeichnungs-Video einbinden (`Mission.recordingUrl`).
- **Zwei-Klick-Lösung** (`components/content/VideoConsent.tsx`): Es wird **kein**
  Kontakt zu YouTube hergestellt, bevor die Nutzerin/der Nutzer aktiv „Video laden"
  klickt. Erst danach lädt ein Embed von **`youtube-nocookie.com`**.
- Folge für die Datenschutzerklärung: YouTube (Google Ireland Ltd.) als
  eingebetteter Dienst nennen, mit dem Hinweis, dass die Verbindung erst nach
  ausdrücklicher Einwilligung erfolgt (Art. 6 Abs. 1 lit. a DSGVO). Kein
  seitenweites Cookie-Banner nötig — die Einwilligung ist punktuell pro Video.

### Karte (d3-geo)
- Die Weltkarte wird aus **gebündeltem** `world-atlas`-TopoJSON serverseitig als
  SVG gerendert (`lib/map/geo.ts`, Abhängigkeiten `d3-geo`, `topojson-client`,
  `world-atlas`). **Kein externer Tile-Provider**, keine Laufzeit-Requests an
  Dritte. → In Phase 11.1 explizit bestätigen.

## Hosting & Server-Logs
- **Azure Container Apps** (Region **West Europe**, siehe `infra/` und
  Deploy-Workflow). Auftragsverarbeitung durch Microsoft (Azure).
- **Azure SQL Database** (Free Offer, serverless) — Auftragsverarbeitung.
- **Server-Logs / Log Analytics:** 30 Tage Aufbewahrung, Cap 1 GB/Monat
  (SPEC §14). Zweck: Betrieb, Fehlersuche, Sicherheit. Rechtsgrundlage
  Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse an sicherem Betrieb).

## Authentifizierung (nur Admin)
- **Auth.js v5 + Microsoft Entra ID** — ausschließlich für den Admin-Login
  (genau eine Person). Für Leser gibt es **keinen** Login, keine Registrierung.
- Session als **httpOnly-Cookie** (`SameSite=Lax`, `Secure`) — technisch
  notwendig, nur im Admin-Bereich gesetzt.

## Schriften
- **Lokal self-hosted** über `next/font/local` (`lib/fonts.ts`,
  `app/fonts/*.woff2`). **Keine** Requests an Google Fonts o. ä.

## Analytics
- **Keine.** Kein Tracking, keine Pixel, keine Analyse-Cookies (SPEC „Nicht-Ziele").

## RSS-Feed
- `/feed.xml`, `/feed.en.xml` — statisch generiert, keine Personendaten.

## Kontaktaufnahme
- **LinkedIn** (bevorzugt) — Verweis auf LinkedIns eigene Datenschutzhinweise.
- **E-Mail** (`contactEmail`, Phase 7) — `mailto:`-Link, kein serverseitiges
  Kontaktformular; die Verarbeitung erfolgt über das E-Mail-Postfach.

## Cookies
- **Nur ein technisch notwendiges Cookie**: die Admin-Session (Auth.js). Für
  Leser wird **kein** Cookie gesetzt. → **Kein Consent-Banner nötig.** Punktuelle
  Einwilligung nur beim YouTube-Video (Zwei-Klick, siehe oben).

## Fazit für die Datenschutzerklärung
Es werden **keine einwilligungspflichtigen Dienste** für Leser eingesetzt (keine
Analytics, keine externen Fonts, keine Reader-Cookies, Karte ohne Tile-Provider,
YouTube nur nach Zwei-Klick). Ein seitenweites Cookie-Banner ist **nicht**
erforderlich und wird bewusst **nicht** gesetzt.
