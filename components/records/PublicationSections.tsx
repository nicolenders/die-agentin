import type { Locale } from "@/lib/i18n/config";
import type { PublicationItem } from "@/lib/queries/records";
import { brandAsset } from "@/lib/brand-assets";
import BrandImage from "@/components/BrandImage";

// Publikationen-Layout (Bücher-Grid, Kurse, Repositories, Weitere) — aus der
// eigenständigen Seite ausgelagert, damit Identitäts-Detailseite und Lebenslauf
// dieselbe Darstellung nutzen.

// Kleine Inline-Icons für die Verkaufszahlen (gedruckt / PDF). Bewusst dezent,
// currentColor, damit sie neben der Zahl in einer Zeile stehen.
function PrintedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 2.2h6.2l1.8 1.8v9.8H4V2.2Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M6 6.2h4M6 8.6h4M6 11h2.6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

function PdfIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path
        d="M4 1.8h5l3 3v9.4H4V1.8Z"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
      <path d="M9 1.8V5h3" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
    </svg>
  );
}

function typeLabel(t: string, isDe: boolean): string {
  const de: Record<string, string> = {
    BOOK: "Buch", ARTICLE: "Fachartikel", WHITEPAPER: "Whitepaper", COURSE: "Kurs",
    REPOSITORY: "Repository", PODCAST: "Podcast", INTERVIEW: "Interview",
  };
  const en: Record<string, string> = {
    BOOK: "Book", ARTICLE: "Article", WHITEPAPER: "Whitepaper", COURSE: "Course",
    REPOSITORY: "Repository", PODCAST: "Podcast", INTERVIEW: "Interview",
  };
  return (isDe ? de : en)[t] ?? t;
}

