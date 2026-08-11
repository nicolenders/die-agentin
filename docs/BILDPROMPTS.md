# Bild-Prompts für „Die Agentin"

Fertige Prompts für ChatGPT (Bildgenerierung), damit alle Bilder zur Marke
passen. **So gehst du vor:**

1. Prompt kopieren, in ChatGPT ein Bild erzeugen lassen.
2. Bild herunterladen, passend benennen (siehe Tabelle) und nach
   `public/brand/` legen.
3. Seite neu laden — das Bild ersetzt automatisch den Platzhalter.

Jeder Prompt enthält am Ende den **Stil-Baustein**, damit die Bilder als Serie
zusammenpassen. Wenn du eigene Prompts schreibst, häng ihn einfach an.

---

## Stil-Baustein (immer anhängen)

> **Stil:** dunkle, edle Editorial-Tech-Ästhetik. Fast schwarzer Hintergrund
> (#05010D) mit violetten (#8B5CF6) und magentafarbenen (#E879F9) Akzenten, ein
> Hauch Signalblau (#38BDF8). Feines Raster und weicher radialer Lichtschein.
> Zurückhaltend, hochwertig, cineastisch — „Geheimagentin trifft Microsoft AI".
> Klar, elegant, nicht überladen. Kein Text, keine Logos, keine Wasserzeichen.
> Sehr hohe Auflösung.

---

## 1 · Hero-Bild der Startseite → `public/brand/hero.jpg` (Hochformat 4:5)

> Ein markantes, abstraktes Markenbild für eine Tech-Beraterin namens „Die
> Agentin". Fließende Lichtlinien und Netzwerkknoten verbinden sich zu einer
> eleganten, geheimnisvollen Silhouette, die Menschen mit intelligenten Systemen
> verknüpft. Souverän, fokussiert, futuristisch, viel Tiefe und Raum.
> Bildformat 4:5 (Hochformat). *(Stil-Baustein anhängen.)*

*Alternative:* Wenn du dich selbst zeigen möchtest, nutze statt des abstrakten
Motivs ein professionelles Porträt von dir (siehe Nr. 2).

## 2 · Porträt (Über mich) → `public/brand/portrait.jpg` (Hochformat 4:5)

> Editorial-Porträt einer selbstbewussten Tech-Expertin vor fast schwarzem
> Hintergrund, seitliches violettes Rim-Light, ruhiger kluger Blick, moderne
> reduzierte Kleidung, cineastische Lichtsetzung, feine Körnung, edel.
> Bildformat 4:5 (Hochformat). *(Stil-Baustein anhängen.)*

> **Empfehlung:** Für eine Personenmarke wirkt ein **echtes** professionelles
> Foto von dir am stärksten. Nutze den Prompt dann nur als Stil-/Retusche-
> Referenz (Hintergrund, Licht, Farbstimmung), nicht zur Erzeugung einer Person.

## 3 · Buchcover → `public/brand/cover-<Publikations-ID>.jpg` (Hochformat 2:3)

Die Publikations-ID findest du im Admin unter „Publikationen & Ausbildung"
(bzw. in den Seed-Daten `pub-copilot-buch`, `pub-governance-buch`). Beispiel:
`public/brand/cover-pub-copilot-buch.jpg`.

> Minimalistisches Buchcover-Mockup zum Thema Microsoft AI & Governance. Dunkler
> Grund, violett-magenta Farbverlauf, ruhige geometrische Formen mit einem
> dezenten Zielmarken-/Fadenkreuz-Motiv, sehr viel Ruhe, klare Komposition.
> Kein lesbarer Text. Bildformat 2:3 (Hochformat). *(Stil-Baustein anhängen.)*

---

## Optional

### Logo / Markensymbol (transparent, 1:1)

Ein schlichtes Favicon ist bereits eingebaut (`app/icon.svg`). Für ein
hochwertigeres Logo (z. B. für Präsentationen):

> Minimalistisches Logo-Symbol für „Die Agentin": ein Kreis mit feinem
> Fadenkreuz/Zielmarke, monogramm-artig, eine dünne violette Linie, sehr
> reduziert, vektorartige Klarheit. Quadratisch 1:1, **transparenter
> Hintergrund**. Kein Text. *(Stil-Baustein — aber ohne Hintergrund.)*

### Themenbilder für Beiträge/Dossiers (Querformat 16:9)

Diese lädst du direkt im Editor über die Medienbibliothek hoch (mit Alt-Text).
Passende Prompts:

- **KI-Agenten in Produktion:** Abstrakte Illustration verbundener Agenten-
  Knoten, Pipelines und dezenter UI-Elemente, Gefühl von Fluss und Kontrolle.
  16:9. *(Stil-Baustein.)*
- **Sensitivity Labels / Purview:** Abstrakte Illustration zu Informationsschutz
  — Etiketten, Schilde, Datenflüsse, ein feines Schloss-Motiv. 16:9.
  *(Stil-Baustein.)*
- **Backstage / Vorbereitung:** Cineastisches Motiv, Bühne von hinten, Laptop
  mit Demo-Umgebung, dezentes violettes Licht, ruhig und konzentriert. 16:9.
  *(Stil-Baustein.)*

## Identitäten — Umschlag-Motive (Phase 12.4)

Jede Identität hat **zwei** Bilder, die als **Paar** erkennbar sein müssen:
ein **Umschlag-Motiv** (Querformat/4:5, `envelopeImageId`) und ein einfacheres
**Portrait** (quadratisch 1:1, `portraitImageId`). Upload im Admin unter
„Identitäten → Bilder". Ergebnis als **WebP**, mindestens **1600 px** lange Kante,
mit lokalisierten Alt-Texten.

**Wichtig für die ganze Serie:**
- Pro Identität nur **die Objekte** und die **Akzentfarbe** austauschen — alles
  andere gleich lassen, damit die Serie als Serie erkennbar bleibt.
- **Keine echten Microsoft-Marken** in generierten Bildern („no logos, no brand
  marks").
- **Kein Gesicht** — die Identität ist die Rolle, nicht die Person. Das Porträt
  der Person bleibt der Legende vorbehalten.

### Basis-Prompt Umschlag (4:5) — pro Identität anpassen

> A cinematic still-life photograph, top-down flat lay on a dark matte surface.
> An opened manila envelope with its contents spilled out: a laminated ID badge,
> a folded dossier with visible but unreadable text, a few banknotes, a small
> brass key, and a handwritten note. The objects relate to **[THEMA DER IDENTITÄT]** —
> **[KONKRETE OBJEKTE]**. Muted color grading, one dominant accent color:
> **[IDENTITÄTSFARBE]**. Hard directional light from the upper left, deep shadows,
> shallow depth of field. Analog film grain, 35mm. No visible faces, no legible
> text, no logos, no brand marks. Editorial photography, understated, not glossy.
> Aspect ratio 4:5.

### Kurzvariante Portrait (1:1) — dasselbe Motiv, reduziert

> Same style and lighting as the envelope series. A single hero object of the
> identity, filling the square frame on the same dark matte surface:
> **[ZENTRALES OBJEKT]**, one dominant accent color **[IDENTITÄTSFARBE]**.
> Analog film grain, 35mm, no faces, no legible text, no logos. Aspect ratio 1:1.

### Pro Identität einsetzen

| Identität | Farbe | Objekte (Umschlag) | Zentrales Objekt (Portrait) |
|---|---|---|---|
| collaboration | `#8B5CF6` | a network/site-map sketch, a small headset, sticky notes forming a hierarchy | the laminated ID badge on a site-map sketch |
| low-code | `#E879F9` | a flow-diagram sketch, connector cables, a toy building block | a single connector plug on a flow sketch |
| agentic-ai | `#38BDF8` | a circuit-like schematic, a small chip, a chat-bubble stamp on the badge | the chip on the ID badge |
| dev-ai | `#4ADE80` | a terminal-style printout, a USB stick, a code snippet on paper (vendor-neutral) | the USB stick on a code printout |

Hinweis dev-ai: bewusst **nicht** Microsoft-exklusiv — das darf im Motiv sichtbar
sein (herstellerneutrale Objekte).

### Social-Sharing-Bild

Wird **automatisch** erzeugt (`app/(site)/[locale]/opengraph-image.tsx`) und
erscheint als Vorschau, wenn ein Link geteilt wird (LinkedIn/X/Slack). Kein
eigenes Bild nötig. Möchtest du stattdessen ein fotografisches Motiv, nimm den
Hero-Prompt (Nr. 1) im **Querformat 1200×630**.
