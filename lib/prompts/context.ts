// Baut aus den Daten eines Eintrags die Platzhalterwerte. Reine Funktionen auf
// einfachen Datenformen — die Datenbank bleibt in `lib/queries/prompts.ts`.
// Deshalb sind diese Regeln (Aufzählungen, Ortsangabe, leere Felder) ohne DB
// testbar, und genau darin liegen die Fehler, die man sonst erst im fertigen
// Prompt sieht.

import { formatDate } from "@/lib/format";
import { richValueToPlain } from "@/lib/content/rich";
import { identityDisplayName } from "@/lib/identities";
import type { DispatchFormat, SessionType } from "@/lib/domain";

export type PromptValues = Record<string, string>;

const SESSION_TYPE_LABELS: Record<SessionType, string> = {
  KEYNOTE: "Keynote",
  SESSION: "Session",
  WORKSHOP: "Workshop",
  PANEL: "Panel",
};

const DISPATCH_FORMAT_LABELS: Record<DispatchFormat, string> = {
  NOTE: "Meldung",
  ANALYSIS: "Einordnung",
  REFERENCE: "Nachschlagewerk",
  BACKSTAGE: "Backstage",
};

/** „A“, „A und B“, „A, B und C“ — für Namen und Rollen. */
export function joinAnd(items: string[]): string {
  const list = items.map((s) => s.trim()).filter(Boolean);
  if (list.length === 0) return "";
  if (list.length === 1) return list[0]!;
  return `${list.slice(0, -1).join(", ")} und ${list[list.length - 1]}`;
}

/** Aufzählung ohne Bindewort — für Stichwortlisten (Fachgebiete, Werkzeuge). */
export function joinList(items: string[]): string {
  return [...new Set(items.map((s) => s.trim()).filter(Boolean))].join(", ");
}

/** Ländercode zu ausgeschriebenem Namen; unbekannte Codes bleiben stehen. */
export function countryName(code: string | null | undefined): string {
  const value = (code ?? "").trim().toUpperCase();
  if (value.length !== 2) return "";
  try {
    return new Intl.DisplayNames(["de"], { type: "region" }).of(value) ?? value;
  } catch {
    return value;
  }
}

/** Kürzt lange Fließtexte, damit ein Prompt nicht ins Uferlose wächst. */
export function shorten(text: string, max: number): string {
  const value = text.trim().replace(/\s+/g, " ");
  if (value.length <= max) return value;
  return `${value.slice(0, max).replace(/\s+\S*$/, "")} …`;
}

// --- Allgemein --------------------------------------------------------------

export interface CommonInput {
  now: Date;
  siteUrl: string;
  /** Seitenverhältnis der Vorlage, falls gepflegt. */
  aspect?: string | null;
  brand?: string;
  person?: string;
}

