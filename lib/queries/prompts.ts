import { db } from "@/lib/db";
import { parseStringList, identityDisplayName } from "@/lib/identities";
import { missionTalkLanguage, talkLanguageLabel } from "@/lib/mission-language";
import { siteOrigin } from "@/lib/site";
import {
  commonValues,
  dispatchValues,
  identityValues,
  missionValues,
  talkValues,
  type IdentityInput,
  type PromptValues,
} from "@/lib/prompts/context";
import { isOneOf, PROMPT_KINDS, PROMPT_SUBJECTS, type PromptKind, type PromptSubject } from "@/lib/domain";

// Datenzugriff der Prompt-Werkstatt. Ausschließlich Adminbereich, deshalb ohne
// Cache: wer einen Prompt baut, will die Daten von jetzt, nicht die von vorhin.

export interface PromptTemplateRow {
  id: string;
  key: string;
  title: string;
  kind: PromptKind;
  subject: PromptSubject;
  purpose: string;
  body: string;
  withIdentities: boolean;
  aspect: string;
  /** Beschriftung des freien Eingabefelds; leer = kein Feld anbieten. */
  inputLabel: string;
  active: boolean;
  sortOrder: number;
}

export interface PromptSnippetRow {
  id: string;
  key: string;
  title: string;
  body: string;
  note: string;
  sortOrder: number;
}

/** Ein wählbarer Eintrag in der Werkbank (Einsatz, Briefing, Depesche, Identität). */
export interface SubjectOption {
  id: string;
  label: string;
  /** Zweite Zeile im Auswahlfeld — Datum, Ort, Status. */
  hint: string;
}

export interface IdentityOption {
  id: string;
  label: string;
  color: string;
}

/** Die deutsche Sprachfassung eines Eintrags. Die Werkbank arbeitet auf Deutsch;
 *  die englische wird nur dort geholt, wo eine Vorlage sie ausdrücklich will. */
function german<T extends { locale: string }>(translations: T[]): T | undefined {
  return translations.find((t) => t.locale === "de");
}

function toTemplate(row: {
  id: string;
  key: string;
  title: string;
  kind: string;
  subject: string;
  purpose: string | null;
  body: string;
  withIdentities: boolean;
  aspect: string | null;
  inputLabel: string | null;
  active: boolean;
  sortOrder: number;
}): PromptTemplateRow {
  return {
    id: row.id,
    key: row.key,
    title: row.title,
    kind: isOneOf(PROMPT_KINDS, row.kind) ? row.kind : "IMAGE",
    subject: isOneOf(PROMPT_SUBJECTS, row.subject) ? row.subject : "NONE",
    purpose: row.purpose ?? "",
    body: row.body,
    withIdentities: row.withIdentities,
    aspect: row.aspect ?? "",
    inputLabel: row.inputLabel ?? "",
    active: row.active,
    sortOrder: row.sortOrder,
  };
}

export async function getPromptTemplates(onlyActive = false): Promise<PromptTemplateRow[]> {
  const rows = await db.promptTemplate.findMany({
    where: onlyActive ? { active: true } : undefined,
    orderBy: [{ sortOrder: "asc" }, { title: "asc" }],
  });
  return rows.map(toTemplate);
}

export async function getPromptTemplate(id: string): Promise<PromptTemplateRow | null> {
  const row = await db.promptTemplate.findUnique({ where: { id } });
  return row ? toTemplate(row) : null;
}

export async function getPromptSnippets(): Promise<PromptSnippetRow[]> {
  const rows = await db.promptSnippet.findMany({ orderBy: [{ sortOrder: "asc" }, { title: "asc" }] });
  return rows.map((r) => ({
    id: r.id,
    key: r.key,
    title: r.title,
    body: r.body,
    note: r.note ?? "",
    sortOrder: r.sortOrder,
  }));
}

/** Bausteine als Nachschlagewerk für `renderPrompt`. */
export function snippetMap(snippets: PromptSnippetRow[]): Record<string, string> {
  return Object.fromEntries(snippets.map((s) => [s.key, s.body]));
}

