// Der mitgelieferte Standardsatz: Bausteine und Vorlagen, die beim ersten
// Aufruf der Werkstatt per Knopfdruck in die Datenbank wandern. Danach sind es
// ganz normale Einträge — änderbar, löschbar, ergänzbar. Der Code hält nur die
// Startaufstellung, nicht die Wahrheit.
//
// Der Inhalt ist nicht erfunden, sondern zusammengezogen aus dem, was für
// nicolenders.com ohnehin schon gilt: der Hero-Bildstil der Depeschen, die
// Umschlagserie der Identitäten aus `docs/BILDPROMPTS.md`, Nicoles
// Schreibstimme und die LinkedIn-Regeln aus den Skills. Bisher lag das an
// mehreren Stellen; hier steht es an einer, pflegbar ohne Codeänderung.
//
// Bildprompts sind auf Englisch: Bildmodelle sind darauf trainiert, und die
// Fachbegriffe („flat lay“, „rim light“) haben keine brauchbare Entsprechung.
// Textprompts sind auf Deutsch, weil ihr Ergebnis auf Deutsch entstehen soll.

import type { PromptKind, PromptSubject } from "@/lib/domain";

export interface DefaultSnippet {
  key: string;
  title: string;
  body: string;
  note?: string;
}

export interface DefaultTemplate {
  key: string;
  title: string;
  kind: PromptKind;
  subject: PromptSubject;
  purpose: string;
  body: string;
  withIdentities: boolean;
  aspect?: string;
  /** Beschriftung des freien Eingabefelds; fehlt, wenn die Vorlage keins braucht. */
  inputLabel?: string;
}

// ---------------------------------------------------------------------------
// Bausteine
// ---------------------------------------------------------------------------

export const DEFAULT_SNIPPETS: DefaultSnippet[] = [
  {
    key: "stil-depesche",
    title: "Bildstil · Depeschen (Spionagefilm der Siebziger)",
    note:
      "Der Stil der Hero-Bilder. Änderst du ihn hier, ändert sich die ganze Reihe auf der Depeschen-Übersicht.",
    body:
      "Style: 1970s spy film. Shot on 35mm film, visible grain, halation around the highlights, " +
      "a soft vignette. One hard directional key light plus a warm practical light inside the " +
      "frame, deliberate deep shadows. Muted, slightly desaturated palette. Calm, composed " +
      "framing — never hectic, never futuristic, never glossy. Photographed, not rendered.",
  },
  {
    key: "verbote-bild",
    title: "Bild-Verbote (in jeden Bildprompt)",
    note:
      "Die fünf Verbote. Sie halten die Bilder markenrechtlich sauber und verhindern, dass ein Motiv nach Stockfoto aussieht.",
    body:
      "No text or lettering anywhere. No logos, brand marks or product interfaces, neither real " +
      "nor invented. No recognizable faces — hands, silhouettes and shoulders are fine. No " +
      "screens or monitors. Nothing literal: no robot for an agent, no lightbulb for an idea, " +
      "no scales for law.",
  },
  {
    key: "stil-marke",
    title: "Bildstil · Marke (dunkel, violett, Editorial-Tech)",
    note:
      "Für Bilder der Marke selbst: Startseite, Porträt, Teilen-Karten. Nicht für Depeschen-Motive.",
    body:
      "Style: dark, refined editorial-tech aesthetic. Near-black background (#05010D) with " +
      "violet (#8B5CF6) and magenta (#E879F9) accents and a hint of signal blue (#38BDF8). " +
      "Fine grid texture and a soft radial glow. Restrained, high-end, cinematic. Clear and " +
      "elegant, never cluttered. Very high resolution.",
  },
  {
    key: "stil-akte",
    title: "Bildstil · Akte (Umschlagserie der Identitäten)",
    note:
      "Aufsicht auf dunkler Fläche, analog. Pro Identität wechseln nur die Gegenstände und die Akzentfarbe — alles andere bleibt, sonst zerfällt die Serie.",
    body:
      "Style: cinematic still life on a dark matte surface, photographed from directly above. " +
      "Hard directional light from the upper left, deep shadows, shallow depth of field. Muted " +
      "colour grading. Analog film grain, 35mm. Editorial photography, understated, never glossy.",
  },
  {
    key: "stil-schaubild",
    title: "Bildstil · Schaubild (erklärend statt dekorativ)",
    note: "Für Architekturbilder, Vergleiche und Carousel-Slides, auf die noch Text gesetzt wird.",
    body:
      "Style: clean editorial illustration — explanatory, not decorative. Flat shapes, generous " +
      "empty space, a limited palette of deep blue and anthracite with one clear accent colour. " +
      "Generic neutral icons only, never real product logos. Composition leaves room for a " +
      "headline. Never a stock-photo look.",
  },
  {
    key: "stimme",
    title: "Schreibstimme",
    note: "Hängt an jedem Textprompt. Der wichtigste Baustein: ohne ihn klingt jedes Ergebnis nach Modell.",
    body:
      "Schreib in der Stimme von {{person}} („{{marke}}“), nicht in der eines Sprachmodells.\n\n" +
      "Haltung: Ich-Perspektive, Du-Ansprache. Nie „man“, nie „Sie“. Eine These pro Text; nach " +
      "dem Lesen soll klar sein, was ich denke. Jede Empfehlung nennt, was sie kostet. Stehen " +
      "in einem Absatz nur Vorteile, fehlt etwas. Was ich nicht beurteilen kann, sag ich, statt " +
      "es zu überspielen.\n\n" +
      "Aufbau: Einstieg konkret: eine Szene, eine Zahl, ein Satz, den jemand gesagt hat. Nie " +
      "mit einer Definition anfangen. Zwischenüberschriften sind Aussagen oder Fragen, keine " +
      "Etiketten. Kurze Absätze, ein Gedanke pro Absatz. Fließtext ist die Grundform, Listen nur " +
      "da, wo wirklich aufgezählt wird. Am Schluss eine Einordnung mit Haltung.\n\n" +
      "Sprache: Satzlängen mischen, auf drei mittellange Sätze einen kurzen. Gleichförmiger " +
      "Rhythmus ist das deutlichste Erkennungszeichen von KI-Text. Keine Geviertstriche. Emoji " +
      "höchstens einzeln und nur da, wo sie etwas markieren.",
  },
  {
    key: "ki-marker",
    title: "Verbotene Muster (KI-Marker)",
    note: "Die Formulierungen, an denen Leser einen Maschinentext erkennen.",
    body:
      "Diese Muster nicht verwenden: „nicht nur X, sondern auch Y“; „es ist wichtig zu " +
      "verstehen, dass“; „in der heutigen schnelllebigen Welt“; „lass uns eintauchen“; „Fazit“ " +
      "als Überschrift; nahtlos, leistungsstark, revolutionär, bahnbrechend, ganzheitlich, " +
      "transformativ, Game Changer; drei perfekt parallel gebaute Aufzählungen hintereinander; " +
      "jede Zeile mit einem Emoji davor; rhetorische Fragen als Absatzeinstieg öfter als einmal; " +
      "Allgemeinplätze ohne Beleg; „es kommt darauf an“ ohne anschließende Festlegung.",
  },
  {
    key: "fachbegriffe",
    title: "Fachbegriffe und Produktnamen",
    body:
      "Englische Fachbegriffe bleiben englisch und stehen nicht in Anführungszeichen: agent, " +
      "prompt, tenant, deployment, pull request, harness, skill, grounding, observability, " +
      "governance, Copilot Credits. Produktnamen aktuell halten: Entra ID statt Azure AD, " +
      "Microsoft Foundry statt Azure AI Studio, Copilot Studio statt Power Virtual Agents, dazu " +
      "Microsoft 365 Copilot und Microsoft Agent Framework. Wo der Stand zählt, nenn ihn: " +
      "Preview oder allgemein verfügbar.",
  },
  {
    key: "quellen",
    title: "Umgang mit Zahlen und Quellen",
    body:
      "Keine erfundenen Zahlen, keine erfundenen Zitate, keine erfundenen Funktionen. Belege " +
      "gehören an die Primärquelle: Herstellerdokumentation, Release Notes, Rechtstext. Wo dir " +
      "eine Angabe fehlt, schreib [prüfen] an die Stelle, statt sie zu füllen. Zu jeder Zahl " +
      "gehört das Datum, auf das sie sich bezieht.",
  },
  {
    key: "linkedin-regeln",
    title: "LinkedIn-Regeln",
    note: "Faustregeln zu Reichweite und Lesbarkeit. Stand Anfang 2026, keine offizielle Dokumentation.",
    body:
      "Die ersten drei Zeilen stehen vor dem „…mehr“ und entscheiden alles: konkrete Szene, " +
      "überraschende These oder eine Zahl aus der Recherche. Kein Clickbait, keine " +
      "Ankündigungsfloskel. Danach kurze Absätze mit Leerzeilen, kein Textblock. Der fachliche " +
      "Wert steht im Post selbst, nicht hinter einem Link. Ein externer Link im Text kostet " +
      "Reichweite, deshalb kommt er in den ersten Kommentar und der Post weist darauf hin. Kein " +
      "Engagement-Bait („Kommentiert JA“, „Markiert drei Leute“). Eine Frage am Schluss nur, " +
      "wenn mich die Antwort wirklich interessiert. Drei bis fünf Hashtags.",
  },
];

