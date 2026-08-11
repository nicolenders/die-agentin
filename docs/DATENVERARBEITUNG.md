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

## Offen (Phase 11.1)
- Hosting/Region, Server-Logs, Auth.js + Entra ID, Schriften (self-hosted),
  Analytics (keine), RSS, Kontakt per E-Mail, Cookies (nur Admin-Login).
