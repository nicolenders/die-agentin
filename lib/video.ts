// YouTube-Video-ID aus einer URL extrahieren (Phase 9.2). Für die
// datenschutzfreundliche Zwei-Klick-Einbettung (VideoConsent). Reine Funktion.

export function extractYouTubeId(input: string | null | undefined): string | null {
  if (!input) return null;
  const value = input.trim();
  // Schon eine reine ID (11 Zeichen, YouTube-Alphabet).
  if (/^[a-zA-Z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    const host = url.hostname.replace(/^www\./, "");
    if (host === "youtu.be") {
      const id = url.pathname.slice(1).split("/")[0];
      return id && /^[a-zA-Z0-9_-]{11}$/.test(id) ? id : null;
    }
    if (host.endsWith("youtube.com") || host.endsWith("youtube-nocookie.com")) {
      const v = url.searchParams.get("v");
      if (v && /^[a-zA-Z0-9_-]{11}$/.test(v)) return v;
      const m = url.pathname.match(/\/(embed|shorts|v)\/([a-zA-Z0-9_-]{11})/);
      if (m) return m[2]!;
    }
  } catch {
    return null;
  }
  return null;
}
