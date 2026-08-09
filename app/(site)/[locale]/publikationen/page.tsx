import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getPublications } from "@/lib/queries/records";
import { brandAsset } from "@/lib/brand-assets";
import BrandImage from "@/components/BrandImage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav.publikationen };
}

export default async function PublikationenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isDe = locale === "de";
  const all = await getPublications(locale);
  const books = all.filter((p) => p.type === "BOOK");
  const others = all.filter((p) => p.type !== "BOOK");

  const typeLabel = (t: string) =>
    isDe
      ? { BOOK: "Buch", ARTICLE: "Fachartikel", WHITEPAPER: "Whitepaper" }[t] ?? t
      : { BOOK: "Book", ARTICLE: "Article", WHITEPAPER: "Whitepaper" }[t] ?? t;

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{isDe ? "Publikationen" : "Publications"}</p>
      <h2>{isDe ? "Schriftlich festgehalten" : "Put down in writing"}</h2>

      {books.length > 0 ? (
        <div className="pub-grid" style={{ marginTop: 26 }}>
          {books.map((b) => (
            <article key={b.id} className="card bracket pub-card">
              <BrandImage
                src={b.coverUrl ?? brandAsset(`cover-${b.id}.jpg`)}
                alt={b.coverAlt || `Cover: ${b.title}`}
                label="Cover"
                sub={isDe ? "Buchcover" : "Book cover"}
                ratio="2 / 3"
                ai={b.coverAi}
              />
              <div className="pub-body">
                <div className="pub-tags">
                  <span className="tag">{typeLabel(b.type)}</span>
                  <span className="pub-year">{b.year}</span>
                </div>
                <h3 className="pub-title">{b.title}</h3>
                <p className="meta pub-meta">
                  {[b.role, b.publisher, b.isbn ? `ISBN ${b.isbn}` : null].filter(Boolean).join(" · ")}
                </p>
                {b.url ? (
                  <a className="btn ghost sm pub-link" href={b.url} target="_blank" rel="noopener noreferrer">
                    {isDe ? "Weitere Infos" : "More info"}
                  </a>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      ) : null}

      {others.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 40 }}>
            {isDe ? "Weitere Veröffentlichungen" : "Further publications"}
          </p>
          <table>
            <thead>
              <tr>
                <th>{isDe ? "Jahr" : "Year"}</th>
                <th>{isDe ? "Titel" : "Title"}</th>
                <th>{isDe ? "Art" : "Type"}</th>
                <th>{isDe ? "Medium" : "Medium"}</th>
              </tr>
            </thead>
            <tbody>
              {others.map((o) => (
                <tr key={o.id}>
                  <td>{o.year}</td>
                  <td>{o.title}</td>
                  <td>{typeLabel(o.type)}</td>
                  <td>{o.publisher ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {all.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 24 }}>
          <p className="muted">{isDe ? "Noch keine Publikationen erfasst." : "No publications yet."}</p>
        </div>
      ) : null}
    </section>
  );
}