// ---------------------------------------------------------------------------
// Vorlagen · Bild
// ---------------------------------------------------------------------------

const IMAGE_TEMPLATES: DefaultTemplate[] = [
  {
    key: "bild-depesche-hero",
    title: "Bild · Hero einer Depesche",
    kind: "IMAGE",
    subject: "DISPATCH",
    withIdentities: false,
    aspect: "16:9",
    inputLabel:
      "Bildidee: welches Objekt oder welche Werkstattszene trägt die These? (Wenn du keine hast, nimm zuerst die Vorlage „Bildidee zu einer Depesche finden“.)",
    purpose:
      "Das Aufmacherbild einer Depesche im festen Stil der Reihe. Braucht eine Bildidee; die findet die Textvorlage darüber.",
    body:
      "A 1970s workshop scene, photographed straight on at eye level. " +
      "[[The subject: {{eingabe}}.]] " +
      "Real materials — brushed metal, worn wood, paper, brass. One deliberate deviation in the " +
      "arrangement carries the tension of the piece; everything else is ordinary and still. " +
      "Hard key light from the left, a warm practical light inside the frame, long shadows " +
      "across the surface. Muted palette with one restrained accent colour. " +
      "[[The piece it belongs to is about: {{depesche.teaser}}]] " +
      "{{baustein.stil-depesche}} {{baustein.verbote-bild}} " +
      "[[Aspect ratio {{format}}.]]",
  },
  {
    key: "bild-einsatz",
    title: "Bild · Motiv zu einem Einsatz",
    kind: "IMAGE",
    subject: "MISSION",
    withIdentities: true,
    aspect: "16:9",
    purpose:
      "Motiv zu einem konkreten Auftritt, gefärbt von der Identität, unter der du dort aufgetreten bist. Für Ankündigung, Nachbericht und Social.",
    body:
      "A 1970s photograph of a conference hall shortly before it fills up, seen from the back " +
      "of the room at eye level. Rows of empty chairs, a lectern, a screen showing only light. " +
      "One detail says the talk is about to happen: a jacket over a chair, a glass of water set " +
      "down, cables taped to the floor. " +
      "[[The room has the character of {{einsatz.veranstaltung}} in {{einsatz.ort}}.]] " +
      "[[Objects on the lectern hint at the subject: {{identitaet.fokus}}.]] " +
      "Hard key light from a high window, a warm practical light at the lectern, deep shadows " +
      "between the rows. Muted palette. " +
      "[[One restrained accent colour: {{identitaet.farbe}}.]] " +
      "{{baustein.stil-depesche}} {{baustein.verbote-bild}} " +
      "[[Aspect ratio {{format}}.]]",
  },
  {
    key: "bild-briefing-thema",
    title: "Bild · Themenbild zu einem Briefing",
    kind: "IMAGE",
    subject: "TALK",
    withIdentities: true,
    aspect: "16:9",
    purpose:
      "Bild zu einem Vortragsthema — für die Briefing-Seite, das Speaker-Kit und Einreichungen.",
    body:
      "A 1970s still life on a workbench, photographed slightly from above. " +
      "[[It stands for a talk about: {{briefing.abstract}}]] " +
      "Choose real, tangible objects that carry the argument rather than illustrate the topic: " +
      "tools, filing systems, mechanical parts, labelled drawers, paper. One object is out of " +
      "place, and that is the point of the image. " +
      "[[Motifs may be drawn from: {{briefing.werkzeuge}}.]] " +
      "Hard key light from the left, warm fill, long shadows. Muted palette. " +
      "[[One restrained accent colour: {{identitaet.farbe}}.]] " +
      "{{baustein.stil-depesche}} {{baustein.verbote-bild}} " +
      "[[Aspect ratio {{format}}.]]",
  },
  {
    key: "bild-identitaet-umschlag",
    title: "Bild · Umschlag-Motiv einer Identität",
    kind: "IMAGE",
    subject: "IDENTITY",
    withIdentities: false,
    aspect: "4:5",
    purpose:
      "Das Umschlag-Motiv der Identitätsserie. Nur die Gegenstände und die Akzentfarbe wechseln, alles andere bleibt gleich, damit die Serie eine Serie bleibt.",
    body:
      "An opened manila envelope with its contents spilled out across the frame: a laminated " +
      "ID card, a folded dossier with visible but unreadable typing, a small brass key, a " +
      "handwritten note, a few paper clips. " +
      "[[The objects belong to the role „{{identitaet.rolle}}“ and its field: {{identitaet.fokus}}. " +
      "Replace two or three of the generic objects with things that role would actually carry.]] " +
      "[[One dominant accent colour, used sparingly: {{identitaet.farbe}}.]] " +
      "{{baustein.stil-akte}} {{baustein.verbote-bild}} " +
      "[[Aspect ratio {{format}}.]]",
  },
  {
    key: "bild-identitaet-portrait",
    title: "Bild · Gegenstands-Porträt einer Identität",
    kind: "IMAGE",
    subject: "IDENTITY",
    withIdentities: false,
    aspect: "1:1",
    purpose:
      "Die quadratische Kurzvariante zum Umschlag: ein Gegenstand, dieselbe Bildsprache. Gehört als Paar zum Umschlag-Motiv.",
    body:
      "A single hero object filling the square frame, the same surface and the same lighting as " +
      "the envelope series. " +
      "[[The object stands for the role „{{identitaet.rolle}}“ and its field: {{identitaet.fokus}}. " +
      "Pick the one object that role would reach for first.]] " +
      "[[One dominant accent colour: {{identitaet.farbe}}.]] " +
      "{{baustein.stil-akte}} {{baustein.verbote-bild}} " +
      "[[Aspect ratio {{format}}.]]",
  },
  {
    key: "bild-portrait-marke",
    title: "Bild · Porträt im Markenstil, ohne Identitätsbezug",
    kind: "IMAGE",
    subject: "NONE",
    withIdentities: false,
    aspect: "4:5",
    purpose:
      "Bild von dir im Markenstil, unabhängig von Identität, Einsatz oder Depesche. Für Profile, Referentenseiten und Pressetexte.",
    body:
      "Editorial portrait of a confident tech expert against a near-black background. Side " +
      "violet rim light, calm and intelligent gaze, modern reduced clothing, cinematic " +
      "lighting, fine grain. Upper body, centred, generous space above the head so the image " +
      "can be cropped square without losing the face. " +
      // Die gemeinsame Verbotsliste passt hier nicht: sie schließt Gesichter
      // aus, und genau darum geht es in einem Porträt. Die übrigen Verbote
      // gelten trotzdem und stehen deshalb ausgeschrieben.
      "No text or lettering, no logos or brand marks, no screens. " +
      "[[Aspect ratio {{format}}.]] " +
      "{{baustein.stil-marke}}\n\n" +
      "Hinweis für dich, nicht für den Bildgenerator: Für eine Personenmarke wirkt ein echtes " +
      "Foto stärker. Nutz diesen Prompt am besten als Stilvorgabe für Hintergrund, Licht und " +
      "Farbstimmung. Ein KI-erzeugtes Bild von dir gehört gekennzeichnet, Artikel 50 Absatz 2 " +
      "AI Act, und die Medienverwaltung hat dafür ein Feld.",
  },
  {
    key: "bild-startseite-hero",
    title: "Bild · Hero der Startseite",
    kind: "IMAGE",
    subject: "NONE",
    withIdentities: false,
    aspect: "4:5",
    purpose: "Das Markenbild der Startseite. Abstrakt, ohne Person, im Markenstil.",
    body:
      "A striking abstract brand image. Flowing lines of light and network nodes converge into " +
      "an elegant, suggested silhouette that connects people with intelligent systems. " +
      "Composed, focused, a great deal of depth and space. Nothing in the image is a device or " +
      "an interface. " +
      "[[Aspect ratio {{format}}.]] " +
      "{{baustein.stil-marke}} {{baustein.verbote-bild}}",
  },
  {
    key: "bild-folien-titel",
    title: "Bild · Titelfolie einer Präsentation",
    kind: "IMAGE",
    subject: "TALK",
    withIdentities: true,
    aspect: "16:9",
    purpose:
      "Hintergrund für die Titelfolie. Ruhige linke Hälfte, damit Titel und Name daraufpassen.",
    body:
      "A wide, quiet background image for the title slide of a talk. " +
      "[[The talk is about {{briefing.titel}}.]] " +
      "A single restrained motif in the right third, the left two thirds almost empty and " +
      "evenly dark so a title and a name stay readable on top. Deep space, a soft glow " +
      "off-centre, fine grid texture. Low contrast, nothing that competes with text. " +
      "[[One accent colour: {{identitaet.farbe}}.]] " +
      "{{baustein.stil-marke}} {{baustein.verbote-bild}} " +
      "[[Aspect ratio {{format}}.]]",
  },
  {
    key: "bild-folien-trenner",
    title: "Bild · Trennmotiv für Präsentationsfolien",
    kind: "IMAGE",
    subject: "TALK",
    withIdentities: true,
    aspect: "16:9",
    purpose:
      "Kapitelbild zwischen den Abschnitten eines Vortrags. Mitte frei, damit die Kapitelüberschrift sitzt.",
    body:
      "A quiet, wide background image for a section divider in a presentation. " +
      "[[The section belongs to a talk about {{briefing.titel}}.]] " +
      "Deep space, a soft radial glow off-centre, fine grid texture, a few flowing light lines " +
      "entering from one edge. Deliberately empty in the centre and the lower third so a " +
      "headline and a line of body text remain readable. Low contrast. " +
      "[[One accent colour: {{identitaet.farbe}}.]] " +
      "{{baustein.stil-marke}} {{baustein.verbote-bild}} " +
      "[[Aspect ratio {{format}}.]]",
  },
  {
    key: "bild-linkedin-schluessel",
    title: "Bild · Schlüsselbild für einen LinkedIn-Post",
    kind: "IMAGE",
    subject: "DISPATCH",
    withIdentities: false,
    aspect: "4:5",
    inputLabel: "Bildidee: welches Objekt oder welche Szene trägt den Post?",
    purpose:
      "Ein starkes Bild zum Post. Hochformat, weil es im Feed mehr Fläche bekommt als ein Querformat.",
    body:
      "A 1970s photograph in portrait orientation, composed for a social feed: the motif sits " +
      "in the lower two thirds, the upper third stays calm and even so a headline can be set " +
      "on top later. " +
      "[[The subject: {{eingabe}}.]] " +
      "[[It belongs to a piece about: {{depesche.titel}}.]] " +
      "Real materials, one deliberate deviation that carries the point. Hard key light, warm " +
      "practical light in frame, long shadows. Muted palette with one restrained accent. " +
      "{{baustein.stil-depesche}} {{baustein.verbote-bild}} " +
      "[[Aspect ratio {{format}}.]]",
  },
  {
    key: "bild-carousel-cover",
    title: "Bild · Cover für ein LinkedIn-Carousel",
    kind: "IMAGE",
    subject: "NONE",
    withIdentities: true,
    aspect: "4:5",
    inputLabel: "Worum geht die Serie? Ein Satz genügt.",
    purpose:
      "Deckblatt eines Dokument-Carousels. Bewusst textfrei — die Überschrift setzt du selbst, generierter Bildtext wird unsauber.",
    body:
      "A cover image for a document carousel, portrait orientation. " +
      "[[The series is about: {{eingabe}}.]] " +
      "A calm background with a subtle pattern of connected nodes, one restrained motif in the " +
      "lower third, the upper half deliberately empty so a short headline can be placed there " +
      "afterwards. The look has to work as the first slide of a series, so keep it simple " +
      "enough to repeat with a different motif. Generate no lettering at all. " +
      "[[One accent colour: {{identitaet.farbe}}.]] " +
      "{{baustein.stil-schaubild}} {{baustein.verbote-bild}} " +
      "[[Aspect ratio {{format}}.]]",
  },
  {
    key: "bild-schaubild",
    title: "Bild · Schaubild einer Architektur",
    kind: "IMAGE",
    subject: "NONE",
    withIdentities: false,
    aspect: "16:9",
    inputLabel: "Was soll das Schaubild zeigen? Ebenen, Beteiligte und Richtung des Flusses nennen.",
    purpose:
      "Erklärendes Schaubild für Vorträge und Carousels. Beschriftungen setzt du danach selbst, denn Bildmodelle setzen Schrift unzuverlässig.",
    body:
      "An isometric diagram, clean and technical. " +
      "[[It shows: {{eingabe}}.]] " +
      "Layers stacked from source data at the bottom through orchestration to the person at " +
      "the top, connected by clearly directed flows. Boxes are empty and evenly sized so " +
      "labels can be typed onto them afterwards — generate no lettering. Generic neutral " +
      "icons only. " +
      "{{baustein.stil-schaubild}} {{baustein.verbote-bild}} " +
      "[[Aspect ratio {{format}}.]]",
  },
  {
    key: "bild-teilen-karte",
    title: "Bild · Teilen-Karte für eine Depesche",
    kind: "IMAGE",
    subject: "DISPATCH",
    withIdentities: false,
    aspect: "1.91:1",
    purpose:
      "Das Bild, das beim Teilen in der Vorschau erscheint. Rechte Hälfte ruhig, damit die Überschrift lesbar bleibt.",
    body:
      "A wide preview image for a shared article link. " +
      "[[Subject: {{depesche.titel}}.]] " +
      "[[Themes: {{depesche.themen}}.]] " +
      "One strong motif on the left, the right half almost empty and evenly dark so an overlaid " +
      "headline stays readable at small sizes. Very calm composition, no small detail — this is " +
      "seen as a thumbnail. " +
      "{{baustein.stil-marke}} {{baustein.verbote-bild}} " +
      "[[Aspect ratio {{format}}.]]",
  },
  {
    key: "bild-buchcover",
    title: "Bild · Cover-Mockup einer Publikation",
    kind: "IMAGE",
    subject: "NONE",
    withIdentities: false,
    aspect: "2:3",
    inputLabel: "Worum geht das Buch oder der Kurs?",
    purpose:
      "Platzhalter-Cover für eine Publikation, solange das echte Cover fehlt. Bewusst ohne lesbaren Text.",
    body:
      "A minimalist book cover mockup, portrait orientation. " +
      "[[The book is about: {{eingabe}}.]] " +
      "Dark ground, a violet-to-magenta gradient, calm geometric shapes with a discreet " +
      "crosshair motif. A great deal of quiet, a clear composition, the title area left empty. " +
      "No legible text of any kind. " +
      "{{baustein.stil-marke}} {{baustein.verbote-bild}} " +
      "[[Aspect ratio {{format}}.]]",
  },
];

