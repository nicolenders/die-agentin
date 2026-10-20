# 0033 — Vorschau und Bilder-Pool für Depeschen

**Datum:** 06.10.2026
**Status:** angenommen

---

## Kontext

Zwei Lücken in der Depeschen-Maske:

1. **Keine Vorschau.** Wie eine Depesche aussieht, sah man erst, wenn sie
   veröffentlicht war. Für Beiträge gab es seit SPEC §6 einen signierten
   Vorschau-Link (`/preview/[token]`), für Depeschen nicht.
2. **Keine Bilder im Text.** Der Text einer Depesche ist ein `RichTextField`
   im schlanken Kontext `field` — reiner Fließtext. Bilder im Text gingen nur
   über einen Umweg, und wer sie in DE und EN wollte, hätte sie zweimal
   auswählen müssen.

Gewünscht (Nicole, 06.10.2026): Bilder werden **einmal** an der Depesche
gepflegt und **nur im Text** eingesetzt — keine zusätzliche Galerie unter dem
Artikel. Vorschau für die Redaktion **und** ein teilbarer Link.

## Entscheidungen

### 1. Ein Bilder-Pool je Depesche (`DispatchImage`)

Neue Tabelle `DispatchImage (dispatchId, assetId, sortOrder)`, eindeutig je
Paar, Kaskade beim Löschen der Depesche, `NO ACTION` zum Bild — dasselbe Muster
wie `MissionPhoto`. Gepflegt im Register „Stammdaten" (hinzufügen über die
bekannte Medienbibliothek inkl. Upload, sortieren, entfernen).

Der Pool speichert nur **welche** Bilder. Die Texte speichern nur die
Asset-ID; den Alt-Text in der Sprache der Seite liefert beim Rendern das
`MediaAsset` (`resolveAssets`: `altEn`, sonst `altDe`). Damit ist ein Bild
tatsächlich einmal gepflegt. Je Sprache bleibt nur die **Bildunterschrift** —
die ist Text und gehört deshalb in den Text.

### 2. Die Editoren teilen den Pool live

Alle Register der Maske sind gleichzeitig im DOM (`FormTabs`). Ein kleiner
Client-Context (`DispatchImagePoolProvider`) hält den Pool, die Verwaltung in
„Stammdaten" schreibt ihn, die Editoren in „Deutsch" und „English" lesen ihn.
Ein eben hinzugefügtes Bild steht ohne Zwischenspeichern in beiden Sprachen
bereit. Keine State-Bibliothek, nur React.

### 3. Neuer Sanitizer-Kontext `fieldImages`

`parseRichValue` bereinigte Feldwerte bisher immer für `field` — ein
eingefügtes Bild wäre beim nächsten Öffnen der Maske stillschweigend
verschwunden und beim Speichern gelöscht worden. `fieldImages` ist `field` plus
genau der Bild-Block; Galerien, Videos und Inhaltsverzeichnis bleiben
draußen. Felder ohne Pool verhalten sich unverändert.

Im Editor zeigt der Bild-Block das Bild selbst (statt eines Platzhalters), damit
man sieht, welches Pool-Bild an der Stelle steht.

### 4. Vorschau: eine Komponente, zwei Zugänge

Der Artikel der Detailseite ist nach `components/content/DispatchArticle.tsx`
gezogen. Detailseite und Vorschau rendern dieselbe Komponente — die Vorschau
sieht nicht ungefähr so aus wie die Seite, sondern genau so.

- **Redaktion:** `/preview/depesche/[id]?lang=de|en`. Liegt in der Route Group
  der Vorschau (schlichtes Root-Layout, immer `noindex`) und prüft die Rolle
  selbst (nicht angemeldet → Anmeldung, kein Admin → 403), weil das
  Admin-Layout dort nicht greift.
- **Teilen:** `/preview/[token]` kennt jetzt die Art `dispatch`. Token wie
  gehabt: HMAC mit `AUTH_SECRET`, sieben Tage gültig, unbekannte Arten werden
  abgewiesen.

Die Vorschau zeigt den **gespeicherten** Stand, unabhängig von Status und
Datum, ohne Cache. Ein Vorschau-Band nennt Status und Termin und schaltet die
Sprache um; fehlt EN, erscheint derselbe Hinweis wie öffentlich.

## Konsequenzen

- Migration `20261006120000_dispatch_images` ist rein additiv.
- Die Mediathek zählt Pool-Bilder beim „wo verwendet" mit, und ein Bild im Pool
  lässt sich dort nicht löschen (sonst schlüge das Löschen am Fremdschlüssel
  fehl, mit unklarer Meldung).
- Ein Bild aus dem Pool zu entfernen, nimmt es **nicht** aus einem Text, in dem
  es schon steht — es wird weiter gerendert. Die Pool-Karte zeigt deshalb an,
  in welchem gespeicherten Text (DE/EN) ein Bild steckt.
- Der Vorschau-Link zeigt auch spätere Änderungen, solange er gilt — er zeigt
  immer den aktuellen gespeicherten Stand, keinen eingefrorenen.
- Ungespeicherte Änderungen sieht die Vorschau nicht. Eine Live-Vorschau aus
  dem Formular heraus hätte einen zweiten Render-Pfad gebraucht; erst speichern,
  dann ansehen ist der einfachere Weg.

## Nachtrag 20.10.2026 — Der Pool darf die Maske nicht mitreißen

Nach dem Deploy ließ sich keine Depesche mehr öffnen: Die Maske lud den Pool in
derselben Abfrage wie die Depesche, und solange die Migration
`20261006120000_dispatch_images` in Produktion nicht angewandt war, warf diese
Abfrage. Code und Schema kamen im selben Deploy — entgegen der Regel „erst
Spalte, dann Code" aus CLAUDE.md.

Seitdem gilt:

- Der Pool wird getrennt gelesen (`lib/queries/dispatch-images.ts`). Ist die
  Tabelle nicht lesbar, ist er `null`; die Maske bleibt bedienbar und sagt, dass
  der Pool gerade fehlt.
- Die Maske setzt den Marker `imagesManaged` nur, wenn sie den Pool angeboten
  hat. Ohne Marker fasst das Speichern den Pool nicht an (`readPoolIds`).
- Mediathek und Löschschutz lesen den Pool ebenfalls fehlertolerant.
