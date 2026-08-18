import { toTalkLanguage } from "@/lib/mission-language";
import { assetUrl } from "@/lib/media/url";
import type { Locale } from "@/lib/i18n/config";

// Foliensvorlagen für Einsätze: je eine PowerPoint-Datei auf Deutsch und auf
// Englisch. Sie gehören nicht zu einem einzelnen Einsatz — dieselbe Vorlage
// dient allen —, deshalb liegen sie als Seiteneinstellung (SiteSetting) und
// nicht als Spalte an `Mission`. Keine Migration, kein Schema-Anbau.
//
// Im Einsatzformular wird die Vorlage in der gewählten Vortragssprache zum
// Download angeboten; die fertigen Folien lädt Nicole danach über den
// vorhandenen PDF-Upload am selben Einsatz wieder hoch.

/** Zulässige Endungen: Präsentation und PowerPoint-Vorlage, beide OOXML. */
export const SLIDE_TEMPLATE_EXTENSIONS = ["pptx", "potx"] as const;
export type SlideTemplateExtension = (typeof SLIDE_TEMPLATE_EXTENSIONS)[number];

export const SLIDE_TEMPLATE_MIME: Record<SlideTemplateExtension, string> = {
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  potx: "application/vnd.openxmlformats-officedocument.presentationml.template",
};

// Eine Corporate-Vorlage mit Bildmaterial in den Folienmastern wiegt schnell
// 40 MB. Solche Dateien kommen nicht in einer einzigen Anfrage, sondern in
// Teilstücken (siehe `storePart`/`commitParts`): jedes Stück ist für sich
// wiederholbar, und keine Anfrage hält mehr als ein paar MB im Speicher — die
// Container-App hat 0,5 GiB.
export const MAX_SLIDE_TEMPLATE_MB = 100;
export const MAX_SLIDE_TEMPLATE_BYTES = MAX_SLIDE_TEMPLATE_MB * 1024 * 1024;

/** Größe eines Teilstücks beim Upload. Klein genug für jedes Ingress-Limit. */
export const SLIDE_TEMPLATE_PART_BYTES = 4 * 1024 * 1024;

/** Obergrenze für ein einzelnes Teilstück serverseitig (etwas Luft nach oben). */
export const MAX_PART_BYTES = SLIDE_TEMPLATE_PART_BYTES * 2;

/** Wie viele Teile eine Datei höchstens haben darf — aus Grenze und Teilgröße. */
export const MAX_PARTS = Math.ceil(MAX_SLIDE_TEMPLATE_BYTES / SLIDE_TEMPLATE_PART_BYTES) + 1;

/** Einheitliche Meldung, damit Formular und API dieselbe Grenze nennen. */
export const SLIDE_TEMPLATE_TOO_LARGE = `Die Datei ist größer als ${MAX_SLIDE_TEMPLATE_MB} MB.`;

export const SLIDE_TEMPLATE_ACCEPT = [
  SLIDE_TEMPLATE_MIME.pptx,
  SLIDE_TEMPLATE_MIME.potx,
  ".pptx",
  ".potx",
].join(",");

export interface SlideTemplate {
  locale: Locale;
  /** Pfad in der Medienablage (wie `Mission.slidesFilePath`). */
  path: string;
  /** Originalname, damit der Download nicht als UUID auf der Platte landet. */
  fileName: string;
  /** Größe der abgelegten Datei — sichtbar, damit Vollständigkeit prüfbar ist. */
  bytes: number;
}

export type SlideTemplateSet = Record<Locale, SlideTemplate | null>;

export const EMPTY_SLIDE_TEMPLATES: SlideTemplateSet = { de: null, en: null };

/** Schlüssel in `SiteSetting` für Pfad, Dateiname und Größe einer Sprache. */
export function slideTemplateKeys(locale: Locale): { path: string; name: string; bytes: string } {
  return {
    path: `slideTemplate.${locale}.path`,
    name: `slideTemplate.${locale}.fileName`,
    bytes: `slideTemplate.${locale}.bytes`,
  };
}

