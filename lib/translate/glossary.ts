import glossaryData from "@/config/glossary.json";

// Glossar für die Übersetzung (SPEC §8). Fachbegriffe bleiben unübersetzt.

export function glossaryTerms(): string[] {
  return (glossaryData.terms ?? []).filter((t): t is string => typeof t === "string");
}

/** Baut die System-Anweisung für das Übersetzungsmodell. */
export function buildTranslationSystemPrompt(from: string, to: string): string {
  const terms = glossaryTerms();
  const fromName = from === "de" ? "German" : "English";
  const toName = to === "en" ? "English" : "German";
  return [
    `You are a professional translator for a Microsoft technology blog.`,
    `Translate each numbered line from ${fromName} to ${toName}.`,
    `Return exactly the same number of numbered lines, in the same order, with only the translation — no extra commentary.`,
    `Keep these product names and technical terms unchanged (do not translate): ${terms.join(", ")}.`,
    `Also keep proper nouns, submitted talk titles and product names as they are.`,
    `Preserve the meaning and tone; do not add or remove content.`,
  ].join("\n");
}

/** Baut die nummerierte Eingabe aus den zu übersetzenden Textsegmenten. */
export function buildNumberedInput(texts: string[]): string {
  return texts.map((t, i) => `${i + 1}. ${t.replace(/\n/g, " ")}`).join("\n");
}

/** Parst die nummerierte Antwort zurück in ein Array in Originalreihenfolge. */
export function parseNumberedOutput(output: string, expectedCount: number): string[] {
  const result: string[] = new Array(expectedCount).fill("");
  const lines = output.split(/\r?\n/);
  for (const line of lines) {
    const match = /^\s*(\d+)\.\s?(.*)$/.exec(line);
    if (match) {
      const idx = Number(match[1]) - 1;
      if (idx >= 0 && idx < expectedCount) {
        result[idx] = match[2] ?? "";
      }
    }
  }
  return result;
}
