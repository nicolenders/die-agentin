import Link from "next/link";
import type { DispatchPreview as DispatchPreviewData } from "@/lib/queries/dispatches";
import { locales, type Locale } from "@/lib/i18n/config";
import { formatDate } from "@/lib/format";
import DispatchArticle from "@/components/content/DispatchArticle";

// Rahmen der Depeschen-Vorschau (ADR 0033): ein Band, das unmissverständlich
// sagt, dass dies nicht die öffentliche Seite ist, ein Sprachumschalter und
// darunter exakt der Artikel, den die Detailseite zeigt — samt dem Hinweis,
// wenn eine Sprache fehlt und der deutsche Text einspringt.
//
// Die Vorschau ist ein Werkzeug der Redaktion; ihre Beschriftung ist deshalb —
// wie die ganze Zentrale — deutsch, unabhängig von der gezeigten Sprache.
export default function DispatchPreview({
  d,
  locale,
  basePath,
  editHref,
}: {
  d: DispatchPreviewData;
  locale: Locale;
  /** Pfad ohne Query, an den der Sprachumschalter `?lang=` hängt. */
  basePath: string;
  /** Nur in der Admin-Vorschau: zurück in die Maske. */
  editHref?: string;
}) {
  const when = d.publishedAt
    ? `${d.live ? "veröffentlicht" : "geplant für"} ${formatDate(d.publishedAt, "de")}`
    : "ohne Veröffentlichungsdatum";

  return (
    <main className="wrap" style={{ padding: "24px 0 90px" }}>
      <div className="preview-band" role="status">
        <span>
          ◉ VORSCHAU · Status {d.status} · {when}
        </span>
        <nav aria-label="Sprache der Vorschau" className="preview-band-langs">
          {locales.map((l) => (
            <Link
              key={l}
              href={`${basePath}?lang=${l}`}
              aria-current={l === locale ? "page" : undefined}
              className={l === locale ? "active" : undefined}
            >
              {l.toUpperCase()}
              {d.locales.includes(l) ? "" : " (fehlt)"}
            </Link>
          ))}
        </nav>
        {editHref ? (
          <Link href={editHref} className="preview-band-edit">
            Zur Bearbeitung
          </Link>
        ) : null}
      </div>
      <DispatchArticle d={d} locale={locale} />
    </main>
  );
}
