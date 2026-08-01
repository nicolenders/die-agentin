import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getPublishedDossiers } from "@/lib/queries/dossiers";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav.dossiers };
}

export default async function DossiersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const dossiers = await getPublishedDossiers(locale);

  // Nach Kategorie gruppieren.
  const groups = new Map<string, typeof dossiers>();
  for (const d of dossiers) {
    const key = d.categoryName ?? "—";
    const list = groups.get(key);
    if (list) list.push(d);
    else groups.set(key, [d]);
  }

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">
        {locale === "de" ? "Dossiers · Wissen mit Haltbarkeit" : "Dossiers · lasting knowledge"}
      </p>
      <h2>{locale === "de" ? "Nachschlagen statt suchen" : "Look up, don't search"}</h2>
      <p className="lead">
        {locale === "de"
          ? "Gepflegte Wissensseiten mit Änderungsdatum, damit du weißt, worauf du dich verlässt."
          : "Curated knowledge pages with a change date, so you know what you can rely on."}
      </p>

      {dossiers.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 24 }}>
          <p className="eyebrow">{dict.common.emptyTitle}</p>
          <p className="muted">
            {locale === "de"
              ? "Die ersten Dossiers entstehen gerade."
              : "The first dossiers are in the making."}
          </p>
        </div>
      ) : (
        [...groups.entries()].map(([category, items]) => (
          <div key={category} style={{ marginTop: 30 }}>
            <p className="eyebrow">{category}</p>
            <div className="grid g3">
              {items.map((d) => (
                <Link
                  key={d.id}
                  className="card bracket"
                  href={`/${locale}/dossiers/${d.slug}`}
                  style={{ color: "inherit" }}
                >
                  <span className="tag dossier">Dossier</span>
                  <h3 style={{ marginTop: 12 }}>{d.title}</h3>
                  {d.summary ? <p style={{ fontSize: "14.5px" }}>{d.summary}</p> : null}
                  <p className="meta">
                    {dict.common.updated} {formatDate(d.reviewedAt, locale)}
                    {d.fallback ? ` · ${dict.langNotice.onlyGermanShort}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </div>
        ))
      )}
    </section>
  );
}
