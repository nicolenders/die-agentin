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
// 40 MB und mehr. Der Upload wird deshalb nicht im Speicher gehalten, sondern
// im Vorbeifließen geprüft und direkt in die Ablage geschrieben (siehe
// PresentationScanner und `storeStream`) — die Container-App hat 0,5 GiB.
export const MAX_SLIDE_TEMPLATE_MB = 100;
export const MAX_SLIDE_TEMPLATE_BYTES = MAX_SLIDE_TEMPLATE_MB * 1024 * 1024;

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
}

export type SlideTemplateSet = Record<Locale, SlideTemplate | null>;

export const EMPTY_SLIDE_TEMPLATES: SlideTemplateSet = { de: null, en: null };

/** Schlüssel in `SiteSetting` für Pfad und Dateiname einer Sprache. */
export function slideTemplateKeys(locale: Locale): { path: string; name: string } {
  return { path: `slideTemplate.${locale}.path`, name: `slideTemplate.${locale}.fileName` };
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

/**
 * Echter Typ über den Inhalt statt über die Endung: OOXML-Dateien sind ZIPs
 * (`PK\x03\x04`), und der Eintragsname `ppt/presentation.xml` steht im lokalen
 * Header unkomprimiert im Byte-Strom. Damit wird eine umbenannte .docx oder
 * eine beliebige ZIP-Datei abgewiesen.
 *
 * Für eine Datei, die bereits vollständig im Speicher liegt. Der Upload nutzt
 * denselben Test abschnittsweise (`PresentationScanner`).
 */
export function isOfficePresentation(buf: Uint8Array): boolean {
  const scanner = new PresentationScanner();
  scanner.push(buf);
  return scanner.verdict().ok;
}

/** Legacy-Binärformat (.ppt, OLE2) — erkennbar, damit die Meldung konkret wird. */
export function isLegacyPowerPoint(buf: Uint8Array): boolean {
  const sig = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1];
  return buf.length >= sig.length && sig.every((b, i) => buf[i] === b);
}

const PRESENTATION_MARKER = "ppt/presentation.xml";

export interface PresentationVerdict {
  ok: boolean;
  error?: string;
}

/**
 * Dieselbe Prüfung wie `isOfficePresentation`, aber häppchenweise: Der Upload
 * einer 40-MB-Vorlage soll nicht erst vollständig im Speicher liegen, bevor
 * jemand hineinschaut. Der Scanner sieht jeden Abschnitt genau einmal, merkt
 * sich nur die ersten acht Bytes (Signatur) und den Überhang an der
 * Abschnittsgrenze — sonst könnte ein Fund genau dort zerschnitten werden.
 */
export class PresentationScanner {
  #head: number[] = [];
  #tail = new Uint8Array(0);
  #found = false;
  #bytes = 0;

  push(chunk: Uint8Array): void {
    if (chunk.length === 0) return;
    this.#bytes += chunk.length;
    if (this.#head.length < 8) {
      this.#head.push(...Array.from(chunk.subarray(0, 8 - this.#head.length)));
    }
    if (this.#found) return;

    const window = new Uint8Array(this.#tail.length + chunk.length);
    window.set(this.#tail, 0);
    window.set(chunk, this.#tail.length);
    if (includesAscii(window, PRESENTATION_MARKER)) {
      this.#found = true;
      this.#tail = new Uint8Array(0);
      return;
    }
    const keep = Math.min(window.length, PRESENTATION_MARKER.length - 1);
    this.#tail = window.slice(window.length - keep);
  }

  /** Bisher gesehene Bytes — damit der Aufrufer die Obergrenze durchsetzen kann. */
  get bytes(): number {
    return this.#bytes;
  }

  /** Urteil nach dem letzten Abschnitt, mit Meldung für die Oberfläche. */
  verdict(): PresentationVerdict {
    const head = Uint8Array.from(this.#head);
    if (this.#bytes === 0) return { ok: false, error: "Die Datei ist leer." };
    if (isLegacyPowerPoint(head)) {
      return {
        ok: false,
        error: "Das ist das alte PowerPoint-Format (.ppt). Bitte als .pptx oder .potx speichern.",
      };
    }
    const isZip =
      head.length >= 4 && head[0] === 0x50 && head[1] === 0x4b && head[2] === 0x03 && head[3] === 0x04;
    if (!isZip || !this.#found) {
      return { ok: false, error: "Nur PowerPoint-Dateien (.pptx oder .potx) sind erlaubt." };
    }
    return { ok: true };
  }
}

export interface SlideTemplateChoice {
  template: SlideTemplate;
  /** Falsch, wenn nur die Vorlage der anderen Sprache hinterlegt ist. */
  matchesLanguage: boolean;
}

/**
 * Die Vorlage zur Vortragssprache eines Einsatzes. Fehlt sie, wird die der
 * anderen Sprache angeboten — aber als solche gekennzeichnet, damit niemand
 * versehentlich in der falschen Sprache anfängt.
 */
export function pickSlideTemplate(
  set: SlideTemplateSet,
  language: string | null | undefined,
): SlideTemplateChoice | null {
  const wanted = toTalkLanguage(language) ?? "de";
  const match = set[wanted];
  if (match) return { template: match, matchesLanguage: true };
  const other = wanted === "de" ? set.en : set.de;
  return other ? { template: other, matchesLanguage: false } : null;
}

/**
 * Download-URL über den Medien-Proxy. `?dl=` setzt den Originaldateinamen im
 * Content-Disposition-Header (siehe app/media/[...path]/route.ts).
 */
export function slideTemplateUrl(template: SlideTemplate): string {
  return `${assetUrl(template.path)}?dl=${encodeURIComponent(template.fileName)}`;
}