export default function PublicationSections({
  items,
  locale,
  compact = false,
}: {
  items: PublicationItem[];
  locale: Locale;
  compact?: boolean;
}) {
  const isDe = locale === "de";

  // Kompakte Darstellung (z. B. auf der Identitäts-Detailseite): zweispaltiges
  // Raster, jede Karte mit kleinem Cover (Bücher/Kurse) neben Titel und Meta.
  if (compact) {
    return (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: 14,
          marginTop: 16,
        }}
      >
        {items.map((p) => {
          const link = p.repoUrl ?? p.url;
          const showCover = p.type === "BOOK" || p.type === "COURSE";
          const ratio = p.type === "COURSE" ? "16 / 9" : "2 / 3";
          const coverWidth = p.type === "COURSE" ? 96 : 60;
          return (
            <article
              key={p.id}
              className="card bracket"
              style={{ display: "flex", gap: 12, alignItems: "flex-start", padding: 14 }}
            >
              {showCover ? (
                <div style={{ flex: `0 0 ${coverWidth}px`, width: coverWidth }}>
                  <BrandImage
                    src={p.coverUrl ?? brandAsset(`cover-${p.id}.jpg`)}
                    alt={p.coverAlt || `Cover: ${p.title}`}
                    label="Cover"
                    sub={p.type === "COURSE" ? (isDe ? "Kurs" : "Course") : isDe ? "Buchcover" : "Book cover"}
                    ratio={ratio}
                    ai={p.coverAi}
                  />
                </div>
              ) : null}
              <div style={{ minWidth: 0, display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <span className="tag">{typeLabel(p.type, isDe)}</span>
                  {p.year ? <span className="pub-year">{p.year}</span> : null}
                </div>
                <b style={{ fontSize: "14.5px", lineHeight: 1.25 }}>{p.title}</b>
                {[p.role, p.publisher].filter(Boolean).length > 0 ? (
                  <span className="meta">{[p.role, p.publisher].filter(Boolean).join(" · ")}</span>
                ) : null}
                {link ? (
                  <a
                    className="btn ghost sm"
                    href={link}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ marginTop: "auto", alignSelf: "flex-start" }}
                  >
                    {isDe ? "Öffnen" : "Open"} ↗
                  </a>
                ) : null}
              </div>
            </article>
          );
        })}
      </div>
    );
  }

  const books = items.filter((p) => p.type === "BOOK");
  const courses = items.filter((p) => p.type === "COURSE");
  const repos = items.filter((p) => p.type === "REPOSITORY");
  const others = items.filter((p) => !["BOOK", "COURSE", "REPOSITORY"].includes(p.type));

  return (
    <>
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
                  <span className="tag">{typeLabel(b.type, isDe)}</span>
                  <span className="pub-year">{b.year}</span>
                </div>
                <h3 className="pub-title">{b.title}</h3>
                <p className="meta pub-meta">
                  {[b.role, b.publisher, b.isbn ? `ISBN ${b.isbn}` : null].filter(Boolean).join(" · ")}
                </p>
                {b.salesPrinted != null || b.salesPdf != null ? (
                  <p className="pub-sales">
                    {b.salesPrinted != null ? (
                      <span
                        className="pub-sale"
                        title={isDe ? "verkaufte gedruckte Exemplare" : "printed copies sold"}
                        aria-label={`${b.salesPrinted.toLocaleString("de-DE")} ${isDe ? "verkaufte gedruckte Exemplare" : "printed copies sold"}`}
                      >
                        <PrintedIcon />
                        {b.salesPrinted.toLocaleString("de-DE")}
                      </span>
                    ) : null}
                    {b.salesPdf != null ? (
                      <span
                        className="pub-sale"
                        title={isDe ? "verkaufte Exemplare als PDF" : "copies sold as PDF"}
                        aria-label={`${b.salesPdf.toLocaleString("de-DE")} ${isDe ? "verkaufte Exemplare als PDF" : "copies sold as PDF"}`}
                      >
                        <PdfIcon />
                        {b.salesPdf.toLocaleString("de-DE")}
                      </span>
                    ) : null}
                  </p>
                ) : null}
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

      {courses.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: books.length > 0 ? 40 : 26 }}>
            {isDe ? "Kurse & Trainings" : "Courses & trainings"}
          </p>
          <div className="pub-grid" style={{ marginTop: 18 }}>
            {courses.map((c) => (
              <article key={c.id} className="card bracket course-card">
                <BrandImage
                  src={c.coverUrl ?? brandAsset(`cover-${c.id}.jpg`)}
                  alt={c.coverAlt || `Thumbnail: ${c.title}`}
                  label={isDe ? "Kurs" : "Course"}
                  sub={c.publisher ?? "LinkedIn Learning"}
                  ratio="16 / 9"
                  ai={c.coverAi}
                />
                <div className="pub-body">
                  <div className="pub-tags">
                    <span className="tag">{typeLabel(c.type, isDe)}</span>
                    <span className="pub-year">{c.year}</span>
                  </div>
                  <h3 className="pub-title">{c.title}</h3>
                  <p className="meta pub-meta">{[c.role, c.publisher].filter(Boolean).join(" · ")}</p>
                  {c.url ? (
                    <a className="btn ghost sm pub-link" href={c.url} target="_blank" rel="noopener noreferrer">
                      {isDe ? "Zum Kurs" : "View course"}
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </>
      ) : null}

      {repos.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 40 }}>Repositories</p>
          <div className="grid g2" style={{ marginTop: 18, alignItems: "stretch" }}>
            {repos.map((r) => (
              <article key={r.id} className="card bracket" style={{ display: "flex", flexDirection: "column" }}>
                <div className="pub-tags">
                  <span className="tag">{typeLabel(r.type, isDe)}</span>
                  {r.language ? <span className="pub-year">{r.language}</span> : null}
                </div>
                <h3 style={{ marginTop: 8 }}>{r.title}</h3>
                {r.description ? <p style={{ flex: 1, fontSize: "14.5px" }}>{r.description}</p> : <span style={{ flex: 1 }} />}
                {r.repoUrl ?? r.url ? (
                  <a className="btn ghost sm" href={r.repoUrl ?? r.url ?? undefined} target="_blank" rel="noopener noreferrer" style={{ marginTop: "auto" }}>
                    {isDe ? "Zum Repository" : "View repository"} ↗
                  </a>
                ) : null}
              </article>
            ))}
          </div>
        </>
      ) : null}

      {others.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 40 }}>
            {isDe ? "Weitere Veröffentlichungen" : "Further publications"}
          </p>
          <table className="stack" role="table">
            <thead role="rowgroup">
              <tr role="row">
                <th scope="col" role="columnheader">{isDe ? "Jahr" : "Year"}</th>
                <th scope="col" role="columnheader">{isDe ? "Titel" : "Title"}</th>
                <th scope="col" role="columnheader">{isDe ? "Art" : "Type"}</th>
                <th scope="col" role="columnheader">{isDe ? "Medium" : "Medium"}</th>
              </tr>
            </thead>
            <tbody role="rowgroup">
              {others.map((o) => (
                <tr role="row" key={o.id}>
                  <td role="cell" data-label={isDe ? "Jahr" : "Year"}>{o.year}</td>
                  <td role="cell" data-label={isDe ? "Titel" : "Title"} data-primary="">{o.title}</td>
                  <td role="cell" data-label={isDe ? "Art" : "Type"}>{typeLabel(o.type, isDe)}</td>
                  <td role="cell" data-label={isDe ? "Medium" : "Medium"}>{o.publisher ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </>
  );
}
