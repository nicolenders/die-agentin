import Link from "next/link";
import AssetImage from "@/components/media/AssetImage";
import { searchAdmin } from "@/lib/queries/admin-search";
import type { SearchPreview } from "@/lib/admin/search";
import {
  ENTITY_LABEL,
  SEARCH_ENTITIES,
  countByEntity,
  isSearchable,
  toSearchEntity,
  MIN_QUERY_LENGTH,
  type SearchHit,
} from "@/lib/admin/search";

export const metadata = { title: "Suche · Zentrale" };

/**
 * Vorschau eines Medientreffers. Bilder werden gezeigt; PDFs und Foliensätze
 * bekommen ihr Dateikürzel — ohne Renderer gäbe es davon kein Bild, und ein
 * Platzhalter, der so täte, wäre eine Lüge.
 */
function Preview({ preview }: { preview: SearchPreview }) {
  if (preview.kind === "image" && preview.url) {
    return (
      <AssetImage
        compact
        aiLabel="KI"
        src={preview.url}
        alt={preview.alt}
        ai={preview.ai}
        imgStyle={{
          width: 88,
          height: 56,
          objectFit: "contain",
          borderRadius: 4,
          background: "var(--surface-2, #1a1420)",
        }}
      />
    );
  }
  return (
    <span
      aria-hidden
      title={preview.alt}
      style={{
        display: "grid",
        placeItems: "center",
        width: 88,
        height: 56,
        borderRadius: 4,
        border: "1px solid var(--line-soft)",
        background: "var(--surface-2, #1a1420)",
        fontFamily: "var(--mono)",
        fontSize: 11,
        letterSpacing: "0.1em",
        color: "var(--muted)",
      }}
    >
      {preview.label}
    </span>
  );
}

// Ergebnisseite der globalen Suche. Gesucht wird über alle Bereiche; die Chips
// darunter filtern die Trefferliste auf einen Bereich (Zahl = Treffer dort).
export default async function AdminSearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; bereich?: string }>;
}) {
  const { q, bereich } = await searchParams;
  const term = (q ?? "").trim();
  const entity = toSearchEntity(bereich);

  let hits: SearchHit[] = [];
  let dbError = false;
  if (isSearchable(term)) {
    try {
      hits = await searchAdmin(term);
    } catch {
      dbError = true;
    }
  }

  const counts = countByEntity(hits);
  const shown = entity ? hits.filter((h) => h.entity === entity) : hits;
  const chipHref = (e: string | null) =>
    `/admin/suche?q=${encodeURIComponent(term)}${e ? `&bereich=${e}` : ""}`;

  return (
    <section>
      <h1>Suche</h1>
      <p className="muted">
        Findet Einsätze, Briefings, Depeschen, Identitäten, Publikationen, Ausbildung, Radar-Themen
        und Medien in einem Rutsch — Bilder, PDFs und die Foliensätze der Briefings eingeschlossen.
      </p>

      <form method="get" className="list-filter" role="search">
        <label className="f">
          Suchbegriff
          <input
            className="f"
            type="search"
            name="q"
            defaultValue={term}
            placeholder="z. B. Copilot, Lingen, MVP"
            style={{ minWidth: 280 }}
          />
        </label>
        {entity ? <input type="hidden" name="bereich" value={entity} /> : null}
        <button className="btn solid sm" type="submit">Suchen</button>
      </form>

      {dbError ? (
        <p className="st sched" style={{ display: "inline-block", marginTop: 16 }}>
          Datenbank wird geweckt … einen Moment.
        </p>
      ) : null}

      {!isSearchable(term) ? (
        <div className="card bracket" style={{ marginTop: 18 }}>
          <p className="muted" style={{ margin: 0 }}>
            Mindestens {MIN_QUERY_LENGTH} Zeichen eingeben, dann durchsuche ich alle Bereiche.
          </p>
        </div>
      ) : (
        <>
          <div className="filter-row" role="group" aria-label="Bereich filtern" style={{ marginTop: 18 }}>
            <Link className="chip sm" aria-current={entity === null ? "true" : undefined} href={chipHref(null)}>
              Alle ({hits.length})
            </Link>
            {SEARCH_ENTITIES.filter((e) => counts[e] > 0).map((e) => (
              <Link key={e} className="chip sm" aria-current={entity === e ? "true" : undefined} href={chipHref(e)}>
                {ENTITY_LABEL[e]} ({counts[e]})
              </Link>
            ))}
          </div>

          {shown.length === 0 ? (
            <div className="card bracket" style={{ marginTop: 18 }}>
              <p className="muted" style={{ margin: 0 }}>
                Nichts gefunden für „{term}“. Anderer Begriff oder weniger Zeichen?
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
            <table style={{ marginTop: 18 }}>
              <thead>
                <tr>
                  <th style={{ width: 100 }}>Vorschau</th>
                  <th>Bereich</th>
                  <th>Treffer</th>
                  <th>Einordnung</th>
                  <th>Status</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {shown.map((h) => (
                  <tr key={`${h.entity}-${h.id}`}>
                    <td style={{ width: 100 }}>{h.preview ? <Preview preview={h.preview} /> : null}</td>
                    <td className="meta" style={{ whiteSpace: "nowrap" }}>{ENTITY_LABEL[h.entity]}</td>
                    <td><b>{h.title}</b></td>
                    <td className="meta">{h.detail}</td>
                    <td>{h.status ? <span className="st">{h.status}</span> : null}</td>
                    <td style={{ whiteSpace: "nowrap", textAlign: "right" }}>
                      <Link className="btn ghost sm" href={h.href}>Öffnen</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </>
      )}
    </section>
  );
}
