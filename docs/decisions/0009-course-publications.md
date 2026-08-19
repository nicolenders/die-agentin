# 0009 — Kurse als Publikationstyp, ohne Drittanbieter-Video

**Datum:** 10.08.2026
**Status:** angenommen

---

## Kontext

Nicole bietet eigene Trainings auf LinkedIn Learning an und möchte diese bei den
Publikationen zeigen — idealerweise „als Video". Zwei Randbedingungen sprechen
gegen ein direktes Einbetten:

- **Paywall.** LinkedIn Learning stellt keinen frei abspielbaren Einbett-Player
  für ganze Kurse bereit; Leser ohne Abo/Login sähen nur eine Anmeldewand.
- **Datenschutz.** Ein LinkedIn-Embed lädt beim Seitenaufruf von einer
  Drittanbieter-Domain. `CLAUDE.md` verbietet neue Drittanbieter-Requests ohne
  Consent-Prüfung.

## Entscheidung

Neuer Publikationstyp `COURSE` (App-Enum in `lib/domain.ts`, keine Migration —
`Publication.type` ist ein String). Bestehende Felder werden wiederverwendet:
`role` → „Trainerin", `publisher` → Plattform („LinkedIn Learning"), `url` →
Kurslink, `coverAsset` → Thumbnail (16∶9). Öffentlich als eigene Kachelreihe
„Kurse & Trainings" mit Thumbnail oben und Button „Zum Kurs"; kein Auto-Embed.

Ein echtes Video bleibt möglich, aber nur **selbst gehostet**: ein kurzer,
selbst erstellter Teaser-Clip (MP4 im Blob-Storage) als natives HTML5-`<video>`
— kein Drittanbieter, keine Consent-Frage. Von LinkedIn produzierte Trailer
gehören i. d. R. LinkedIn und werden ohne Rechteklärung nicht gehostet.

## Konsequenz

Kurse erscheinen sofort, datenschutzkonform und ohne externe Requests. Wird
später ein Teaser-Video gewünscht, kommt ein `videoAssetId`-Feld hinzu
(abwärtskompatible Migration) plus ein `<video>`-Renderer — die Kachelstruktur
bleibt unverändert.
