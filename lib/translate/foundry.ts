import { sanitizeDocument } from "@/lib/content/sanitize";
import type { ContentContext, TiptapDoc } from "@/lib/content/schema";
import { extractTexts, applyTexts } from "./extract";
import {
  buildTranslationSystemPrompt,
  buildNumberedInput,
  parseNumberedOutput,
} from "./glossary";

// Übersetzungsvorschlag über Microsoft Foundry (SPEC §8). Modell und Endpunkt
// sind konfigurierbar (FOUNDRY_*). Das Ergebnis ist ein KI-ENTWURF (state
// AI_DRAFT) und wird NIE automatisch veröffentlicht.
//
// Sicherheit: Der Aufruf geht ausschließlich an den konfigurierten Endpunkt
// (Allow-List, SPEC §13). Ohne Konfiguration wird ein klarer Fehler geworfen —
// kein Fallback, der etwas Falsches vortäuscht.

const API_VERSION = "2024-08-01-preview";

export class TranslationUnavailableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TranslationUnavailableError";
  }
}

/** Übersetzt eine Liste von Textsegmenten. */
export async function translateTexts(
  texts: string[],
  from: string,
  to: string,
): Promise<string[]> {
  if (texts.length === 0) return [];

  const endpoint = process.env.FOUNDRY_ENDPOINT;
  const deployment = process.env.FOUNDRY_DEPLOYMENT;
  const apiKey = process.env.FOUNDRY_API_KEY;
  if (!endpoint || !deployment) {
    throw new TranslationUnavailableError(
      "Übersetzung nicht konfiguriert: FOUNDRY_ENDPOINT und FOUNDRY_DEPLOYMENT fehlen.",
    );
  }

  const url = `${endpoint.replace(/\/$/, "")}/openai/deployments/${deployment}/chat/completions?api-version=${API_VERSION}`;
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) headers["api-key"] = apiKey; // sonst Managed Identity (zu verifizieren)

  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({
      temperature: 0.2,
      messages: [
        { role: "system", content: buildTranslationSystemPrompt(from, to) },
        { role: "user", content: buildNumberedInput(texts) },
      ],
    }),
  });

  if (!res.ok) {
    throw new TranslationUnavailableError(
      `Foundry-Antwort ${res.status}. Übersetzung fehlgeschlagen.`,
    );
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const content = data.choices?.[0]?.message?.content ?? "";
  return parseNumberedOutput(content, texts.length);
}

/**
 * Übersetzt ein ganzes Dokument (blockweise) und gibt ein strukturgleiches,
 * bereinigtes Dokument zurück.
 */
export async function translateDocument(
  doc: TiptapDoc,
  from: string,
  to: string,
  context: ContentContext,
): Promise<TiptapDoc> {
  const texts = extractTexts(doc);
  const translated = await translateTexts(texts, from, to);
  return sanitizeDocument(applyTexts(doc, translated), context);
}