// --- Auswahllisten ----------------------------------------------------------

export async function getIdentityOptions(): Promise<IdentityOption[]> {
  const rows = await db.identity.findMany({
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    select: { id: true, codenameDe: true, codenameEn: true, roleDe: true, roleEn: true, color: true },
  });
  return rows.map((r) => ({
    id: r.id,
    label: identityDisplayName(r, "de"),
    color: r.color,
  }));
}

/**
 * Die wählbaren Einträge zum Bezug einer Vorlage. Die jüngsten zuerst — an
 * einem Prompt arbeitet man fast immer zu dem, was gerade ansteht.
 */
export async function getSubjectOptions(subject: PromptSubject): Promise<SubjectOption[]> {
  if (subject === "MISSION") {
    const rows = await db.mission.findMany({
      orderBy: { startDate: "desc" },
      take: 200,
      select: { id: true, eventName: true, city: true, isOnline: true, startDate: true },
    });
    return rows.map((r) => ({
      id: r.id,
      label: r.eventName,
      hint: [r.startDate.toISOString().slice(0, 10), r.isOnline ? "Online" : r.city]
        .filter(Boolean)
        .join(" · "),
    }));
  }

  if (subject === "TALK") {
    const rows = await db.talk.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: { translations: true, category: true, _count: { select: { deliveries: true } } },
    });
    return rows.map((r) => ({
      id: r.id,
      label: german(r.translations)?.title ?? "Ohne Titel",
      hint: [r.category?.nameDe, r.archivedAt ? "archiviert" : "", `${r._count.deliveries}×`]
        .filter(Boolean)
        .join(" · "),
    }));
  }

  if (subject === "DISPATCH") {
    const rows = await db.dispatch.findMany({
      orderBy: [{ publishAt: "desc" }, { createdAt: "desc" }],
      take: 200,
      include: { translations: true },
    });
    return rows.map((r) => ({
      id: r.id,
      label: german(r.translations)?.title ?? "Ohne Titel",
      hint: [r.status === "PUBLISHED" ? "veröffentlicht" : "Entwurf", r.format]
        .filter(Boolean)
        .join(" · "),
    }));
  }

  if (subject === "IDENTITY") {
    const rows = await db.identity.findMany({
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      select: { id: true, codenameDe: true, codenameEn: true, roleDe: true, roleEn: true },
    });
    return rows.map((r) => ({ id: r.id, label: identityDisplayName(r, "de"), hint: r.roleDe }));
  }

  return [];
}

// --- Werte für den Prompt ---------------------------------------------------

async function loadIdentityInputs(ids: string[]): Promise<IdentityInput[]> {
  if (ids.length === 0) return [];
  const rows = await db.identity.findMany({
    where: { id: { in: ids } },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { tools: { orderBy: { sortOrder: "asc" }, select: { name: true } } },
  });
  return rows.map((r) => ({
    codenameDe: r.codenameDe,
    codenameEn: r.codenameEn,
    roleDe: r.roleDe,
    roleEn: r.roleEn,
    taglineDe: r.taglineDe,
    color: r.color,
    focus: parseStringList(r.focusDe),
    tools: r.tools.map((t) => t.name),
    shortBioDe: r.shortBioDe,
    descriptionDe: r.descriptionDe,
  }));
}

async function missionInputValues(id: string): Promise<PromptValues> {
  const row = await db.mission.findUnique({
    where: { id },
    include: {
      translations: true,
      deliveries: { include: { talk: { include: { translations: true } } } },
    },
  });
  if (!row) return {};
  const text = german(row.translations);
  const delivery = row.deliveries[0];
  const language = missionTalkLanguage(row.sessionLanguage, delivery?.language);
  return missionValues({
    eventName: row.eventName,
    city: row.city,
    countryCode: row.countryCode,
    isOnline: row.isOnline,
    startDate: row.startDate,
    sessionType: row.sessionType,
    languageLabel: talkLanguageLabel(language, "de") ?? "",
    durationMin: row.durationMin,
    attendeeCount: row.attendeeCount,
    eventUrl: row.eventUrl,
    talkTitles: row.deliveries
      .map((d) => german(d.talk.translations)?.title ?? "")
      .filter(Boolean),
    eventTextDe: text?.eventText ?? "",
    talkTextDe: text?.talkText ?? "",
  });
}