// ---------------------------------------------------------------------------
// Vorlagen · Text
// ---------------------------------------------------------------------------

const TEXT_TEMPLATES: DefaultTemplate[] = [
  {
    key: "text-depesche-bildidee",
    title: "Text · Bildidee zu einer Depesche finden",
    kind: "TEXT",
    subject: "DISPATCH",
    withIdentities: false,
    purpose:
      "Findet das Motiv, bevor du das Bild erzeugst. Ergebnis sind drei Vorschläge — den besten steckst du in die Bildvorlage „Hero einer Depesche“.",
    body:
      "Ich brauche eine Bildidee für das Aufmacherbild eines Artikels. Das Bild soll die " +
      "Spannung des Textes zeigen, nicht sein Thema illustrieren.\n\n" +
      "[[Titel: {{depesche.titel}}\n]]" +
      "[[Anriss: {{depesche.teaser}}\n]]" +
      "[[Themen: {{depesche.themen}}\n]]" +
      "[[\nText:\n{{depesche.text}}\n]]" +
      "\nSo funktionieren die Motive dieser Reihe: ein physisches Objekt oder eine " +
      "Werkstattszene, die die These trägt:\n\n" +
      "- These „Die Plattform hat die Runtime getauscht“ → drei Maschinenaggregate, eines hängt " +
      "am Kettenzug über einem leeren Rahmen\n" +
      "- These „Dasselbe Format läuft überall“ → dasselbe Blatt Papier in drei verschiedenen " +
      "Ablagesystemen\n" +
      "- These „Identität ja, Zugänge nein“ → ein leerer Ausweis im Licht, daneben im Schatten " +
      "ein Haufen Schlüssel\n" +
      "- These „Erst zählen, dann regeln“ → ein Lagerregal, links mit Anhängern ausgezeichnet, " +
      "rechts im Dunkeln ohne\n" +
      "- These „Werkzeug scheitert an der Hälfte der Fälle“ → ein Greifarm vor einer Konsole, " +
      "die halben Bedienfelder durch Blindplatten ersetzt\n\n" +
      "Gib mir drei Vorschläge. Zu jedem: die These des Artikels in einem Satz, das Motiv mit " +
      "Materialangaben, und die eine Abweichung im Bild, die die These trägt. Nichts Wörtliches " +
      "Kein Roboter für einen Agent, keine Glühbirne für eine Idee, keine Waage für Recht. " +
      "Keine Bildschirme, keine Gesichter, kein Text im Bild. Sag zu jedem Vorschlag in einem " +
      "Satz, warum er trägt, und welchen du selbst nehmen würdest.",
  },
  {
    key: "text-depesche-entwurf",
    title: "Text · Neue Depesche schreiben",
    kind: "TEXT",
    subject: "NONE",
    withIdentities: true,
    inputLabel: "Worum soll es gehen? Thema, Notizen, Links — alles, was du hast.",
    purpose:
      "Der große Prompt für einen neuen Artikel: Format, Aufbau, Stimme und Recherchedisziplin sind schon drin.",
    body:
      "Schreib einen Artikel für meine Website.\n\n" +
      "[[Thema und Material:\n{{eingabe}}\n]]" +
      "[[\nIch schreibe als {{identitaet}}.]]" +
      "[[ Mein Feld dabei: {{identitaet.fokus}}.\n]]" +
      "\nWähl zuerst das Format und begründe die Wahl in einem Satz:\n" +
      "- Meldung, 400 bis 700 Wörter: ein Fakt, eine Einordnung. Release, Preisänderung, Datum.\n" +
      "- Einordnung, 900 bis 1400 Wörter: etwas hat sich geändert, was heißt das, welche " +
      "Position nehme ich ein.\n" +
      "- Nachschlagewerk, 900 bis 1400 Wörter: wird gepflegt statt archiviert. Kostenmodelle, " +
      "Fristen, Checklisten.\n" +
      "- Backstage, 800 bis 1200 Wörter: wie ich arbeite, warum ich Dinge so mache, was schiefging.\n\n" +
      "Dann den Text. Zwischenüberschriften als Aussagen oder Fragen. Ein Abschnitt heißt " +
      "„Was ich noch nicht beurteilen kann“, wenn es etwas gibt, das ich nicht beurteilen kann. Das ist " +
      "das ist kein Schwächezeichen, sondern Teil der Haltung.\n\n" +
      "Gib mir am Schluss getrennt: einen Titel und zwei Alternativtitel, einen Anriss von zwei " +
      "bis drei Sätzen, einen Slug, und die Quellenliste als einfache Aufzählung mit Links.\n\n" +
      "{{baustein.stimme}}\n\n{{baustein.fachbegriffe}}\n\n{{baustein.quellen}}\n\n{{baustein.ki-marker}}",
  },
  {
    key: "text-depesche-linkedin",
    title: "Text · LinkedIn-Post zu einer Depesche",
    kind: "TEXT",
    subject: "DISPATCH",
    withIdentities: true,
    purpose:
      "Ein Post, der auf den Artikel führt. Alle Daten der Depesche stecken schon drin.",
    body:
      "Schreib einen LinkedIn-Post zu meinem folgenden Artikel.\n\n" +
      "[[Titel: {{depesche.titel}}\n]]" +
      "[[Format: {{depesche.art}}\n]]" +
      "[[Anriss: {{depesche.teaser}}\n]]" +
      "[[Themen: {{depesche.themen}}\n]]" +
      "[[Quelle: {{depesche.quelle}}\n]]" +
      "[[Link: {{depesche.url}}\n]]" +
      "[[Ich schreibe hier als {{identitaet}}.\n]]" +
      "[[\nVolltext:\n{{depesche.text}}\n]]" +
      "\nLänge 900 bis 1300 Zeichen. Erste Zeile ist der Haken und steht allein. Danach ein " +
      "Absatz, der die These benennt, zwei bis drei kurze Absätze mit dem, was praktisch daraus " +
      "folgt, und am Schluss meine Einordnung. Den Link gibst du getrennt aus, er kommt in den " +
      "ersten Kommentar.\n\n" +
      "{{baustein.linkedin-regeln}}\n\n{{baustein.stimme}}\n\n{{baustein.ki-marker}}",
  },
  {
    key: "text-depesche-serie",
    title: "Text · LinkedIn-Serie zu einer Depesche",
    kind: "TEXT",
    subject: "DISPATCH",
    withIdentities: true,
    purpose:
      "Mehrere Posts aus einem Artikel, mit Reihenfolge und Abstand. Für Themen, die für einen Post zu groß sind.",
    body:
      "Mach aus meinem Artikel eine LinkedIn-Serie.\n\n" +
      "[[Titel: {{depesche.titel}}\n]]" +
      "[[Anriss: {{depesche.teaser}}\n]]" +
      "[[Themen: {{depesche.themen}}\n]]" +
      "[[Link: {{depesche.url}}\n]]" +
      "[[Ich schreibe als {{identitaet}}.\n]]" +
      "[[\nVolltext:\n{{depesche.text}}\n]]" +
      "\nSag mir zuerst, wie viele Posts das Thema trägt, zwischen zwei und fünf, und begründe " +
      "die Zahl. Lieber drei gute als fünf gestreckte. Dann je Post: die Kernaussage in einem " +
      "Satz, der fertige Text, das empfohlene Format (Text-Post, Dokument-Carousel oder " +
      "Video-Thumbnail) und der Übergang zum nächsten. Zum Schluss ein Zeitplan mit zwei bis " +
      "vier Tagen Abstand, Dienstag bis Donnerstag vormittags, damit die Posts sich nicht " +
      "gegenseitig die Reichweite nehmen.\n\n" +
      "{{baustein.linkedin-regeln}}\n\n{{baustein.stimme}}\n\n{{baustein.ki-marker}}",
  },
  {
    key: "text-depesche-teaser",
    title: "Text · Anriss und Meta-Angaben einer Depesche",
    kind: "TEXT",
    subject: "DISPATCH",
    withIdentities: false,
    purpose:
      "Die kurzen Felder, die immer am Schluss fehlen: Anriss, Meta-Beschreibung, Teilen-Text.",
    body:
      "Ich brauche die kurzen Begleittexte zu meinem Artikel.\n\n" +
      "[[Titel: {{depesche.titel}}\n]]" +
      "[[Bisheriger Anriss: {{depesche.teaser}}\n]]" +
      "[[\nText:\n{{depesche.text}}\n]]" +
      "\nGib mir getrennt und jeweils in der geforderten Länge:\n" +
      "1. Anriss für die Übersichtsseite, zwei bis drei Sätze, höchstens 600 Zeichen. Er sagt, " +
      "was drinsteht, nicht dass es spannend ist.\n" +
      "2. Meta-Beschreibung für Suchmaschinen, höchstens 155 Zeichen, mit dem Begriff, unter dem " +
      "jemand danach sucht.\n" +
      "3. Teilen-Text für ein Netzwerk, höchstens 280 Zeichen, ohne Hashtags.\n" +
      "4. Drei Titelvarianten, falls der jetzige zu brav ist.\n\n" +
      "{{baustein.stimme}}\n\n{{baustein.ki-marker}}",
  },
  {
    key: "text-depesche-metadaten",
    title: "Text · Einordnung einer Depesche vorschlagen",
    kind: "TEXT",
    subject: "DISPATCH",
    withIdentities: false,
    purpose:
      "Hilft beim Zuordnen: Format, Identitäten, Fachgebiete und Radar-Themen — mit Begründung statt Bauchgefühl.",
    body:
      "Ordne meinen Artikel in die Struktur meiner Website ein.\n\n" +
      "[[Titel: {{depesche.titel}}\n]]" +
      "[[Bisheriges Format: {{depesche.art}}\n]]" +
      "[[Bisherige Themen: {{depesche.themen}}\n]]" +
      "[[\nText:\n{{depesche.text}}\n]]" +
      "\nSchlag vor, jeweils mit einem Satz Begründung:\n" +
      "1. Format: Meldung, Einordnung, Nachschlagewerk oder Backstage.\n" +
      "2. Ein bis zwei Identitäten. Fünf nur bei Texten über die Marke selbst. Die erste " +
      "bestimmt die Akzentfarbe der Karte.\n" +
      "3. Fachgebiete, das sind Werkzeuge und Produkte. Passt keins der vorhandenen, schlag " +
      "ein neues vor und markier es als neu.\n" +
      "4. Radar-Themen, das sind Dinge, mit denen ich mich gerade beschäftige, keine " +
      "Produktnamen. Sparsam: ein Radar mit zwanzig Punkten sagt nichts mehr.\n" +
      "5. Die eine Primärquelle, auf der der Text aufbaut, als kuratierter Fund.\n\n" +
      "Wenn der Text für keine bestehende Kategorie passt, sag das, statt ihn hineinzuzwingen.",
  },
  {
    key: "text-depesche-englisch",
    title: "Text · Englische Fassung einer Depesche",
    kind: "TEXT",
    subject: "DISPATCH",
    withIdentities: false,
    purpose:
      "Neu schreiben statt Wort für Wort übertragen. Das Ergebnis ist ein Entwurf und wird nie ungeprüft veröffentlicht.",
    body:
      "Schreib die englische Fassung meines Artikels. Neu schreiben, nicht Wort für Wort " +
      "übertragen: dieselbe Haltung, derselbe Aufbau, eigene Formulierungen.\n\n" +
      "[[Titel: {{depesche.titel}}\n]]" +
      "[[Anriss: {{depesche.teaser}}\n]]" +
      "[[\nText:\n{{depesche.text}}\n]]" +
      "\nVorgaben: britische Schreibung wegen des EU-Kontexts: organisation, recognise, " +
      "behaviour, licence als Substantiv. Die Decknamen der Identitäten bleiben deutsch, mit " +
      "einer knappen Glosse dahinter. Wortspiele auflöst du, statt sie zu ersetzen. Deutsche " +
      "Rechtsbegriffe erklärst du, statt sie wörtlich zu übersetzen: Bestandsschutz wird " +
      "grandfathering, Justiziariat wird legal department. Interne Links auf /en/ umstellen, " +
      "die Slugs bleiben.\n\n" +
      "Gib Titel, Slug, Anriss und Text getrennt aus. Was du nicht sicher übertragen kannst, " +
      "markierst du mit [prüfen].\n\n{{baustein.fachbegriffe}}",
  },
  {
    key: "text-einsatz-ankuendigung",
    title: "Text · Ankündigung eines Einsatzes",
    kind: "TEXT",
    subject: "MISSION",
    withIdentities: true,
    purpose: "Post, der einen bevorstehenden Auftritt ankündigt. Alle Eckdaten sind schon drin.",
    body:
      "Schreib eine Ankündigung für meinen bevorstehenden Auftritt.\n\n" +
      "[[Veranstaltung: {{einsatz.veranstaltung}}\n]]" +
      "[[Ort: {{einsatz.ort}}\n]]" +
      "[[Datum: {{einsatz.datum}}\n]]" +
      "[[Art: {{einsatz.art}}\n]]" +
      "[[Sprache: {{einsatz.sprache}}\n]]" +
      "[[Dauer: {{einsatz.dauer}} Minuten\n]]" +
      "[[Titel des Vortrags: {{einsatz.briefing}}\n]]" +
      "[[Link: {{einsatz.url}}\n]]" +
      "[[Ich trete dort auf als {{identitaet}}.\n]]" +
      "[[\nWorum es in dem Vortrag geht:\n{{einsatz.vortragstext}}\n]]" +
      "[[\nÜber die Veranstaltung:\n{{einsatz.beschreibung}}\n]]" +
      "\nHöchstens 900 Zeichen. Sag, was die Zuhörenden mitnehmen, nicht wie sehr ich mich " +
      "freue. Eine konkrete Einladung am Schluss. Kein Countdown, keine Vorfreude-Floskeln, " +
      "kein „Ich freue mich, bekannt zu geben“.\n\n" +
      "{{baustein.linkedin-regeln}}\n\n{{baustein.stimme}}\n\n{{baustein.ki-marker}}",
  },
  {
    key: "text-einsatz-nachbericht",
    title: "Text · Nachbericht zu einem Einsatz",
    kind: "TEXT",
    subject: "MISSION",
    withIdentities: true,
    inputLabel: "Was ist tatsächlich passiert? Fragen aus dem Publikum, Gespräche danach, was überrascht hat.",
    purpose:
      "Entwurf für den Rückblick — als Grundlage für das Feld „Nachbericht“ am Einsatz. Ohne deine Beobachtungen wird das nichts, deshalb das Eingabefeld.",
    body:
      "Schreib einen Nachbericht zu meinem Auftritt.\n\n" +
      "[[Veranstaltung: {{einsatz.veranstaltung}}\n]]" +
      "[[Ort: {{einsatz.ort}}\n]]" +
      "[[Datum: {{einsatz.datum}}\n]]" +
      "[[Vortrag: {{einsatz.briefing}}\n]]" +
      "[[Publikum: rund {{einsatz.publikum}} Personen\n]]" +
      "[[Ich war dort {{identitaet}}.\n]]" +
      "[[\nWorum es ging:\n{{einsatz.vortragstext}}\n]]" +
      "[[\nMeine Notizen von vor Ort:\n{{eingabe}}\n]]" +
      "\nDrei bis fünf Absätze. Erster Absatz: die eine Frage, die im Raum stand. Dann was " +
      "hängen geblieben ist: zwei bis drei konkrete Beobachtungen aus den Gesprächen danach, " +
      "keine Aufzählung von Programmpunkten. Letzter Absatz: was ich daraus mitnehme.\n\n" +
      "Nimm nur, was in meinen Notizen steht. Erfinde keine Reaktionen, keine Zahlen und keine " +
      "Zitate; wo dir etwas fehlt, schreib [ergänzen].\n\n{{baustein.stimme}}\n\n{{baustein.ki-marker}}",
  },
  {
    key: "text-einsatz-linkedin",
    title: "Text · Post von der Bühne",
    kind: "TEXT",
    subject: "MISSION",
    withIdentities: true,
    inputLabel: "Was war der Moment? Eine Frage, eine Szene, ein Satz aus dem Publikum.",
    purpose:
      "Der kurze Post direkt nach dem Auftritt. Lebt von einer konkreten Szene, nicht von der Veranstaltungsmeldung.",
    body:
      "Schreib einen kurzen LinkedIn-Post von meinem Auftritt.\n\n" +
      "[[Veranstaltung: {{einsatz.veranstaltung}}\n]]" +
      "[[Ort: {{einsatz.ort}}\n]]" +
      "[[Datum: {{einsatz.datum}}\n]]" +
      "[[Vortrag: {{einsatz.briefing}}\n]]" +
      "[[Ich war dort {{identitaet}}.\n]]" +
      "[[\nDer Moment:\n{{eingabe}}\n]]" +
      "\nHöchstens 700 Zeichen. Die Szene steht am Anfang, nicht der Veranstaltungsname. Eine " +
      "fachliche Erkenntnis in der Mitte, damit der Post mehr ist als ein Bühnenfoto mit " +
      "Bildunterschrift. Kein Dank an die Veranstalter als Hauptinhalt, höchstens ein " +
      "Nebensatz.\n\n" +
      "{{baustein.linkedin-regeln}}\n\n{{baustein.stimme}}\n\n{{baustein.ki-marker}}",
  },
  {
    key: "text-einsatz-folien",
    title: "Text · Foliengerüst für einen konkreten Einsatz",
    kind: "TEXT",
    subject: "MISSION",
    withIdentities: true,
    purpose:
      "Wie das Foliengerüst zum Briefing, aber zugeschnitten auf diese Veranstaltung, ihr Publikum und die tatsächliche Länge.",
    body:
      "Entwirf das Foliengerüst für meinen Vortrag bei einer bestimmten Veranstaltung.\n\n" +
      "[[Veranstaltung: {{einsatz.veranstaltung}}\n]]" +
      "[[Ort: {{einsatz.ort}}\n]]" +
      "[[Datum: {{einsatz.datum}}\n]]" +
      "[[Art: {{einsatz.art}}\n]]" +
      "[[Sprache: {{einsatz.sprache}}\n]]" +
      "[[Dauer: {{einsatz.dauer}} Minuten\n]]" +
      "[[Publikum: rund {{einsatz.publikum}} Personen\n]]" +
      "[[Vortrag: {{einsatz.briefing}}\n]]" +
      "[[Ich trete auf als {{identitaet}}.\n]]" +
      "[[\nÜber die Veranstaltung:\n{{einsatz.beschreibung}}\n]]" +
      "[[\nWorum es im Vortrag geht:\n{{einsatz.vortragstext}}\n]]" +
      "\nGib je Folie aus: Nummer, Titel, höchstens fünf Stichpunkte und eine Sprechernotiz von " +
      "zwei bis drei Sätzen. Rechne mit etwa einer Folie pro anderthalb Minuten. Richte " +
      "Beispiele und Tonfall am genannten Publikum aus. Sag am Schluss, welche Folien zuerst " +
      "wegfallen, wenn die Zeit knapp wird, und an welcher Stelle die Demo sitzt.\n\n" +
      "Keine Agenda-Folie, keine Vorstellungsfolie am Anfang.\n\n{{baustein.fachbegriffe}}\n\n{{baustein.stimme}}",
  },
  {
    key: "text-briefing-folien",
    title: "Text · Foliengerüst für ein Briefing",
    kind: "TEXT",
    subject: "TALK",
    withIdentities: true,
    purpose:
      "Die Folienabfolge zu einem Vortragsthema, mit Sprechernotizen. Lässt sich direkt in PowerPoint oder in den Deck-Skill übertragen.",
    body:
      "Entwirf das Foliengerüst für meinen Vortrag.\n\n" +
      "[[Titel: {{briefing.titel}}\n]]" +
      "[[Dauer: {{briefing.dauer}} Minuten\n]]" +
      "[[Niveaustufe: {{briefing.stufe}} (100 Überblick bis 400 tief)\n]]" +
      "[[Zielgruppen: {{briefing.zielgruppen}}\n]]" +
      "[[Werkzeuge, die vorkommen: {{briefing.werkzeuge}}\n]]" +
      "[[Bisher gehalten: {{briefing.einsaetze}}-mal\n]]" +
      "[[Ich halte ihn als {{identitaet}}.\n]]" +
      "[[\nAbstract:\n{{briefing.abstract}}\n]]" +
      "\nGib je Folie aus: Nummer, Titel, höchstens fünf Stichpunkte, Sprechernotiz von zwei bis " +
      "drei Sätzen und, wo es hilft, einen Vorschlag für Demo oder Grafik. Rechne mit etwa " +
      "einer Folie pro anderthalb Minuten.\n\n" +
      "Aufbau: Einstieg mit einem echten Problem, Einordnung, Kern mit Demo, Grenzen und " +
      "Stolperfallen, ein Handlungsschritt für morgen. Keine Agenda-Folie, keine " +
      "Vorstellungsfolie am Anfang. Nenn zu jeder Aussage, die eine Zahl braucht, welche Zahl " +
      "ich nachtragen muss.\n\n{{baustein.fachbegriffe}}\n\n{{baustein.stimme}}",
  },
  {
    key: "text-briefing-einreichung",
    title: "Text · Einreichung eines Briefings (Call for Papers)",
    kind: "TEXT",
    subject: "TALK",
    withIdentities: true,
    inputLabel: "Für welche Konferenz? Name, Publikum, Schwerpunkt des Calls, soweit du es weißt.",
    purpose:
      "Alle Daten eines Briefings in einem Prompt, um daraus eine Einreichung für Veranstalter zu machen.",
    body:
      "Mach aus meinem Vortragsangebot eine Einreichung für einen Call for Papers.\n\n" +
      "[[Titel: {{briefing.titel}}\n]]" +
      "[[Titel (Englisch): {{briefing.titel_en}}\n]]" +
      "[[Kategorie: {{briefing.kategorie}}\n]]" +
      "[[Niveaustufe: {{briefing.stufe}}\n]]" +
      "[[Dauer: {{briefing.dauer}} Minuten\n]]" +
      "[[Zielgruppen: {{briefing.zielgruppen}}\n]]" +
      "[[Werkzeuge: {{briefing.werkzeuge}}\n]]" +
      "[[Bisher gehalten: {{briefing.einsaetze}}-mal\n]]" +
      "[[Ich reiche ein als {{identitaet}}.\n]]" +
      "[[\nAbstract:\n{{briefing.abstract}}\n]]" +
      "[[\nDie Konferenz:\n{{eingabe}}\n]]" +
      "\nGib aus: einen Titel und zwei Alternativtitel, einen Abstract von rund 1200 Zeichen, " +
      "drei bis fünf Lernziele als Aufzählung, eine Sprecherbio von 400 Zeichen und drei Sätze " +
      "dazu, warum genau dieser Vortrag auf genau diese Konferenz passt. Wenn ich die Konferenz " +
      "nicht genannt habe, lass die letzte Stelle offen statt sie zu erfinden.\n\n" +
      "{{baustein.fachbegriffe}}\n\n{{baustein.stimme}}\n\n{{baustein.ki-marker}}",
  },
  {
    key: "text-briefing-englisch",
    title: "Text · Englische Fassung eines Briefings",
    kind: "TEXT",
    subject: "TALK",
    withIdentities: false,
    purpose: "Titel und Abstract auf Englisch, für internationale Einreichungen und die EN-Seite.",
    body:
      "Schreib die englische Fassung meines Vortragsangebots. Neu formulieren, nicht Wort für " +
      "Wort übertragen.\n\n" +
      "[[Titel: {{briefing.titel}}\n]]" +
      "[[Bisheriger englischer Titel: {{briefing.titel_en}}\n]]" +
      "[[Kategorie: {{briefing.kategorie}}\n]]" +
      "[[Zielgruppen: {{briefing.zielgruppen}}\n]]" +
      "[[\nAbstract:\n{{briefing.abstract}}\n]]" +
      "\nBritische Schreibung. Gib Titel, zwei Alternativtitel und den Abstract getrennt aus. " +
      "Der englische Titel darf eigenständig sein, wenn die wörtliche Übertragung hölzern " +
      "klingt. Sag mir dann, wie du ihn verstanden hast.\n\n{{baustein.fachbegriffe}}",
  },
  {
    key: "text-briefing-carousel",
    title: "Text · Dokument-Carousel zu einem Briefing",
    kind: "TEXT",
    subject: "TALK",
    withIdentities: true,
    purpose:
      "Aus einem Vortragsthema ein LinkedIn-Carousel machen. Für How-tos, Vergleiche und Schrittfolgen — das Format mit der besten Verweildauer.",
    body:
      "Mach aus meinem Vortragsthema ein Dokument-Carousel für LinkedIn.\n\n" +
      "[[Titel: {{briefing.titel}}\n]]" +
      "[[Zielgruppen: {{briefing.zielgruppen}}\n]]" +
      "[[Werkzeuge: {{briefing.werkzeuge}}\n]]" +
      "[[Ich schreibe als {{identitaet}}.\n]]" +
      "[[\nAbstract:\n{{briefing.abstract}}\n]]" +
      "\nAcht bis zwölf Slides im Hochformat. Je Slide: eine Überschrift von höchstens sechs " +
      "Wörtern und höchstens 25 Wörter Text. Slide 1 ist der Haken, Slide 2 sagt, was drin " +
      "steckt, die mittleren tragen je einen Gedanken, die letzte hat eine Haltung und einen " +
      "Grund zu kommentieren.\n\n" +
      "Dazu: den Begleittext für den Post selbst, 600 bis 900 Zeichen, der nicht wiederholt, " +
      "was auf den Slides steht.\n\n" +
      "{{baustein.linkedin-regeln}}\n\n{{baustein.stimme}}\n\n{{baustein.ki-marker}}",
  },
  {
    key: "text-identitaet-vorstellung",
    title: "Text · Eine Identität vorstellen",
    kind: "TEXT",
    subject: "IDENTITY",
    withIdentities: false,
    purpose:
      "Post oder Seitentext, der eine Identität erklärt, ohne dass es nach Selbstbeschreibung klingt.",
    body:
      "Schreib einen Text, der eine meiner Identitäten vorstellt.\n\n" +
      "[[Deckname: {{identitaet.deckname}}\n]]" +
      "[[Rolle: {{identitaet.rolle}}\n]]" +
      "[[Einzeiler: {{identitaet.tagline}}\n]]" +
      "[[Fachgebiete: {{identitaet.fokus}}\n]]" +
      "[[Werkzeuge: {{identitaet.werkzeuge}}\n]]" +
      "[[\nBisherige Beschreibung:\n{{identitaet.beschreibung}}\n]]" +
      "\nZwei Fassungen: eine für LinkedIn mit höchstens 900 Zeichen und eine für die " +
      "Identitätsseite mit drei bis vier Absätzen.\n\n" +
      "Die Identität ist eine Rolle, keine Verkleidung: Sie steht für ein Feld, in dem ich " +
      "arbeite, und für eine Art, an Probleme heranzugehen. Beginn mit einer konkreten " +
      "Situation, in der genau diese Rolle gebraucht wird, nicht mit dem Decknamen. Sag, wofür " +
      "sie nicht zuständig ist; das schärft mehr als eine weitere Aufzählung.\n\n" +
      "{{baustein.stimme}}\n\n{{baustein.ki-marker}}",
  },
  {
    key: "text-speaker-bio",
    title: "Text · Sprecherbio in drei Längen",
    kind: "TEXT",
    subject: "IDENTITY",
    withIdentities: false,
    inputLabel: "Was soll unbedingt vorkommen? Auszeichnungen, Bücher, aktueller Schwerpunkt.",
    purpose:
      "Die drei Bios, die Veranstalter verlangen — kurz, mittel, lang. In der dritten Person, weil Programme sie so übernehmen.",
    body:
      "Schreib meine Sprecherbio in drei Längen: 400, 900 und 1800 Zeichen.\n\n" +
      "[[Rolle: {{identitaet.rolle}}\n]]" +
      "[[Fachgebiete: {{identitaet.fokus}}\n]]" +
      "[[\nKurzbio bisher:\n{{identitaet.kurzbio}}\n]]" +
      "[[\nWas vorkommen soll:\n{{eingabe}}\n]]" +
      "\nDritte Person, weil Veranstalter Bios so übernehmen. Keine Aufzählung von " +
      "Zertifikaten, sondern eine Linie: was ich mache, warum ich es so mache, was daraus für " +
      "das Publikum folgt. Die lange Fassung darf eine Haltung haben, die kurze muss vor allem " +
      "in ein Programmheft passen.\n\n" +
      "Erfinde nichts dazu. Wo dir eine Angabe fehlt, die eine Bio üblicherweise hat, schreib " +
      "[ergänzen] statt einer Behauptung.\n\n{{baustein.fachbegriffe}}\n\n{{baustein.ki-marker}}",
  },
  {
    key: "text-alternativtext",
    title: "Text · Alternativtexte für ein Bild",
    kind: "TEXT",
    subject: "NONE",
    withIdentities: false,
    inputLabel: "Was ist auf dem Bild zu sehen? Oder lass es leer und häng das Bild im Chat an.",
    purpose:
      "Für hochgeladene Bilder: beide Sprachfassungen, mit den Regeln, die einen guten Alternativtext ausmachen.",
    body:
      "Schreib mir Alternativtexte zu einem Bild, auf Deutsch und auf Englisch.\n\n" +
      "[[Das Bild zeigt:\n{{eingabe}}\n]]" +
      "\nHöchstens 125 Zeichen je Sprache. Beschreib, was zu sehen ist, nicht was es bedeutet " +
      "und nicht, wie das Bild gemacht wurde. Kein „Bild von“, kein „Symbolbild für“, kein " +
      "„Darstellung von“. Steht im Bild Text, gehört er in den Alternativtext.\n\n" +
      "Gut: „Drei unterschiedliche Maschinenaggregate in einer Werkstatt, eines hängt zum " +
      "Austausch an einem Kettenzug über einem leeren Rahmen.“\n" +
      "Schlecht: „Symbolbild für den Wechsel der Plattform-Runtime.“\n\n" +
      "Ist das Bild rein dekorativ, sag mir das, statt einen Text zu erfinden.",
  },
];

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [...IMAGE_TEMPLATES, ...TEXT_TEMPLATES];
