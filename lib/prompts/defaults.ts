// Der mitgelieferte Standardsatz: Bausteine und Vorlagen, die beim ersten
// Aufruf der Werkstatt per Knopfdruck in die Datenbank wandern. Danach sind es
// ganz normale Einträge — änderbar, löschbar, ergänzbar. Der Code hält nur die
// Startaufstellung, nicht die Wahrheit.
//
// Die Bildvorlagen führen den Stil aus `docs/BILDPROMPTS.md` fort; der
// Stil-Baustein steht deshalb genau einmal hier und wird überall angehängt.
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
}

export const DEFAULT_SNIPPETS: DefaultSnippet[] = [
  {
    key: "stil",
    title: "Stil-Baustein (Bild)",
    note: "Hängt an jedem Bildprompt. Änderst du ihn hier, ändert sich die ganze Bildserie.",
    body:
      "Style: dark, refined editorial-tech aesthetic. Near-black background (#05010D) with " +
      "violet (#8B5CF6) and magenta (#E879F9) accents and a hint of signal blue (#38BDF8). " +
      "Fine grid texture and a soft radial glow. Restrained, high-end, cinematic — " +
      '"secret agent meets Microsoft AI". Clear, elegant, never cluttered. ' +
      "No text, no logos, no brand marks, no watermarks. Very high resolution.",
  },
  {
    key: "keine-marken",
    title: "Keine fremden Marken",
    note: "Für Motive, die nach Software aussehen sollen, ohne es zu sein.",
    body:
      "Do not depict any real product logos, brand marks, or recognizable user interfaces " +
      "of existing software. Abstract shapes and generic UI elements only.",
  },
  {
    key: "kein-gesicht",
    title: "Kein Gesicht",
    note: "Regel der Identitätsserie: die Identität ist die Rolle, nicht die Person.",
    body: "No visible faces, no legible text. The role is shown through objects and light, not through a person.",
  },
  {
    key: "stimme",
    title: "Stimme (Text)",
    note: "Hängt an jedem Textprompt und beschreibt, wie das Ergebnis klingen soll.",
    body:
      "Schreib in der Stimme von {{person}} („{{marke}}“): klar, konkret, ohne Werbesprache, " +
      "ohne Superlative, ohne Emoji-Gewitter. Kurze Sätze. Fachbegriffe bleiben stehen und " +
      "werden im Nebensatz erklärt. Keine erfundenen Zahlen, keine erfundenen Zitate. " +
      "Wenn eine Angabe fehlt, lass die Stelle weg, statt sie zu erfinden.",
  },
];

