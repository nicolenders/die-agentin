import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getSightings } from "@/lib/queries/records";
import { alternatesFor } from "@/lib/seo/alternates";
import { filterSightings, groupByYear, sightingFacets } from "@/lib/video/sightings";
import { youtubeWatchUrl } from "@/lib/video/youtube";
import { brandAsset } from "@/lib/brand-assets";
import BrandImage from "@/components/BrandImage";

export const dynamic = "force-dynamic";

// Die Galerie aller Videos, in denen die Agentin auftaucht.
//
// Kein iframe, keine Einbettung: Jede Kachel ist ein Link auf die kanonische
// watch-Adresse, und das Vorschaubild liegt in der eigenen Medienablage (ADR
// 0025). Ohne Klick entsteht keine Verbindung zu Google — bei einer Seite voller
// Videos ist das der Unterschied zwischen „eine Anfrage" und „hundert".

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.nav.sichtungen,
    description: dict.meta.sichtungen,
    alternates: alternatesFor(locale, "sichtungen"),
  };
}

function PlayBadge() {
  return (
    <span className="video-play" aria-hidden="true">
      <svg width="26" height="26" viewBox="0 0 26 26" fill="none">
        <path d="M9.5 7.2 19 13l-9.5 5.8V7.2Z" fill="currentColor" />
      </svg>
    </span>
  );
}

