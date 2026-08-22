// Der Katalog aller Platzhalter, die eine Vorlage kennt. Er hat zwei Aufgaben:
// er ist die Liste zum Anklicken in der Bearbeitungsmaske, und er ist die
// Prüfung beim Speichern — ein vertippter Platzhalter fällt beim Speichern auf
// und nicht erst, wenn der Prompt im Bildgenerator seltsame Bilder erzeugt.

import type { PromptSubject } from "@/lib/domain";
import { extractPlaceholders, isSnippetRef, snippetKeyOf } from "./render";

export interface PlaceholderDef {
  /** Ohne geschweifte Klammern, z. B. „einsatz.stadt“. */
  key: string;
  /** Was drinsteht, in einem Halbsatz. */
  label: string;
}

/** Immer verfügbar, unabhängig vom Bezug der Vorlage. */
export const COMMON_PLACEHOLDERS: PlaceholderDef[] = [
  { key: "marke", label: "Markenname („Die Agentin“)" },
  { key: "person", label: "Name der Person hinter der Marke" },
  { key: "website", label: "Adresse der Website" },
  { key: "heute", label: "Heutiges Datum" },
  { key: "jahr", label: "Laufendes Jahr" },
  { key: "format", label: "Seitenverhältnis der Vorlage („4:5“)" },
  {
    key: "eingabe",
    label: "Was du in der Werkbank ins freie Feld schreibst (nur mit Beschriftung)",
  },
];

/** Angeboten, sobald die Vorlage Identitäten einbezieht. Mehrere Identitäten
 *  werden zu einer lesbaren Aufzählung verbunden. */
export const IDENTITY_PLACEHOLDERS: PlaceholderDef[] = [
  { key: "identitaet", label: "Identität als „Deckname (Rolle)“" },
  { key: "identitaet.deckname", label: "Deckname" },
  { key: "identitaet.rolle", label: "Rolle" },
  { key: "identitaet.tagline", label: "Einzeiler der Identität" },
  { key: "identitaet.farbe", label: "Akzentfarbe als Hex-Wert" },
  { key: "identitaet.fokus", label: "Fachgebiete" },
  { key: "identitaet.werkzeuge", label: "Werkzeuge" },
  { key: "identitaet.kurzbio", label: "Kurzbio" },
  { key: "identitaet.beschreibung", label: "Beschreibung als reiner Text" },
];

const MISSION_PLACEHOLDERS: PlaceholderDef[] = [
  { key: "einsatz.veranstaltung", label: "Name der Veranstaltung" },
  { key: "einsatz.ort", label: "Ort als „Stadt, Land“ bzw. „Online“" },
  { key: "einsatz.stadt", label: "Stadt" },
  { key: "einsatz.land", label: "Land, ausgeschrieben" },
  { key: "einsatz.datum", label: "Datum des Auftritts" },
  { key: "einsatz.jahr", label: "Jahr des Auftritts" },
  { key: "einsatz.art", label: "Art des Auftritts (Keynote, Session …)" },
  { key: "einsatz.sprache", label: "Vortragssprache" },
  { key: "einsatz.dauer", label: "Dauer in Minuten" },
  { key: "einsatz.publikum", label: "Zahl der Teilnehmenden" },
  { key: "einsatz.briefing", label: "Titel des gehaltenen Briefings" },
  { key: "einsatz.beschreibung", label: "Text über die Veranstaltung" },
  { key: "einsatz.vortragstext", label: "Text über den eigenen Vortrag" },
  { key: "einsatz.url", label: "Adresse der Veranstaltung" },
];

const TALK_PLACEHOLDERS: PlaceholderDef[] = [
  { key: "briefing.titel", label: "Titel (Deutsch)" },
  { key: "briefing.titel_en", label: "Titel (Englisch)" },
  { key: "briefing.abstract", label: "Abstract (Deutsch)" },
  { key: "briefing.abstract_en", label: "Abstract (Englisch)" },
  { key: "briefing.kategorie", label: "Kategorie" },
  { key: "briefing.stufe", label: "Niveaustufe (100–400)" },
  { key: "briefing.dauer", label: "Dauer in Minuten" },
  { key: "briefing.zielgruppen", label: "Zielgruppen" },
  { key: "briefing.werkzeuge", label: "Werkzeuge" },
  { key: "briefing.einsaetze", label: "Zahl der bisherigen Auftritte" },
];