export function commonValues(input: CommonInput): PromptValues {
  return {
    marke: input.brand ?? "Die Agentin",
    person: input.person ?? "Nicole Enders",
    website: input.siteUrl.replace(/^https?:\/\//, "").replace(/\/$/, ""),
    heute: formatDate(input.now, "de"),
    jahr: String(input.now.getUTCFullYear()),
    format: (input.aspect ?? "").trim(),
  };
}

// --- Identitäten ------------------------------------------------------------

export interface IdentityInput {
  codenameDe: string;
  codenameEn: string;
  roleDe: string;
  roleEn: string;
  taglineDe: string;
  color: string;
  focus: string[];
  tools: string[];
  shortBioDe: string;
  descriptionDe: string;
}

/**
 * Werte für eine oder mehrere Identitäten. Mehrere werden verbunden, nicht
 * abgeschnitten: Wer zwei Identitäten auswählt, meint auch beide.
 */
export function identityValues(identities: IdentityInput[]): PromptValues {
  if (identities.length === 0) return {};
  const names = identities.map((i) =>
    identityDisplayName(
      { codenameDe: i.codenameDe, codenameEn: i.codenameEn, roleDe: i.roleDe, roleEn: i.roleEn },
      "de",
    ),
  );
  const roles = identities.map((i) => i.roleDe.trim()).filter(Boolean);
  const pairs = identities.map((identity, index) => {
    const role = identity.roleDe.trim();
    return role && role !== names[index] ? `${names[index]} (${role})` : names[index]!;
  });
  return {
    identitaet: joinAnd(pairs),
    "identitaet.deckname": joinAnd(names),
    "identitaet.rolle": joinAnd(roles),
    "identitaet.tagline": joinAnd(identities.map((i) => i.taglineDe)),
    "identitaet.farbe": joinAnd(identities.map((i) => i.color)),
    "identitaet.fokus": joinList(identities.flatMap((i) => i.focus)),
    "identitaet.werkzeuge": joinList(identities.flatMap((i) => i.tools)),
    "identitaet.kurzbio": joinAnd(identities.map((i) => richValueToPlain(i.shortBioDe))),
    "identitaet.beschreibung": shorten(
      identities.map((i) => richValueToPlain(i.descriptionDe)).filter(Boolean).join(" "),
      1200,
    ),
  };
}

// --- Einsatz ----------------------------------------------------------------

export interface MissionInput {
  eventName: string;
  city: string;
  countryCode: string;
  isOnline: boolean;
  startDate: Date;
  sessionType: string | null;
  /** Bereits auf „Deutsch“/„Englisch“ gebrachte Vortragssprache. */
  languageLabel: string;
  durationMin: number | null;
  /** Publikum: vor Ort und zugeschaltet. Der Platzhalter nennt die Summe. */
  attendeesOnsite: number | null;
  attendeesRemote: number | null;
  eventUrl: string | null;
  talkTitles: string[];
  eventTextDe: string;
  talkTextDe: string;
}

/** Publikum als eine Zahl: vor Ort plus zugeschaltet. Ohne Angaben leer. */
function audienceTotal(mission: MissionInput): string {
  const total = (mission.attendeesOnsite ?? 0) + (mission.attendeesRemote ?? 0);
  return total > 0 ? String(total) : "";
}

export function missionValues(mission: MissionInput): PromptValues {
  const country = countryName(mission.countryCode);
  const place = mission.isOnline
    ? "Online"
    : [mission.city.trim(), country].filter(Boolean).join(", ");
  const type = mission.sessionType?.trim() ?? "";
  return {
    "einsatz.veranstaltung": mission.eventName.trim(),
    "einsatz.ort": place,
    "einsatz.stadt": mission.isOnline ? "" : mission.city.trim(),
    "einsatz.land": mission.isOnline ? "" : country,
    "einsatz.datum": formatDate(mission.startDate, "de"),
    "einsatz.jahr": String(mission.startDate.getUTCFullYear()),
    "einsatz.art": SESSION_TYPE_LABELS[type as SessionType] ?? type,
    "einsatz.sprache": mission.languageLabel,
    "einsatz.dauer": mission.durationMin ? String(mission.durationMin) : "",
    "einsatz.publikum": audienceTotal(mission),
    "einsatz.briefing": joinAnd(mission.talkTitles),
    "einsatz.beschreibung": shorten(richValueToPlain(mission.eventTextDe), 900),
    "einsatz.vortragstext": shorten(richValueToPlain(mission.talkTextDe), 900),
    "einsatz.url": (mission.eventUrl ?? "").trim(),
  };
}

// --- Briefing ---------------------------------------------------------------

export interface TalkInput {
  titleDe: string;
  titleEn: string;
  abstractDe: string;
  abstractEn: string;
  category: string;
  level: string | null;
  durationMin: number | null;
  audiences: string[];
  tools: string[];
  deliveryCount: number;
}

export function talkValues(talk: TalkInput): PromptValues {
  return {
    "briefing.titel": talk.titleDe.trim(),
    "briefing.titel_en": talk.titleEn.trim(),
    "briefing.abstract": shorten(richValueToPlain(talk.abstractDe), 1200),
    "briefing.abstract_en": shorten(richValueToPlain(talk.abstractEn), 1200),
    "briefing.kategorie": talk.category.trim(),
    "briefing.stufe": (talk.level ?? "").trim(),
    "briefing.dauer": talk.durationMin ? String(talk.durationMin) : "",
    "briefing.zielgruppen": joinList(talk.audiences),
    "briefing.werkzeuge": joinList(talk.tools),
    // Null Auftritte ist eine Aussage, aber keine, die in einen Prompt gehört —
    // sie bleibt leer, damit der Wahlteil drumherum wegfällt.
    "briefing.einsaetze": talk.deliveryCount > 0 ? String(talk.deliveryCount) : "",
  };
}

// --- Depesche ---------------------------------------------------------------

export interface DispatchInput {
  format: string;
  titleDe: string;
  titleEn: string;
  summaryDe: string;
  summaryEn: string;
  bodyDe: string;
  bodyEn: string;
  topics: string[];
  sourceTitle: string | null;
  sourceUrl: string | null;
  publishedAt: Date | null;
  slugDe: string;
  siteUrl: string;
}

export function dispatchValues(dispatch: DispatchInput): PromptValues {
  const source = [dispatch.sourceTitle?.trim(), dispatch.sourceUrl?.trim()]
    .filter(Boolean)
    .join(" — ");
  const base = dispatch.siteUrl.replace(/\/$/, "");
  return {
    "depesche.titel": dispatch.titleDe.trim(),
    "depesche.titel_en": dispatch.titleEn.trim(),
    "depesche.teaser": (dispatch.summaryDe ?? "").trim(),
    "depesche.teaser_en": (dispatch.summaryEn ?? "").trim(),
    "depesche.art":
      DISPATCH_FORMAT_LABELS[dispatch.format as DispatchFormat] ?? dispatch.format.trim(),
    "depesche.themen": joinList(dispatch.topics),
    "depesche.text": shorten(richValueToPlain(dispatch.bodyDe), 4000),
    "depesche.text_en": shorten(richValueToPlain(dispatch.bodyEn), 4000),
    "depesche.quelle": source,
    "depesche.url": dispatch.slugDe ? `${base}/de/depeschen/${dispatch.slugDe}` : "",
    "depesche.datum": dispatch.publishedAt ? formatDate(dispatch.publishedAt, "de") : "",
  };
}
