import type { Locale } from "@/lib/i18n/config";
import type { PublicationItem } from "@/lib/queries/records";
import { brandAsset } from "@/lib/brand-assets";
import BrandImage from "@/components/BrandImage";

// Publikationen-Layout (Bücher-Grid, Kurse, Repositories, Weitere) — aus der
// eigenständigen Seite ausgelagert, damit Identitäts-Detailseite und Lebenslauf
// dieselbe Darstellung nutzen.

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

  // Kompakte Darstellung (z. B. auf der Identitäts-Detailseite): dichte Liste
  // ohne große Cover — platzsparend.
  if (compact) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 16 }}>
        {items.map((p) => {
          const link = p.repoUrl ?? p.url;
          return (
            <div key={p.id} style={{ display: "flex", alignItems: "baseline", gap: 10, flexWrap: "wrap" }}>
              <span className="tag">{typeLabel(p.type, isDe)}</span>
              <b style={{ fontSize: "14.5px" }}>{p.title}</b>
              <span className="meta">{[p.year, p.role, p.publisher].filter(Boolean).join(" · ")}</span>
              {link ? (
                <a className="meta" href={link} target="_blank" rel="noopener noreferrer" aria-label={isDe ? "Öffnen" : "Open"}>↗</a>
              ) : null}
            </div>
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
                  <td>{typeLabel(o.type, isDe)}</td>
                  <td>{o.publisher ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}
    </>
  );
}
