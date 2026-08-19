# 0011 — Adminsuche, Online-Einsätze, Einsatzakte-Freigabe und Kanäle ohne Direktpost

**Datum:** 16.08.2026
**Status:** angenommen

---

## Kontext

Ein Bündel von Anpassungen aus dem laufenden Betrieb. Vier davon brauchten eine
Entscheidung, weil sie Daten, URLs oder bestehendes Verhalten berühren.

## Entscheidungen

### 1. Online-Einsätze liegen in der Antarktis

Bisher waren Online-Einsätze „ohne festen Ort" und wurden auf der Karte gar nicht
geplottet — der Optionstext sagte das auch so. Gewünscht ist das Gegenteil: sie
sollen sichtbar sein. Statt einer zweiten Kartendarstellung bekommen sie einen
festen, symbolischen Ort: `lat -75 / lon 0 / Ländercode AQ` (`ONLINE_LOCATION` in
`components/admin/MissionForm.tsx`). Dort findet erkennbar keine Konferenz statt,
der Punkt liest sich also als „ortlos" und nicht als Falschangabe.

Folgen: Beim Anhaken von „Online-Event" werden Ländercode- und Koordinatenfelder
ausgeblendet und die Werte serverseitig überschrieben. Der Online-Filter auf der
öffentlichen Einsatzseite wird immer angeboten (vorher nur, wenn es Online-Einsätze
gab — dadurch wirkte er „verschwunden").

### 2. Die Einsatzakte wird ausdrücklich freigegeben (`Mission.caseFilePublic`)

Ein veröffentlichter Einsatz hatte automatisch einen Button „Einsatzakte öffnen" —
auch wenn die Detailseite noch leer war. Neu entscheidet ein eigenes Feld
(Default **aus**), ob der Button erscheint: im Karten-Popup, in der Einsatzliste,
in der Briefing-Tabelle und beim „nächsten Einsatz" auf der Startseite.

Bewusst **nicht** gemacht: die Detailseite selbst zu sperren. Bestehende Links
und Lesezeichen sollen weiter funktionieren; das Feld steuert, was die Website
anbietet, nicht was sie ausliefert. In der Sitemap stehen Einsatzakten ohnehin nicht.

Da der Default `false` ist, sind nach dem Deployment zunächst **alle** Einsatzakten
unverlinkt — die gewünschten schaltet Nicole je Einsatz frei.

### 3. Depeschen gehören zu Radar-Themen (`Dispatch ↔ FocusTopic`)

Die Punkte unter „Aufklärung (Radar)" sind öffentlich anklickbar und filtern die
Depeschenliste (`/{locale}/depeschen?thema=<id>`). Anklickbar ist ein Punkt nur,
wenn mindestens eine **veröffentlichte** Depesche daran hängt — sonst bliebe ein
Link ohne Ziel. Die Zuordnung erfolgt im Admin an der Depesche.

Der Filter benutzt die **ID** des Themas, keinen Slug: Radar-Themen sind kurzlebig,
werden umbenannt und haben keine eigene Seite. Ein zusätzlicher Slug wäre ein
weiteres Feld zum Pflegen, ohne dass jemand die URL je liest.

### 4. PDFs als eigenes Modell (`MediaDocument`)

Die Medienverwaltung trennt jetzt „Bilder" und „Präsentationen". Bilder
(`MediaAsset`) haben Varianten, Alt-Texte und Bildherkunft, ein PDF hat davon
nichts — deshalb ein eigenes, schlankes Modell statt einer aufgeweichten
Bildtabelle. Der Bezug zum Einsatz läuft weiter über `Mission.slidesFilePath`;
der Ablagepfad ist der gemeinsame Schlüssel. Die Migration übernimmt bereits
hochgeladene Foliendateien in die neue Liste. Ein Dokument, das noch an einem
Einsatz hängt, lässt sich nicht löschen.

### 5. „Direkt auf LinkedIn veröffentlichen" ist entfernt

Der OAuth-Weg (Verbinden, Token, automatischer Versand über die Kanal-Aufgaben)
ist ersatzlos ausgebaut: Route Handler, LinkedIn-Client, Task-Verarbeitung,
Ablaufwarnung und der ungenutzte Key-Vault-Platzhalter (`lib/secrets.ts`).
Alle Kanäle laufen jetzt gleich — Text kopieren, Profil öffnen. Neu eingereihte
Kanal-Aufgaben entstehen dadurch immer im Zustand `MANUAL_OPEN`.

Die Modelle `ChannelAccount`/`ChannelTask` bleiben bestehen (Historie, manuelle
Aufgaben). `ChannelAccount.tokenRef`/`expiresAt` werden nicht mehr geschrieben.

### 6. „seit" und Sprachliste einer Identität entfallen

Beides erschien auf der Identitätsseite („· 2024", „Sprachen: de, en") und sagte
nichts, was die Rolle nicht besser sagt. Die Felder sind aus Anzeige und
Erfassungsmaske entfernt; die Spalten `since` und `languages` bleiben vorerst im
Schema und werden von den Server Actions **nicht mehr geschrieben** — abwärts-
kompatibel gemäß CLAUDE.md (erst Code, später Spalte).

## Konsequenzen

- Eine Migration (`20260816120000_case_file_media_docs_radar`): neue Spalte
  `Mission.caseFilePublic`, Tabelle `MediaDocument` (inkl. Übernahme vorhandener
  Foliendateien), Join-Tabelle `_DispatchFocusTopics`. Alles additiv.
- Die globale Adminsuche (`/admin/suche`) fragt je Bereich einzeln ab und
  filtert/sortiert im Speicher — kein Volltextindex, nichts zu pflegen. Bei den
  Datenmengen einer Person ist das ausreichend; die reine Logik (Normalisierung,
  Bereichsfilter, Ranking) liegt testbar in `lib/admin/search.ts`.
- Erfolgsmeldungen erscheinen als kurze Einblendung oben rechts (3 Sekunden);
  Fehler bleiben weiterhin stehen, wo sie entstanden sind.
