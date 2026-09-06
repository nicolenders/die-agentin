# 0031 — Die Marke als Entität auffindbar machen

**Datum:** 06.09.2026
**Status:** angenommen

---

## Kontext

Ein Test über mehrere Suchmaschinen zeigte ein klares Muster: Unter „Nicole
Enders“ wird die Website gefunden. Unter „Die Agentin“ oder „Agentin“ taucht sie
nirgends auf. Kommt „Microsoft“ als Begriff dazu, erscheint sie wieder.

Das ist kein Indexierungsproblem. Die Website ist indexiert und rankt unter dem
Personennamen. Das Problem ist Mehrdeutigkeit auf zwei Ebenen:

1. **Der Begriff ist besetzt.** „Agentin“ ist im Deutschen ein Gattungsbegriff,
   und „Die Agentin“ ist der deutsche Titel eines Spielfilms von 2019 (Diane
   Kruger, Originaltitel „The Operative“) mit Wikipedia-Artikel,
   Filmdatenbanken und Streaming-Seiten dahinter. Gegen diese Belegung gewinnt
   eine persönliche Website die nackte Suchanfrage nicht — nicht durch Markup
   und nicht durch Text.

2. **Im Markup gab es die Marke als Entität nicht.** Die Zeichenkette „Die
   Agentin“ stand zwar an vielen Stellen der Seite, aber nirgends war
   maschinenlesbar hinterlegt, dass sie *dieselbe Entität* meint wie „Nicole
   Enders“. Der `Person`-Knoten trug nur `name`, der `WebSite`-Knoten keinen
   Ausweichnamen, und `og:site_name` sagte „nicolenders.com“ statt der Marke.
   Die H1 der Startseite enthielt weder den Marken- noch den Personennamen.

Damit war die Verbindung, an der die zweite Beobachtung hängt — mit „Microsoft“
im Suchbegriff wird die Seite gefunden —, reiner Zufallstreffer über Fließtext
statt einer erklärten Zuordnung.

## Entscheidung

Die nackte Suchanfrage „Die Agentin“ wird **nicht** als Ziel verfolgt. Ziel ist,
dass die Marke als Entität eindeutig zur Person gehört, damit sie in jeder
Kombination („Die Agentin Microsoft“, „Agentin MVP“, „Nicole Enders Agentin“)
sowie in KI-Antwortsystemen zuverlässig auf diese Website führt.

Dafür:

1. **`Person.alternateName = ["Die Agentin"]`** — die einzige Stelle im Markup,
   an der Personenname und Marke als eine Entität auftreten.

2. **`Person.disambiguatingDescription`** — sagt ausdrücklich, welche Entität
   gemeint ist, statt sich darauf zu verlassen, dass sie erraten wird. Genau
   dafür ist die Eigenschaft in schema.org vorgesehen.

3. **`WebSite.name = "Die Agentin"`, `alternateName = ["Nicole Enders",
   "nicolenders.com"]`** — der Wunschname ist nicht eindeutig. Vergibt eine
   Suchmaschine ihn deshalb nicht, braucht sie eine Alternative; ohne eine
   bildet sie sich selbst eine aus Titel und Domain.

4. **`og:site_name` trägt die Marke statt der Domain.** Es ist eines der
   Signale, aus denen der Site-Name über dem Suchergebnis entsteht. Stand dort
   die Domain, konnte die Marke dort nie erscheinen.

5. **Der Markenname steht im Dictionary in natürlicher Schreibweise.** Die
   Versalien sind eine Gestaltungsentscheidung und liegen jetzt im CSS. Derselbe
   String geht in `<title>`, `og:site_name` und die JSON-LD-Knoten; dort ist die
   natürliche Form das eindeutigere Signal.

6. **Die H1 der Startseite trägt die Marke** als eigene, typografisch abgesetzte
   Zeile. Sie ist strukturell, nicht Teil des redaktionell pflegbaren
   Rich-Text-Felds — als Teil des Felds wäre sie beim nächsten Redigieren still
   verschwunden.

7. **`ProfilePage` auf der Legende**, mit `mainEntity` auf den Person-Knoten.
   Damit ist benannt, welche Seite die maßgebliche Darstellung der Person ist.
   Die Legende ist auch die Seite, die die Doppelbedeutung von „Agentin“
   erklärt.

8. **`knowsAbout` um die Werkzeuge erweitert.** Zuvor standen dort fünf
   Rollenbezeichnungen — zu wenig, um die Person fachlich einzuordnen.
   Historische Werkzeuge bleiben draußen.

9. **IndexNow.** Neue und geänderte Depeschen werden beim Veröffentlichen
   gemeldet, statt auf den nächsten Crawl zu warten. Der Grund ist nicht
   Geschwindigkeit um ihrer selbst willen: Bing speist Copilot, ChatGPT-Suche
   und Perplexity. Für eine Website über Microsoft AI ist das der Kanal, in dem
   sie vorkommen muss.

## Konsequenz

- Der sichtbare Auftritt ändert sich an genau einer Stelle: die Markenzeile über
  dem Hero-Titel. Alles andere ist Markup und Metadaten.
- `INDEXNOW_KEY` ist eine neue, **optionale** Umgebungsvariable. Ohne sie meldet
  nichts — das ist der Normalzustand lokal und auf Staging. Der Schlüssel ist
  kein Geheimnis; er wird unter `/indexnow-key.txt` öffentlich ausgeliefert und
  belegt nur, dass der Melder Zugriff auf die Domain hat.
- Der Site-Name in der Ergebnisliste kann sich ändern (von „nicolenders.com“ zu
  „Die Agentin“). Suchmaschinen übernehmen solche Änderungen nicht sofort und
  nicht garantiert — sie sind Präferenz, keine Anweisung.
- **Was diese Änderungen nicht leisten:** Sie gewinnen die Suchanfrage „Die
  Agentin“ nicht. Die entscheidet sich außerhalb dieser Website — daran, ob die
  Marke in Sprecherbiografien auf Konferenzseiten, in Sessionize, im
  LinkedIn-Profil, in Videobeschreibungen und in Podcast-Shownotes als
  verlinkter Name auftaucht. Dieses Repository kann dafür die Voraussetzung
  schaffen, aber nicht die Arbeit erledigen.
