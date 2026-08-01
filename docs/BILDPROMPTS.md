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

### Social-Sharing-Bild

Wird **automatisch** erzeugt (`app/(site)/[locale]/opengraph-image.tsx`) und
erscheint als Vorschau, wenn ein Link geteilt wird (LinkedIn/X/Slack). Kein
eigenes Bild nötig. Möchtest du stattdessen ein fotografisches Motiv, nimm den
Hero-Prompt (Nr. 1) im **Querformat 1200×630**.