const DISPATCH_PLACEHOLDERS: PlaceholderDef[] = [
  { key: "depesche.titel", label: "Titel (Deutsch)" },
  { key: "depesche.titel_en", label: "Titel (Englisch)" },
  { key: "depesche.teaser", label: "Anrisstext (Deutsch)" },
  { key: "depesche.teaser_en", label: "Anrisstext (Englisch)" },
  { key: "depesche.art", label: "Format (Meldung, Einordnung …)" },
  { key: "depesche.themen", label: "Radar-Themen und Fachgebiete" },
  { key: "depesche.text", label: "Volltext als reiner Text (Deutsch)" },
  { key: "depesche.text_en", label: "Volltext als reiner Text (Englisch)" },
  { key: "depesche.quelle", label: "Quelle mit Adresse" },
  { key: "depesche.url", label: "Adresse der Depesche" },
  { key: "depesche.datum", label: "Veröffentlichungsdatum" },
];

const BY_SUBJECT: Record<PromptSubject, PlaceholderDef[]> = {
  MISSION: MISSION_PLACEHOLDERS,
  TALK: TALK_PLACEHOLDERS,
  DISPATCH: DISPATCH_PLACEHOLDERS,
  IDENTITY: [],
  NONE: [],
};

/** Beschriftung des Bezugs für die Oberfläche. */
export const SUBJECT_LABELS: Record<PromptSubject, string> = {
  MISSION: "Einsatz",
  TALK: "Briefing",
  DISPATCH: "Depesche",
  IDENTITY: "Identität",
  NONE: "ohne Bezug",
};

/**
 * Alle Platzhalter, die einer Vorlage mit diesem Bezug zur Verfügung stehen.
 * Bei Bezug „Identität“ sind die Identitätsplatzhalter immer dabei — der
 * gewählte Eintrag IST die Identität.
 */
export function placeholdersFor(
  subject: PromptSubject,
  withIdentities: boolean,
): PlaceholderDef[] {
  const identity = subject === "IDENTITY" || withIdentities ? IDENTITY_PLACEHOLDERS : [];
  return [...BY_SUBJECT[subject], ...identity, ...COMMON_PLACEHOLDERS];
}

/** Bietet die Werkbank für diese Vorlage eine Identitätsauswahl an? */
export function offersIdentityChoice(
  subject: PromptSubject,
  withIdentities: boolean,
): boolean {
  return subject !== "IDENTITY" && withIdentities;
}

export interface BodyProblems {
  /** Platzhalter, die es im Katalog dieses Bezugs nicht gibt. */
  unknownPlaceholders: string[];
  /** Angesprochene Bausteine, die es nicht gibt. */
  unknownSnippets: string[];
}

/**
 * Prüft einen Vorlagentext gegen Katalog und vorhandene Bausteine. Wird beim
 * Speichern aufgerufen: die Vorlage wird trotzdem gespeichert, aber die
 * Redaktion erfährt sofort, welcher Platzhalter ins Leere zeigt.
 */
export function checkBody(
  body: string,
  subject: PromptSubject,
  withIdentities: boolean,
  snippetKeys: string[],
): BodyProblems {
  const known = new Set(placeholdersFor(subject, withIdentities).map((p) => p.key));
  const unknownPlaceholders: string[] = [];
  const unknownSnippets: string[] = [];
  for (const key of extractPlaceholders(body)) {
    if (isSnippetRef(key)) {
      const snippet = snippetKeyOf(key);
      if (!snippetKeys.includes(snippet) && !unknownSnippets.includes(snippet)) {
        unknownSnippets.push(snippet);
      }
    } else if (!known.has(key) && !unknownPlaceholders.includes(key)) {
      unknownPlaceholders.push(key);
    }
  }
  return { unknownPlaceholders, unknownSnippets };
}