export default async function SichtungenPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ jahr?: string; kanal?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const sp = await searchParams;

  const all = await getSightings(locale);
  const facets = sightingFacets(all);
  const year = sp.jahr && facets.years.some((y) => String(y.value) === sp.jahr) ? sp.jahr : "";
  const channel = sp.kanal && facets.channels.some((c) => c.value === sp.kanal) ? sp.kanal : "";
  const shown = filterSightings(all, { year, channel });

  const t = dict.sightings;
  const href = (next: { jahr?: string; kanal?: string }) => {
    const params = new URLSearchParams();
    const y = next.jahr !== undefined ? next.jahr : year;
    const c = next.kanal !== undefined ? next.kanal : channel;
    if (y) params.set("jahr", y);
    if (c) params.set("kanal", c);
    const query = params.toString();
    return `/${locale}/sichtungen${query ? `?${query}` : ""}`;
  };
  const count = shown.length === 1 ? t.countOne : t.countMany.replace("{n}", String(shown.length));
  const filtering = Boolean(year || channel);
  const groups = groupByYear(shown);
  const hasFilters = facets.years.length > 1 || facets.channels.length > 1;

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{t.eyebrow}</p>
      <h1 className="page-title">{t.title}</h1>
      <p style={{ maxWidth: "68ch" }}>{t.lead}</p>

      {all.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 24 }}>
          <p className="muted" style={{ margin: 0 }}>{t.empty}</p>
        </div>
      ) : (
        <>
          {/* Der Filter ist eingeklappt.
              Bei 48 Aufnahmen aus 30 Kanälen füllten die Schaltflächen den
              ganzen ersten Bildschirm — man kam auf einer Video-Galerie an und
              sah kein einziges Video. Meistens will man ohnehin nur scrollen.
              `<details>` statt eines Umschalters im Browser: Es klappt ohne
              JavaScript auf, ist mit der Tastatur bedienbar und bringt seine
              Semantik mit. Ist gerade gefiltert, steht es offen — sonst wäre
              nicht zu sehen, warum weniger da ist. */}
          {hasFilters ? (
            <details className="sighting-filters" open={filtering}>
              <summary>
                <span className="sighting-filters-label">{t.filter}</span>
                {filtering ? (
                  <span className="meta">
                    {[year, channel].filter(Boolean).join(" · ")}
                  </span>
                ) : null}
              </summary>

              {facets.years.length > 1 ? (
                <div className="filter-row">
                  <span className="meta sighting-filters-group">{t.filterYear}</span>
                  <Link className="btn ghost sm" href={href({ jahr: "" })} aria-current={year === "" ? "true" : undefined}>
                    {t.all} ({all.length})
                  </Link>{" "}
                  {facets.years.map((y) => (
                    <span key={y.value}>
                      <Link
                        className="btn ghost sm"
                        href={href({ jahr: String(y.value) })}
                        aria-current={year === String(y.value) ? "true" : undefined}
                      >
                        {y.value} ({y.count})
                      </Link>{" "}
                    </span>
                  ))}
                </div>
              ) : null}

              {facets.channels.length > 1 ? (
                <div className="filter-row" style={{ marginTop: 10 }}>
                  <span className="meta sighting-filters-group">{t.filterChannel}</span>
                  <Link className="btn ghost sm" href={href({ kanal: "" })} aria-current={channel === "" ? "true" : undefined}>
                    {t.all}
                  </Link>{" "}
                  {facets.channels.map((c) => (
                    <span key={c.value}>
                      <Link
                        className="btn ghost sm"
                        href={href({ kanal: c.value })}
                        aria-current={channel === c.value ? "true" : undefined}
                      >
                        {c.value} ({c.count})
                      </Link>{" "}
                    </span>
                  ))}
                </div>
              ) : null}

              {filtering ? (
                <p style={{ marginTop: 14, marginBottom: 0 }}>
                  <Link className="btn ghost sm" href={`/${locale}/sichtungen`}>{t.reset}</Link>
                </p>
              ) : null}
            </details>
          ) : null}

          <p className="meta" style={{ marginTop: 16 }}>{count}</p>

          {shown.length === 0 ? (
            <div className="card bracket" style={{ marginTop: 16 }}>
              <p className="muted" style={{ margin: 0 }}>
                {t.noMatch} <Link href={`/${locale}/sichtungen`}>{t.reset}</Link>
              </p>
            </div>
          ) : null}

          {/* Nach Jahrgängen: Aus einer langen Liste wird eine Chronik, und man
              behält beim Scrollen das Gefühl dafür, wo man ist. */}
          {groups.map((group) => (
            <section key={group.year} className="sighting-year">
              <h2 className="sighting-year-head">
                <span>{group.year}</span>
                <span className="meta">
                  {group.items.length === 1 ? t.countOne : t.countMany.replace("{n}", String(group.items.length))}
                </span>
              </h2>
              <div className="video-grid">
                {group.items.map((v) => (
                  <article key={v.id} className="card bracket video-card sighting-card">
                    <a
                      className="sighting-main"
                      href={youtubeWatchUrl(v.videoId!)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="video-thumb">
                        <BrandImage
                          src={v.coverUrl ?? brandAsset(`cover-${v.id}.jpg`)}
                          alt={v.coverAlt || `${t.watch}: ${v.title}`}
                          label="YouTube"
                          sub={v.publisher ?? "YouTube"}
                          ratio="16 / 9"
                          ai={v.coverAi}
                          locale={locale}
                        />
                        <PlayBadge />
                      </div>
                      <div className="video-body">
                        <b className="video-title">{v.title}</b>
                        {v.publisher ? <span className="meta">{v.publisher}</span> : null}
                        <span className="meta video-cta">{t.watch} ↗</span>
                      </div>
                    </a>
                    {/* Der Weg zur Einsatzakte ist ein eigener Link und liegt
                        deshalb NEBEN dem Kachel-Link, nicht darin: Ein Link im
                        Link ist ungültiges HTML und für die Tastatur eine Falle.
                        Die Zeile steht auch dann da, wenn es keine Akte gibt —
                        nur leer und für Vorlesewerkzeuge unsichtbar. Sonst
                        rutschte „Aufnahme ansehen" bei diesen Kacheln nach
                        unten, und die Reihe hätte keine gemeinsame Grundlinie
                        mehr. */}
                    {v.mission ? (
                      <Link className="meta sighting-case" href={`/${locale}/einsaetze/${v.mission.slug}`}>
                        {t.caseFile}: {v.mission.eventName} ↗
                      </Link>
                    ) : (
                      <span className="meta sighting-case is-empty" aria-hidden="true">{"\u00A0"}</span>
                    )}
                  </article>
                ))}
              </div>
            </section>
          ))}

          <p className="meta" style={{ marginTop: 26, maxWidth: "68ch" }}>{t.externalNote}</p>
        </>
      )}
    </section>
  );
}
