# 0010 — First-Party-Reichweitenmessung (Besucher & Seitenaufrufe)

**Datum:** 14.08.2026
**Status:** angenommen

---

## Kontext

Nicole möchte im Adminbereich sehen, wie oft die öffentliche Website und ihre
Unterseiten aufgerufen werden, auswertbar nach Zeitraum und Herkunftsland der
Besucher. CLAUDE.md verbietet ausdrücklich klassische Analytics, Tracking-Pixel
und Requests an Drittanbieter-Domains ohne Consent. Diese Anforderung überschreibt
die Standardregel bewusst (Wunsch der Eigentümerin), muss aber die dahinter­
liegenden Prinzipien — Datensparsamkeit, keine Dritten, kein Consent-Zwang —
erfüllen.

## Entscheidung

Eine **eigene, first-party und cookielose** Erfassung:

- **Kein Drittanbieter.** Die Zählung läuft ausschließlich über eine eigene
  Route (`/api/track`) und die eigene Datenbank (Modell `Pageview`). Es verlässt
  kein Datum die Infrastruktur; die CSP bleibt unverändert (`connect-src 'self'`).
- **Keine Cookies, kein `localStorage`.** Ein kleiner Client-Baustein
  (`PageviewTracker`) meldet bei jedem Seitenwechsel per `navigator.sendBeacon`
  den Pfad. „Do Not Track"/GPC werden respektiert (client- wie serverseitig).
- **Keine gespeicherte IP.** Die IP wird nur transient genutzt: (1) zur groben
  Länder-Zuordnung über eine **lokal eingebettete** GeoIP-Datenbank
  (`geoip-lite`, keine Laufzeit-Requests) und (2) zusammen mit einem geheimen
  Salt und dem UTC-Tag zu einem **nicht umkehrbaren** SHA-256-Besucher-Hash. Der
  Hash ist tagesbezogen; eine Wiedererkennung über Tage hinaus ist ausgeschlossen.
- **Gespeichert wird je Aufruf:** Tag, Pfad (ohne Sprach-Präfix, ohne Query),
  Sprache, Rubrik, Ländercode, Besucher-Hash. Bots und leere User-Agents werden
  verworfen.
- **Auswertung** unter `/admin/statistik`: Seitenaufrufe, ungefähre Besucher,
  Verlauf pro Tag, Aufschlüsselung nach Rubrik, Land und meistbesuchten
  Unterseiten — filterbar nach Zeitraum und Land.

## Konsequenzen

- Neue Abhängigkeit `geoip-lite` (inkl. lokaler Datendateien, ~150 MB in
  `node_modules`). Diese Dateien werden für die `/api/track`-Route über
  `outputFileTracingIncludes` in den Standalone-Build übernommen; fehlen sie,
  fällt die Länder-Zuordnung sauber auf „XX" (Unbekannt) zurück, ohne Fehler.
  Die GeoIP-Daten sind periodisch zu aktualisieren (Paket-Update); für eine
  grobe Länderstatistik ist die Aktualität unkritisch.
- Der Salt kommt aus `ANALYTICS_SALT` (mit Fallback-Konstante). Für maximale
  Nicht-Umkehrbarkeit sollte in Produktion ein echtes Secret gesetzt werden.
- „Besucher" ist eine **Schätzung** (tagesbezogen eindeutig) und wird im UI als
  solche gekennzeichnet — bewusst zugunsten der Datensparsamkeit.
- Die Rechtsgrundlage (Datenschutzerklärung) formuliert Nicole selbst; hier wird
  nur die technische Datensparsamkeit sichergestellt (CLAUDE.md: keine Rechtstexte).