export const DEFAULT_TEMPLATES: DefaultTemplate[] = [
  // --- Bild ---------------------------------------------------------------
  {
    key: "bild-einsatz-identitaet",
    title: "Bild · Einsatz unter einer Identität",
    kind: "IMAGE",
    subject: "MISSION",
    withIdentities: true,
    aspect: "16:9",
    purpose:
      "Motiv zu einem konkreten Auftritt, gefärbt von der Identität, unter der du dort aufgetreten bist. Für Ankündigung, Nachbericht und Social.",
    body:
      "A cinematic editorial photograph of a conference stage moment, seen from behind and " +
      "slightly above: a speaker's silhouette against a large, softly glowing screen, the " +
      "audience only as a dark field of light points. " +
      "[[The setting evokes {{einsatz.veranstaltung}} in {{einsatz.ort}}]][[, {{einsatz.datum}}]]. " +
      "[[The talk is about {{einsatz.briefing}}.]] " +
      "[[The visual field of the role \"{{identitaet.rolle}}\" shapes the imagery: {{identitaet.fokus}}.]] " +
      "[[One dominant accent color: {{identitaet.farbe}}.]] " +
      "Shallow depth of field, volumetric light, analog film grain, 35mm. " +
      "{{baustein.kein-gesicht}} {{baustein.keine-marken}} " +
      "[[Aspect ratio {{format}}.]]\n\n{{baustein.stil}}",
  },
  {
    key: "bild-briefing-identitaet",
    title: "Bild · Briefing unter einer Identität",
    kind: "IMAGE",
    subject: "TALK",
    withIdentities: true,
    aspect: "16:9",
    purpose:
      "Themenbild zu einem Briefing — für die Briefing-Seite, das Speaker-Kit und Einreichungen.",
    body:
      "An abstract editorial illustration for a conference talk[[ titled \"{{briefing.titel}}\"]]. " +
      "[[It visualizes: {{briefing.abstract}}]] " +
      "Flowing light lines, nodes and quiet geometric structures suggest the subject without " +
      "illustrating it literally. Sense of flow and control, depth and space. " +
      "[[One dominant accent color: {{identitaet.farbe}}.]] " +
      "[[Motifs drawn from: {{identitaet.fokus}}.]] " +
      "{{baustein.keine-marken}} " +
      "[[Aspect ratio {{format}}.]]\n\n{{baustein.stil}}",
  },
  {
    key: "bild-depesche-hero",
    title: "Bild · Hero einer Depesche",
    kind: "IMAGE",
    subject: "DISPATCH",
    withIdentities: true,
    aspect: "16:9",
    purpose: "Aufmacherbild für eine bestimmte Depesche, aus deren Titel und Themen gebaut.",
    body:
      "A striking abstract hero image for an editorial article[[ titled \"{{depesche.titel}}\"]]. " +
      "[[The article is about: {{depesche.teaser}}]] " +
      "[[Recurring motifs: {{depesche.themen}}.]] " +
      "Translate the subject into light, structure and material — never into charts, screenshots " +
      "or written words. Generous negative space on the left third, so a headline can sit there. " +
      "[[One dominant accent color: {{identitaet.farbe}}.]] " +
      "{{baustein.keine-marken}} " +
      "[[Aspect ratio {{format}}.]]\n\n{{baustein.stil}}",
  },
  {
    key: "bild-portrait-marke",
    title: "Bild · Porträt im Stil der Website, ohne Identitätsbezug",
    kind: "IMAGE",
    subject: "NONE",
    withIdentities: false,
    aspect: "4:5",
    purpose:
      "Bild von dir im Markenstil, unabhängig von Identität, Einsatz oder Depesche. Für Profile, Referentenseiten und Pressetexte.",
    body:
      "Editorial portrait of a confident tech expert against a near-black background. " +
      "Side violet rim light, calm and intelligent gaze, modern reduced clothing, cinematic " +
      "lighting, fine grain, refined. Upper body, centered, generous space above the head. " +
      "[[Aspect ratio {{format}}.]]\n\n{{baustein.stil}}\n\n" +
      "Hinweis für dich, nicht für den Bildgenerator: Für eine Personenmarke wirkt ein echtes " +
      "Foto stärker. Nutz diesen Prompt am besten als Stilvorgabe für Hintergrund, Licht und " +
      "Farbstimmung — und kennzeichne ein KI-erzeugtes Bild von dir als solches.",
  },
  {
    key: "bild-identitaet-umschlag",
    title: "Bild · Umschlag-Motiv einer Identität",
    kind: "IMAGE",
    subject: "IDENTITY",
    withIdentities: false,
    aspect: "4:5",
    purpose:
      "Das Umschlag-Motiv der Identitätsserie. Nur die Gegenstände und die Akzentfarbe wechseln — alles andere bleibt gleich, damit die Serie eine Serie bleibt.",
    body:
      "A cinematic still-life photograph, top-down flat lay on a dark matte surface. " +
      "An opened manila envelope with its contents spilled out: a laminated ID badge, a folded " +
      "dossier with visible but unreadable text, a small brass key and a handwritten note. " +
      "[[The objects relate to the role \"{{identitaet.rolle}}\": {{identitaet.fokus}}.]] " +
      "[[Muted color grading, one dominant accent color: {{identitaet.farbe}}.]] " +
      "Hard directional light from the upper left, deep shadows, shallow depth of field. " +
      "Analog film grain, 35mm. Editorial photography, understated, not glossy. " +
      "{{baustein.kein-gesicht}} {{baustein.keine-marken}} " +
      "[[Aspect ratio {{format}}.]]\n\n{{baustein.stil}}",
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
      "Same style and lighting as the envelope series. A single hero object filling the square " +
      "frame on the same dark matte surface. " +
      "[[The object stands for the role \"{{identitaet.rolle}}\": {{identitaet.fokus}}.]] " +
      "[[One dominant accent color: {{identitaet.farbe}}.]] " +
      "Hard directional light from the upper left, deep shadows, analog film grain, 35mm. " +
      "{{baustein.kein-gesicht}} {{baustein.keine-marken}} " +
      "[[Aspect ratio {{format}}.]]\n\n{{baustein.stil}}",
  },
  {
    key: "bild-folien-hintergrund",
    title: "Bild · Trennmotiv für Präsentationsfolien",
    kind: "IMAGE",
    subject: "TALK",
    withIdentities: true,
    aspect: "16:9",
    purpose:
      "Textfreies Hintergrund- oder Kapitelbild für die Folien eines Briefings. Ruhige Mitte, damit Text daraufpasst.",
    body:
      "A quiet, wide abstract background image for a presentation slide. " +
      "[[The subject is {{briefing.titel}}.]] " +
      "Deep space, a soft radial glow off-center, fine grid texture, a few flowing light lines. " +
      "Deliberately empty in the center and lower third so that a headline and body text remain " +
      "readable on top. Low contrast, nothing that competes with text. " +
      "[[One dominant accent color: {{identitaet.farbe}}.]] " +
      "{{baustein.keine-marken}} " +
      "[[Aspect ratio {{format}}.]]\n\n{{baustein.stil}}",
  },
  {
    key: "bild-teilen-karte",
    title: "Bild · Teilen-Karte für eine Depesche",
    kind: "IMAGE",
    subject: "DISPATCH",
    withIdentities: false,
    aspect: "1.91:1",
    purpose:
      "Das Bild, das beim Teilen in der Vorschau erscheint. Querformat, ruhige rechte Hälfte für die Überschrift.",
    body:
      "A wide abstract preview image for a shared article link. " +
      "[[Subject: {{depesche.titel}}.]] " +
      "[[Themes: {{depesche.themen}}.]] " +
      "A single strong motif on the left, the right half almost empty and evenly dark so an " +
      "overlaid headline stays readable. Very calm composition, no small detail. " +
      "{{baustein.keine-marken}} " +
      "[[Aspect ratio {{format}}.]]\n\n{{baustein.stil}}",
  },

  // --- Text ---------------------------------------------------------------
  {
    key: "text-depesche-linkedin",
    title: "Text · LinkedIn-Post zu einer Depesche",
    kind: "TEXT",
    subject: "DISPATCH",
    withIdentities: true,
    purpose:
      "Fertiger Prompt mit allen Daten der Depesche — für einen Post, der auf den Artikel führt.",
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
      "\nVorgaben: 900 bis 1300 Zeichen. Erste Zeile ist der Haken und steht allein. " +
      "Danach ein Absatz, der die These benennt, zwei bis drei kurze Absätze mit dem, was " +
      "praktisch daraus folgt, und eine Frage am Schluss. Der Link kommt in den ersten Kommentar — " +
      "gib ihn getrennt aus. Höchstens drei Hashtags.\n\n{{baustein.stimme}}",
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
      "\nVorgaben: höchstens 900 Zeichen. Sag, was die Zuhörenden mitnehmen, nicht, wie sehr ich " +
      "mich freue. Eine konkrete Einladung am Schluss. Kein Countdown, keine Vorfreude-Floskeln.\n\n" +
      "{{baustein.stimme}}",
  },
  {
    key: "text-einsatz-nachbericht",
    title: "Text · Nachbericht zu einem Einsatz",
    kind: "TEXT",
    subject: "MISSION",
    withIdentities: true,
    purpose:
      "Entwurf für den Rückblick nach dem Auftritt — als Grundlage für das Feld „Nachbericht“ am Einsatz.",
    body:
      "Schreib einen kurzen Nachbericht zu meinem Auftritt.\n\n" +
      "[[Veranstaltung: {{einsatz.veranstaltung}}\n]]" +
      "[[Ort: {{einsatz.ort}}\n]]" +
      "[[Datum: {{einsatz.datum}}\n]]" +
      "[[Vortrag: {{einsatz.briefing}}\n]]" +
      "[[Publikum: rund {{einsatz.publikum}} Personen\n]]" +
      "[[Ich war dort {{identitaet}}.\n]]" +
      "[[\nWorum es ging:\n{{einsatz.vortragstext}}\n]]" +
      "\nVorgaben: drei bis fünf Absätze. Erster Absatz: die eine Frage, die im Raum stand. " +
      "Dann was hängen geblieben ist — zwei bis drei konkrete Beobachtungen aus den Gesprächen " +
      "danach, keine Aufzählung von Programmpunkten. Letzter Absatz: was ich daraus mitnehme. " +
      "Erfinde keine Reaktionen und keine Zahlen; markiere Stellen, an denen mir eine Beobachtung " +
      "fehlt, mit [ergänzen].\n\n{{baustein.stimme}}",
  },
  {
    key: "text-briefing-einreichung",
    title: "Text · Einreichung eines Briefings (Call for Papers)",
    kind: "TEXT",
    subject: "TALK",
    withIdentities: true,
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
      "[[Ich reiche als {{identitaet}} ein.\n]]" +
      "[[\nAbstract:\n{{briefing.abstract}}\n]]" +
      "\nGib aus: einen Titel und zwei Alternativtitel, einen Abstract von rund 1200 Zeichen, " +
      "drei bis fünf Lernziele als Aufzählung, eine Sprecherbio von 400 Zeichen und drei Sätze " +
      "dazu, warum genau dieser Vortrag auf genau diese Konferenz passt (lass diese Stelle offen, " +
      "wenn ich die Konferenz nicht genannt habe).\n\n{{baustein.stimme}}",
  },
  {
    key: "text-briefing-folien",
    title: "Text · Foliengerüst für ein Briefing",
    kind: "TEXT",
    subject: "TALK",
    withIdentities: true,
    purpose:
      "Prompt für eine Präsentation zu einem Briefing: Folienabfolge mit Sprechernotizen, in ein Foliendeck übertragbar.",
    body:
      "Entwirf das Foliengerüst für meinen Vortrag.\n\n" +
      "[[Titel: {{briefing.titel}}\n]]" +
      "[[Dauer: {{briefing.dauer}} Minuten\n]]" +
      "[[Niveaustufe: {{briefing.stufe}}\n]]" +
      "[[Zielgruppen: {{briefing.zielgruppen}}\n]]" +
      "[[Werkzeuge, die vorkommen: {{briefing.werkzeuge}}\n]]" +
      "[[Ich halte ihn als {{identitaet}}.\n]]" +
      "[[\nAbstract:\n{{briefing.abstract}}\n]]" +
      "\nGib je Folie aus: Nummer, Titel, höchstens fünf Stichpunkte, Sprechernotiz von zwei bis " +
      "drei Sätzen und — wo es hilft — einen Vorschlag für Demo oder Grafik. Rechne mit etwa " +
      "einer Folie pro anderthalb Minuten. Aufbau: Einstieg mit einem echten Problem, " +
      "Einordnung, Kern mit Demo, Grenzen und Stolperfallen, ein Handlungsschritt für morgen. " +
      "Keine Agenda-Folie, keine Vorstellungsfolie am Anfang.\n\n{{baustein.stimme}}",
  },
  {
    key: "text-einsatz-folien",
    title: "Text · Foliengerüst für einen konkreten Einsatz",
    kind: "TEXT",
    subject: "MISSION",
    withIdentities: true,
    purpose:
      "Wie das Foliengerüst zum Briefing, aber zugeschnitten auf eine bestimmte Veranstaltung und ihr Publikum.",
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
      "\nGib je Folie aus: Nummer, Titel, höchstens fünf Stichpunkte und eine Sprechernotiz. " +
      "Richte Beispiele und Tonfall am genannten Publikum aus. Halte die Zeit ein und sag am " +
      "Schluss, welche Folien zuerst wegfallen, wenn es knapp wird.\n\n{{baustein.stimme}}",
  },
  {
    key: "text-depesche-uebersetzung",
    title: "Text · Englische Fassung einer Depesche",
    kind: "TEXT",
    subject: "DISPATCH",
    withIdentities: false,
    purpose:
      "Übersetzungsprompt mit dem vollständigen deutschen Text. Das Ergebnis ist ein Entwurf und wird nie ungeprüft veröffentlicht.",
    body:
      "Übersetze meinen Artikel ins Englische.\n\n" +
      "[[Titel: {{depesche.titel}}\n]]" +
      "[[Anriss: {{depesche.teaser}}\n]]" +
      "[[\nText:\n{{depesche.text}}\n]]" +
      "\nVorgaben: britisches Englisch, derselbe Tonfall wie im Original, keine Glättung ins " +
      "Werbliche. Fachbegriffe bleiben stehen: Copilot Studio, Microsoft Foundry, " +
      "Sensitivity Labels, Tenant, Agent, Prompt, Governance. Gib Titel, Anriss und Text " +
      "getrennt aus. Was du nicht sicher übersetzen kannst, markierst du mit [prüfen].",
  },
  {
    key: "text-bild-alternativtext",
    title: "Text · Alt-Texte für ein Bild",
    kind: "TEXT",
    subject: "NONE",
    withIdentities: false,
    purpose:
      "Für hochgeladene Bilder: verlangt beide Sprachfassungen und beschreibt, was ein guter Alt-Text leisten muss.",
    body:
      "Ich hänge ein Bild an. Schreib mir dazu einen Alternativtext auf Deutsch und einen auf " +
      "Englisch.\n\nVorgaben: höchstens 125 Zeichen je Sprache. Beschreib, was zu sehen ist und " +
      "was es im Zusammenhang bedeutet — nicht, wie das Bild gemacht wurde. Kein „Bild von“, " +
      "kein „Grafik, die zeigt“. Wenn im Bild Text steht, gehört er in den Alternativtext. " +
      "Ist das Bild rein dekorativ, sag mir das statt einen Text zu erfinden.",
  },
];
