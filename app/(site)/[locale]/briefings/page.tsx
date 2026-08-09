import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getBriefingCatalog, getBriefingRanking } from "@/lib/queries/briefings";
import { formatDate } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav.briefings };
}

function parseDate(value: string | undefined): Date | undefined {
  if (!value) return undefined;
  const d = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export default async function BriefingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ von?: string; bis?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { von, bis } = await searchParams;
  const isDe = locale === "de";

  const catalog = await getBriefingCatalog(locale);
  const ranking = await getBriefingRanking(locale, {
    from: parseDate(von),
    to: parseDate(bis),
  });
  const max = ranking[0]?.total ?? 1;

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{isDe ? "Briefings · Vortragsrepertoire" : "Briefings · talk repertoire"}</p>
      <h2>{isDe ? "Was ich mitbringe" : "What I bring"}</h2>
      <p className="lead">
        {isDe
          ? "Die Vorträge, ihre Kategorien und die Sprachverfügbarkeit."
          : "The talks, their categories and language availability."}
      </p>

      {catalog.map((cat) => (
        <div key={cat.id} style={{ marginTop: 34 }}>
          <p className="eyebrow">{cat.name}</p>
          <div className="grid g2">
            {cat.talks.map((t) => (
              <article key={t.id} className="card bracket">
                <h3>{t.title}</h3>
                {t.abstract ? <p style={{ fontSize: "14.5px" }}>{t.abstract}</p> : null}
                {t.audiences.length > 0 ? (
                  <p className="meta">
                    {isDe ? "Für: " : "For: "}
                    {t.audiences.join(" · ")}
                  </p>
                ) : null}
                <p className="meta">
                  {t.deCount + t.enCount}× {isDe ? "gehalten" : "delivered"}
                  {t.level ? ` · Level ${t.level}` : ""}
                  {t.durationMin ? ` · ${t.durationMin} Min.` : ""}
                </p>
                <p>
                  <span className={`lang-badge ${t.deCount > 0 ? "on" : ""}`}>DE {t.deCount > 0 ? `✓ ${t.deCount}×` : "—"}</span>{" "}
                  <span className={`lang-badge ${t.enCount > 0 ? "on" : ""}`}>EN {t.enCount > 0 ? `✓ ${t.enCount}×` : "—"}</span>
                </p>
              </article>
            ))}
          </div>
        </div>
      ))}

      <p className="eyebrow" style={{ marginTop: 44 }}>
        {isDe ? "Ranking · nach Häufigkeit" : "Ranking · by frequency"}
      </p>
      <div className="card bracket" style={{ padding: 24 }}>
        <form method="get" style={{ display: "flex", gap: 14, flexWrap: "wrap", alignItems: "center", marginBottom: 20 }}>
          <span className="meta">{isDe ? "Zeitraum" : "Period"}</span>
          <input className="f" style={{ maxWidth: 170 }} type="date" name="von" defaultValue={von ?? ""} aria-label={isDe ? "von" : "from"} />
          <span className="meta">{isDe ? "bis" : "to"}</span>
          <input className="f" style={{ maxWidth: 170 }} type="date" name="bis" defaultValue={bis ?? ""} aria-label={isDe ? "bis" : "to"} />
          <button className="btn" style={{ padding: "9px 16px" }} type="submit">
            {isDe ? "Auswerten" : "Evaluate"}
          </button>
        </form>

        {ranking.length === 0 ? (
          <p className="muted">{isDe ? "Keine Einsätze im Zeitraum." : "No deliveries in this period."}</p>
        ) : (
          ranking.map((r, i) => (
            <div className="rank-row" key={r.talkId}>
              <span className="n">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <b>{r.title}</b>
                <div className="bar" style={{ marginTop: 7 }}>
                  <i style={{ width: `${Math.round((r.total / max) * 100)}%` }} />
                </div>
              </div>
              <span className="meta">
                {r.total} {isDe ? "Einsätze" : "deliveries"}
              </span>
              <span className="meta">
                DE {r.de} / EN {r.en}
                {r.lastHeld ? ` · ${formatDate(r.lastHeld, locale)}` : ""}
              </span>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
