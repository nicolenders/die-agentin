import { indexNowKey } from "@/lib/seo/indexnow";

export const dynamic = "force-dynamic";

// Der IndexNow-Schlüssel als Textdatei. Suchmaschinen rufen diese URL ab und
// vergleichen ihren Inhalt mit dem Schlüssel in der Meldung — so ist belegt,
// dass wer meldet, auch Zugriff auf die Domain hat.
//
// Das Protokoll erlaubt einen freien Ort für die Datei, solange die Meldung ihn
// als `keyLocation` mitschickt. Deshalb ein sprechender Pfad statt einer nach
// dem Schlüssel benannten Datei im Wurzelverzeichnis: hier ist auf einen Blick
// erkennbar, wozu die Route gehört.
//
// Ohne konfigurierten Schlüssel gibt es die Datei nicht — dann meldet auch
// niemand etwas, und eine leere Datei wäre eine Falschaussage.
export async function GET() {
  const key = indexNowKey();
  if (!key) {
    return new Response("Nicht gefunden.", {
      status: 404,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return new Response(key, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
