# docs/DESIGN.md — Redesign-Plan (Phase 12)

Erst planen, dann bauen. Dieser Plan leitet die Umsetzung; die Marke hat bereits
eine Anmutung (Spionage-Editorial-Tech) — das hier ist **kein Neuanfang**,
sondern eine Schärfung um die Identitäten (Umschläge) und die Doppeldeutigkeit.

## 1. Farbpalette (aus `styles/_tokens.scss` abgeleitet)

| Rolle | Hex | Verwendung |
|---|---|---|
| `--ink` | `#05010D` | Seitengrund (fast schwarz) |
| `--violet` | `#8B5CF6` | Primärakzent, Rahmen, Fokus |
| `--magenta` | `#E879F9` | Sekundärakzent, aktive Karten-Pins |
| `--signal` | `#38BDF8` | Status/geplant, Hinweise |
| `--text` | `#EDE9F8` | Fließtext |
| `--muted` | `#A093C0` | Metazeilen, sekundär |

**Identitätsfarben** (fügen sich in die Palette, untereinander unterscheidbar,
auch bei Farbfehlsichtigkeit — verschiedene Helligkeit + Ton, nicht nur Rot/Grün):

| Identität | Farbe | |
|---|---|---|
| collaboration | `#8B5CF6` violett | dunkel, warm |
| low-code | `#E879F9` magenta | hell, pink |
| agentic-ai | `#38BDF8` cyan | mittel, kühl |
| dev-ai | `#4ADE80` grün | hell, kühl — bewusst „nicht Microsoft-exklusiv" |

Kontrast der Akzente gegen `--ink` wird bei der Pflege geprüft
(`lib/identities.ts`, ≥ 3:1 für UI).

## 2. Typografie

- **Display:** Poppins (600/800), gesperrte Versalien für Marke/Überschriften.
- **Fließtext:** Inter.
- **Utility / Labels:** JetBrains Mono — trägt die Label-Ästhetik der Marke
  („KLASSIFIZIERUNG: ÖFFENTLICH", „HAUPTQUARTIER · STATUS AKTIV", Kennungen wie
  „ID-04"). Das ist ein tragendes, kein dekoratives Element.
- Alle lokal via `next/font/local` (keine externen Requests, Phase 11.1).

## 3. Signature-Element: der Umschlag

Eine Identität wird als **Umschlag** dargestellt — mit Ausweis, Geld und
Unterlagen (Bildmotiv aus 12.4). Das ist das eine Element, an das man sich
erinnern soll. Boldness hier, alles andere ruhig:
- Identitätskarte = Umschlag-Motiv (4:5) + Kennung (Mono) + Deckname + Rolle +
  Akzentfarbe als linker Rand (`border-left: 3px solid <color>`).
- Zurückhaltende Hover-Anhebung; **eine** Reveal-Geste (Scroll/Hover), nicht drei.

## 4. Layout — ASCII-Wireframes

### Startseite (Scroll-Erzählung, keine Chronologie)
```
┌───────────────────────────────────────────┐
│ HAUPTQUARTIER · STATUS AKTIV               │  Hero: Marke + Rollenzeile
│  Die Agentin  ⟨Doppeldeutigkeit ENTWURF⟩   │
│  [Porträt/Markenbild]                      │
├───────────────────────────────────────────┤
│ Die Legende (Kurzfassung) → volle Legende  │
├───────────────────────────────────────────┤
│ Die Identitäten  (Umschläge nebeneinander) │  gleichrangig, keine Reihenfolge
│  [◧ ID-01] [◧ ID-02] [◧ ID-03] [◧ ID-04]   │  = Chronologie
├───────────────────────────────────────────┤
│ Einsätze im Fokus  (nächster Einsatz + Karte)│
├───────────────────────────────────────────┤
│ Zuletzt eingegangen  (Depeschen, Id-Farbe) │
├───────────────────────────────────────────┤
│ Kennzahlen  (Einsätze·Länder·Identitäten·  │
│  Briefings·Zert·Bücher·MVP)                │
└───────────────────────────────────────────┘
```

### Identitätsseite
```
┌───────────────────────────────────────────┐
│ ● ID-03            [Umschlag-Motiv 4:5]    │  Header = Umschlagkarte (View Transition)
│ Deckname / Rolle                           │
│ Beschreibung (mehrere Absätze)             │
│ Aktueller Fokus · Sprachen · Merkmale      │
├───────────────────────────────────────────┤
│ Was hier belegt wird:                      │  der Beweis
│  Depeschen · Einsätze · Briefings ·        │
│  Publikationen · Zertifizierungen          │
└───────────────────────────────────────────┘
```

## 5. Motion
- **View Transitions API** Übersicht → Detail (Element-Kontinuität: Identitäts-
  karte → Seitenkopf, Kartenpin → Akte). Progressive Enhancement.
- **Ein** Umschlag-Effekt (Hover/Scroll-Reveal), gut gemacht.
- Karte: Pins nach Identitätsfarbe, Legende darunter.
- `prefers-reduced-motion` durchgängig — ohne Motion funktioniert alles.

## 6. Prüfung gegen Beliebigkeit

Was diese Seite von „jeder Personal-Brand-Seite" unterscheidet:
- Die **Identität als Umschlag** (Objekt mit Inhalt), nicht als Tag-Chip.
- Die **Mono-Label-Ästhetik** (Klassifizierung, Kennungen) als tragendes System.
- Das **Codebuch** (Legende), das die Spionage-Metapher offenlegt und zugleich
  die Usability rettet (Sektionsnamen erklärt).
- Die **Doppeldeutigkeit** (Spionin ⇔ AI-Agents-Entwicklerin, „Enders / keine
  losen Enden") — explizit ausgesprochen, bisher nirgends auf der Seite.
Geändert ggü. einem generischen Entwurf: keine Hero-Slogans, keine
Marketing-Kacheln; die Struktur folgt dem Vokabular, nicht einem Template.
