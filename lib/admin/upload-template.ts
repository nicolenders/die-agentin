import { SLIDE_TEMPLATE_PART_BYTES } from "@/lib/slide-templates";

// Upload einer Foliensvorlage in Teilstücken.
//
// Der Grund: Eine 42-MB-Datei in einer einzigen Anfrage hängt minutenlang an
// einer Verbindung. Reißt die unterwegs ab, kommt das serverseitig als sauberes
// Dateiende an — gespeichert wird eine halbe Datei, gemeldet wird Erfolg, und
// PowerPoint scheitert später daran, sie zu reparieren. In Stücken von wenigen
// MB ist jeder Fehlschlag klein, sichtbar und wiederholbar; am Ende prüft der
// Server die zusammengesetzte Datei, bevor sie als Vorlage gilt.

const TEMPLATE_ENDPOINT = "/api/admin/missions/slide-template";
const TALK_ENDPOINT = "/api/admin/briefings/slides";
const ATTEMPTS = 3;

export type UploadResult =
  | { ok: true; path: string; fileName: string; bytes: number }
  | { ok: false; error: string };

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Antwort lesen, ohne an einer HTML-Fehlerseite zu zerbrechen. */
async function readJson(response: Response): Promise<{ error?: string; [key: string]: unknown }> {
  const raw = await response.text();
  try {
    return JSON.parse(raw) as { error?: string };
  } catch {
    return { error: `Unerwartete Antwort (HTTP ${response.status}). ${raw.slice(0, 140)}`.trim() };
  }
}

/**
 * Lädt `file` in Teilstücken hoch und meldet nach jedem Teil den Fortschritt.
 * Ein Teil wird bis zu dreimal versucht — ein Aussetzer im WLAN kostet dann
 * Sekunden statt des ganzen Uploads.
 *
 * `endpoint` entscheidet, wo die Datei landet: bei den Vorlagen oder an einem
 * Briefing. Der Weg dorthin ist derselbe.
 */
async function uploadInParts(
  file: File,
  endpoint: string,
  commitParams: Record<string, string>,
  onProgress?: (done: number, total: number) => void,
): Promise<UploadResult> {
  const uploadId = crypto.randomUUID();
  const total = Math.max(1, Math.ceil(file.size / SLIDE_TEMPLATE_PART_BYTES));

  for (let index = 0; index < total; index += 1) {
    const slice = file.slice(
      index * SLIDE_TEMPLATE_PART_BYTES,
      Math.min(file.size, (index + 1) * SLIDE_TEMPLATE_PART_BYTES),
    );
    const query = new URLSearchParams({
      phase: "part",
      upload: uploadId,
      index: String(index),
      name: file.name,
    });

    let lastError = "Teil konnte nicht übertragen werden.";
    let stored = false;
    for (let attempt = 1; attempt <= ATTEMPTS && !stored; attempt += 1) {
      try {
        const response = await fetch(`${endpoint}?${query}`, { method: "POST", body: slice });
        if (response.ok) {
          stored = true;
          break;
        }
        const data = await readJson(response);
        lastError = data.error ?? `Teil ${index + 1} abgelehnt (HTTP ${response.status}).`;
        // Ablehnungen aus fachlichen Gründen wiederholen sich nur.
        if (response.status < 500 && response.status !== 429) break;
      } catch (error) {
        lastError = error instanceof Error ? error.message : "Netzwerkfehler";
      }
      if (!stored && attempt < ATTEMPTS) await wait(attempt * 1000);
    }
    if (!stored) {
      return { ok: false, error: `Upload abgebrochen bei Teil ${index + 1} von ${total}: ${lastError}` };
    }
    onProgress?.(index + 1, total);
  }

  const query = new URLSearchParams({
    ...commitParams,
    phase: "commit",
    upload: uploadId,
    name: file.name,
    parts: String(total),
    size: String(file.size),
  });
  try {
    const response = await fetch(`${endpoint}?${query}`, { method: "POST" });
    const data = await readJson(response);
    if (!response.ok) {
      return { ok: false, error: data.error ?? `Upload fehlgeschlagen (HTTP ${response.status}).` };
    }
    return {
      ok: true,
      path: String(data.path ?? ""),
      fileName: String(data.fileName ?? file.name),
      bytes: Number(data.bytes ?? file.size),
    };
  } catch (error) {
    return {
      ok: false,
      error: `Abschluss fehlgeschlagen: ${error instanceof Error ? error.message : "Netzwerkfehler"}.`,
    };
  }
}

/** Foliensvorlage (Medien → Vorlagen) einer Sprache. */
export function uploadSlideTemplate(
  file: File,
  locale: string,
  onProgress?: (done: number, total: number) => void,
): Promise<UploadResult> {
  return uploadInParts(file, TEMPLATE_ENDPOINT, { locale }, onProgress);
}

/** Foliensatz eines Briefings in einer Sprache. */
export function uploadTalkSlides(
  file: File,
  talkId: string,
  locale: string,
  onProgress?: (done: number, total: number) => void,
): Promise<UploadResult> {
  return uploadInParts(file, TALK_ENDPOINT, { locale, talk: talkId }, onProgress);
}
