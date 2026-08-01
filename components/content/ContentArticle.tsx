import { sanitizeDocument } from "@/lib/content/sanitize";
import { collectAssetIds } from "@/lib/content/assets";
import type { ContentContext } from "@/lib/content/schema";
import { resolveAssets } from "@/lib/queries/media";
import type { Locale } from "@/lib/i18n/config";
import RenderDocument from "./RenderDocument";

// Server-Komponente: nimmt ein gespeichertes bodyJson, bereinigt es erneut
// (Verteidigung in der Tiefe), löst Medien auf und rendert es. Wird von den
// öffentlichen Detailseiten genutzt; der Editor nutzt denselben RenderDocument.
export default async function ContentArticle({
  bodyJson,
  context,
  locale,
  contentLocale,
  fallbackNotice,
}: {
  bodyJson: string;
  context: ContentContext;
  locale: Locale;
  /** Sprache des tatsächlich gezeigten Inhalts (für lang-Attribut, SPEC §8). */
  contentLocale: Locale;
  /** Text des Fallback-Hinweises, falls die gewünschte Sprache fehlte. */
  fallbackNotice?: string;
}) {
  let parsed: unknown;
  try {
    parsed = JSON.parse(bodyJson);
  } catch {
    parsed = null;
  }
  const doc = sanitizeDocument(parsed, context);
  const assets = await resolveAssets(collectAssetIds(doc), contentLocale);

  return (
    <>
      {fallbackNotice ? (
        <p className="lang-fallback" role="note">
          {fallbackNotice}
        </p>
      ) : null}
      <div lang={contentLocale}>
        <RenderDocument doc={doc} assets={assets} locale={locale} />
      </div>
    </>
  );
}