/** Kennung eines mehrteiligen Uploads — nur UUIDs, nie ein Pfadbestandteil. */
export function isUploadId(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

/** Endung aus einem Dateinamen, sofern sie zulässig ist. */
export function templateExtension(fileName: string): SlideTemplateExtension | null {
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  return (SLIDE_TEMPLATE_EXTENSIONS as readonly string[]).includes(ext)
    ? (ext as SlideTemplateExtension)
    : null;
}

/**
 * Kurzer, sicherer Anzeigename aus dem Originaldateinamen: kein Pfad, keine
 * Sonderzeichen, immer mit zulässiger Endung.
 */
export function safeTemplateName(raw: string, fallbackExt: SlideTemplateExtension = "pptx"): string {
  const base = raw.split(/[\\/]/).pop() ?? "";
  const cleaned = base.replace(/[^\p{L}\p{N}\-_. ]/gu, "").trim();
  const ext = templateExtension(cleaned);
  if (!cleaned || cleaned === `.${ext}`) return `vorlage.${fallbackExt}`;
  return ext ? cleaned : `${cleaned}.${fallbackExt}`;
}

/** Sucht eine ASCII-Zeichenkette im Byte-Strom (ohne Node-Buffer, damit dieses
 *  Modul auch im Client-Bundle unbedenklich ist). */
function includesAscii(buf: Uint8Array, needle: string): boolean {
  const bytes = Array.from(needle, (c) => c.charCodeAt(0));
  const last = buf.length - bytes.length;
  for (let i = 0; i <= last; i += 1) {
    let hit = true;
    for (let j = 0; j < bytes.length; j += 1) {
      if (buf[i + j] !== bytes[j]) {
        hit = false;
        break;
      }
    }
    if (hit) return true;
  }
  return false;
}

/** Legacy-Binärformat (.ppt, OLE2) — erkennbar, damit die Meldung konkret wird. */
export function isLegacyPowerPoint(buf: Uint8Array): boolean {
  const sig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  return buf.length >= sig.length && sig.every((b, i) => buf[i] === b);
}

const PRESENTATION_MARKER = "ppt/presentation.xml";
/** Lokaler Datei-Header am Anfang eines ZIP. */
const ZIP_START = [0x50, 0x4b, 0x03, 0x04];
/** „End of Central Directory" — die Schlussmarke eines vollständigen ZIP. */
const ZIP_END = [0x50, 0x4b, 0x05, 0x06];

/** So viel wird von Anfang und Ende gelesen, um eine Datei zu beurteilen. */
export const ARCHIVE_PROBE_BYTES = 64 * 1024;

export interface PresentationVerdict {
  ok: boolean;
  error?: string;
}

/** Größe in MB, wie sie in Meldungen und Oberfläche erscheint. */
export function formatMb(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export interface ArchiveProbe {
  /** Größe, die die Ablage meldet — nicht, was wir zu schreiben glaubten. */
  size: number;
  /** Größe, die der Browser vor dem Upload angekündigt hat. */
  expectedSize: number;
  /** Erste `ARCHIVE_PROBE_BYTES` der abgelegten Datei. */
  head: Uint8Array;
  /** Letzte `ARCHIVE_PROBE_BYTES` der abgelegten Datei. */
  tail: Uint8Array;
}

/**
 * Beurteilt die **abgelegte** Datei, nicht den Upload: Ist sie vollständig
 * angekommen, und ist sie wirklich eine PowerPoint-Datei?
 *
 * Der entscheidende Test ist die Schlussmarke des ZIP („End of Central
 * Directory"). Eine abgeschnittene Übertragung erzeugt eine Datei, die vorne
 * völlig richtig aussieht — PowerPoint bietet dann an, sie zu reparieren, und
 * scheitert daran. Genau dieser Fall darf nicht als Erfolg durchgehen.
 *
 * Der Typ wird am Eintragsnamen `ppt/presentation.xml` erkannt: Er steht
 * unkomprimiert im lokalen Header (Anfang) und im zentralen Verzeichnis
 * (Ende) — eine umbenannte .docx fällt damit durch.
 */
export function verifyTemplateArchive(probe: ArchiveProbe): PresentationVerdict {
  const { size, expectedSize, head, tail } = probe;
  if (size === 0) return { ok: false, error: "Die Datei ist leer." };
  if (isLegacyPowerPoint(head)) {
    return {
      ok: false,
      error: "Das ist das alte PowerPoint-Format (.ppt). Bitte als .pptx oder .potx speichern.",
    };
  }
  if (!startsWith(head, ZIP_START)) {
    return { ok: false, error: "Nur PowerPoint-Dateien (.pptx oder .potx) sind erlaubt." };
  }
  if (expectedSize > 0 && size !== expectedSize) {
    return {
      ok: false,
      error:
        `Die Datei ist unvollständig angekommen (${formatMb(size)} von ${formatMb(expectedSize)}). ` +
        "Bitte erneut hochladen.",
    };
  }
  if (!includesBytes(tail, ZIP_END)) {
    return {
      ok: false,
      error:
        "Die Datei ist unvollständig angekommen: die Schlussmarke der PowerPoint-Datei fehlt. " +
        "Bitte erneut hochladen.",
    };
  }
  if (!includesAscii(head, PRESENTATION_MARKER) && !includesAscii(tail, PRESENTATION_MARKER)) {
    return { ok: false, error: "Nur PowerPoint-Dateien (.pptx oder .potx) sind erlaubt." };
  }
  return { ok: true };
}

function startsWith(buf: Uint8Array, signature: number[]): boolean {
  return buf.length >= signature.length && signature.every((b, i) => buf[i] === b);
}

function includesBytes(buf: Uint8Array, signature: number[]): boolean {
  return includesAscii(buf, String.fromCharCode(...signature));
}

export interface LocalizedPick<T> {
  item: T;
  /** Falsch, wenn nur die Datei der anderen Sprache vorliegt. */
  matchesLanguage: boolean;
}

/**
 * Wählt aus sprachabhängigen Dateien die zur Vortragssprache passende. Fehlt
 * sie, wird die andere angeboten — aber als solche gekennzeichnet, damit
 * niemand versehentlich in der falschen Sprache anfängt oder die falsche
 * Fassung mit auf die Bühne nimmt. Ein stiller Rückfall wäre schlechter.
 *
 * Gilt für die Vorlagen (Medien) wie für die Foliensätze (Briefing).
 */
export function pickForLanguage<T extends { locale: string }>(
  items: (T | null | undefined)[],
  language: string | null | undefined,
): LocalizedPick<T> | null {
  const wanted = toTalkLanguage(language) ?? "de";
  const present = items.filter((x): x is T => Boolean(x));
  const match = present.find((x) => toTalkLanguage(x.locale) === wanted);
  if (match) return { item: match, matchesLanguage: true };
  const other = present.find((x) => toTalkLanguage(x.locale) === (wanted === "de" ? "en" : "de"));
  return other ? { item: other, matchesLanguage: false } : null;
}

export interface SlideTemplateChoice {
  template: SlideTemplate;
  /** Falsch, wenn nur die Vorlage der anderen Sprache hinterlegt ist. */
  matchesLanguage: boolean;
}

/** Die Vorlage zur Vortragssprache. Siehe `pickForLanguage`. */
export function pickSlideTemplate(
  set: SlideTemplateSet,
  language: string | null | undefined,
): SlideTemplateChoice | null {
  const picked = pickForLanguage([set.de, set.en], language);
  return picked ? { template: picked.item, matchesLanguage: picked.matchesLanguage } : null;
}

/**
 * Download-URL über den Medien-Proxy. `?dl=` setzt den Originaldateinamen im
 * Content-Disposition-Header (siehe app/media/[...path]/route.ts).
 */
export function slideTemplateUrl(template: SlideTemplate): string {
  return `${assetUrl(template.path)}?dl=${encodeURIComponent(template.fileName)}`;
}