async function talkInputValues(id: string): Promise<PromptValues> {
  const row = await db.talk.findUnique({
    where: { id },
    include: {
      translations: true,
      category: true,
      audiences: { orderBy: { sortOrder: "asc" } },
      tools: { orderBy: { sortOrder: "asc" } },
      _count: { select: { deliveries: true } },
    },
  });
  if (!row) return {};
  const de = german(row.translations);
  const en = row.translations.find((t) => t.locale === "en");
  return talkValues({
    titleDe: de?.title ?? "",
    titleEn: en?.title ?? "",
    abstractDe: de?.abstract ?? "",
    abstractEn: en?.abstract ?? "",
    category: row.category?.nameDe ?? "",
    level: row.level,
    durationMin: row.durationMin,
    audiences: row.audiences.map((a) => a.nameDe),
    tools: row.tools.map((t) => t.name),
    deliveryCount: row._count.deliveries,
  });
}

async function dispatchInputValues(id: string): Promise<PromptValues> {
  const row = await db.dispatch.findUnique({
    where: { id },
    include: {
      translations: true,
      topics: { orderBy: { sortOrder: "asc" } },
      tags: true,
      focusTopics: true,
    },
  });
  if (!row) return {};
  const de = german(row.translations);
  const en = row.translations.find((t) => t.locale === "en");
  return dispatchValues({
    format: row.format,
    titleDe: de?.title ?? "",
    titleEn: en?.title ?? "",
    summaryDe: de?.summary ?? "",
    summaryEn: en?.summary ?? "",
    bodyDe: de?.bodyJson ?? "",
    bodyEn: en?.bodyJson ?? "",
    topics: [...row.topics.map((t) => t.nameDe), ...row.focusTopics.map((t) => t.titleDe)],
    tags: row.tags.map((t) => t.nameDe),
    sourceTitle: row.sourceTitle,
    sourceUrl: row.sourceUrl,
    publishedAt: row.publishedAt,
    slugDe: de?.slug ?? "",
    siteUrl: siteOrigin(),
  });
}

export interface PromptValuesInput {
  subject: PromptSubject;
  /** Der gewählte Eintrag; leer, solange nichts gewählt ist. */
  subjectId: string;
  identityIds: string[];
  aspect: string;
  /** Freie Eingabe aus der Werkbank; füllt {{eingabe}}. */
  input: string;
  now: Date;
}

/**
 * Sammelt alle Platzhalterwerte für eine Auswahl. Bei Bezug „Identität" ist der
 * gewählte Eintrag selbst die Identität — die Zusatzauswahl entfällt.
 */
export async function buildPromptValues(input: PromptValuesInput): Promise<PromptValues> {
  const identityIds =
    input.subject === "IDENTITY" && input.subjectId ? [input.subjectId] : input.identityIds;

  const [subjectValues, identities] = await Promise.all([
    input.subjectId && input.subject === "MISSION"
      ? missionInputValues(input.subjectId)
      : input.subjectId && input.subject === "TALK"
        ? talkInputValues(input.subjectId)
        : input.subjectId && input.subject === "DISPATCH"
          ? dispatchInputValues(input.subjectId)
          : Promise.resolve<PromptValues>({}),
    loadIdentityInputs(identityIds),
  ]);

  return {
    ...commonValues({ now: input.now, siteUrl: siteOrigin(), aspect: input.aspect }),
    eingabe: input.input,
    ...identityValues(identities),
    ...subjectValues,
  };
}
