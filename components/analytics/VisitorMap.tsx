import { countryPaths } from "@/lib/map/geo";
import { ISO_A2_TO_ID } from "@/lib/map/iso-a2-to-numeric";

export interface CountryDatum {
  key: string; // ISO alpha-2 (z. B. „DE"), „XX" = unbekannt
  views: number;
}

// Weltkarte der Besucherherkunft: Choropleth — Länder werden nach Aufrufzahl
// eingefärbt (dunkler = mehr). Serverseitig als inline SVG gerendert, dieselbe
// Natural-Earth-Projektion wie die Einsatz-Karte, keine Chart-Bibliothek.
export default function VisitorMap({
  data,
  emptyLabel,
  legendLabel,
}: {
  data: CountryDatum[];
  emptyLabel: string;
  legendLabel: string;
}) {
  const W = 760;
  const H = 388;
  const countries = countryPaths(W, H);

  const byId = new Map<string, number>();
  for (const d of data) {
    const id = ISO_A2_TO_ID[d.key.toUpperCase()];
    if (id) byId.set(id, (byId.get(id) ?? 0) + d.views);
  }
  const max = Math.max(1, ...byId.values());
  const hasData = byId.size > 0;

  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" aria-label="Besucher nach Land">
        {countries.map((c) => {
          const v = byId.get(c.id) ?? 0;
          const t = v > 0 ? Math.sqrt(v / max) : 0;
          return (
            <path
              key={c.id}
              d={c.path}
              fill={v > 0 ? "var(--violet-bright)" : "rgba(139, 92, 246, 0.06)"}
              fillOpacity={v > 0 ? 0.22 + 0.75 * t : 1}
              stroke="var(--line-soft)"
              strokeWidth={0.4}
            >
              {v > 0 ? <title>{`${c.name}: ${v}`}</title> : null}
            </path>
          );
        })}
      </svg>
      {hasData ? (
        <p className="meta" style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 8 }}>
          {legendLabel}
          <span
            aria-hidden
            style={{
              display: "inline-block",
              width: 90,
              height: 8,
              borderRadius: 4,
              background: "linear-gradient(90deg, rgba(139,92,246,0.25), var(--violet-bright))",
            }}
          />
          <span>1–{max}</span>
        </p>
      ) : (
        <p className="muted" style={{ marginTop: 8 }}>{emptyLabel}</p>
      )}
    </div>
  );
}
