# 0021 — Abhängigkeiten: was jetzt gehoben wird und was nicht

**Datum:** 19.08.2026
**Status:** angenommen

---

## Kontext

`npm audit` meldete neun Befunde, acht davon `high`. Der Kommentar im CI-Gate
begründete das Nicht-Blockieren mit `postcss` und `sharp` unterhalb von
`next@16.2.12` — diese Begründung war überholt, und ein Gate mit veralteter
Begründung ist schlimmer als keins: es sieht nach Prüfung aus.

Nachgesehen, was tatsächlich dahintersteht:

| Paket | Befund | Behebbar durch |
|---|---|---|
| `sharp` (→ libvips) | CVE-2026-33327, -33328, -35590, -35591 | Nebenversion |
| `postcss` | XSS über unescaptes `</style>`, Dateilesen | Nebenversion von `next` |
| `nanoid` | Endlosschleife bei Größe 0 | Nebenversion |
| `prisma` / `@prisma/config` (→ `deepmerge-ts`) | Stapelerschöpfung | **Hauptversion** |
| `geoip-lite` (→ `ip-address`) | XSS in `Address6`, Oktale in `Address4` | **Hauptversion** |

Das trennt die Lage in zwei Gruppen, die verschieden zu behandeln sind.

## Entscheidung

**Gehoben wird alles, was ohne Hauptversionssprung geht.** Ausschlaggebend ist
`sharp`: es verarbeitet jedes hochgeladene Bild, liegt also auf dem einzigen
Pfad, auf dem fremde Daten durch eine C-Bibliothek laufen. Das ist der Befund
mit der kürzesten Strecke zwischen Angreifer und Schwachstelle. `next` bleibt
dabei auf Hauptversion 16 — der Stack aus CLAUDE.md ändert sich nicht, nur die
Nebenversion.

**Nicht gehoben werden `prisma` und `geoip-lite`.** Beide verlangen einen
Hauptversionssprung. Bei Prisma hängt daran das gesamte Datenmodell samt
Migrationen; bei `geoip-lite` die Länderzuordnung der Reichweitenmessung. Das
sind Stack-Änderungen im Sinne von CLAUDE.md („nicht ohne Rückfrage ändern") und
gehören in eine eigene Aufgabe mit eigenem Test, nicht in einen Sammel-PR.

Beide Restbefunde sind zudem in dieser Anwendung schwer erreichbar:
`deepmerge-ts` läuft nur beim Einlesen der Prisma-Konfiguration zur Bauzeit; die
verwundbaren `Address6`-HTML-Methoden von `ip-address` ruft `geoip-lite` nicht
auf — genutzt wird ausschließlich `lookup()` auf einer transienten IP.

**`npm audit` bleibt sichtbar, aber nicht blockierend**, mit dieser ADR als
Begründung statt eines veralteten Kommentars.

## Konsequenzen

- Die Bildverarbeitung — der einzige Pfad mit fremden Binärdaten — ist auf einem
  Stand ohne bekannte libvips-Befunde.
- Zwei bekannte Befunde bleiben im Baum. Sie stehen in `docs/ARCHITEKTUR.md` §9
  als benannte Schuld, nicht als Fußnote in einer YAML-Datei.
- Der nächste Prisma-Hauptversionssprung braucht einen eigenen Vorgang:
  Migrationen gegen eine Kopie fahren, Seed prüfen, dann heben.
