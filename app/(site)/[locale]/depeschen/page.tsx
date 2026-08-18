import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getPublishedDispatches } from "@/lib/queries/dispatches";
import { getRadarTopics } from "@/lib/queries/records";
import { alternatesFor } from "@/lib/seo/alternates";
import { formatDate } from "@/lib/format";
import { aiImageLabels } from "@/lib/media/ai-labels";
import { DISPATCH_FORMATS, isOneOf, type DispatchFormat } from "@/lib/domain";
import {
  dispatchYears,
  matchesDispatchSearch,
  matchesDispatchYear,
  parseDispatchYear,
} from "@/lib/dispatches/filter";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.dispatch.namePlural,
    description: dict.meta.depeschen,
    alternates: alternatesFor(locale, "depeschen"),
  };
}

export default async function DepeschenPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ format?: string; thema?: string; jahr?: string; q?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { format, thema, jahr, q } = await searchParams;
  const dict = await getDictionary(locale);
  const isDe = locale === "de";

  const activeFormat: DispatchFormat | null = isOneOf(DISPATCH_FORMATS, format) ? format : null;
  const activeYear = parseDispatchYear(jahr);
  const query = (q ?? "").trim();
  const topicId = (thema ?? "").trim();
  const [all, radar] = await Promise.all([getPublishedDispatches(locale), getRadarTopics(locale)]);
  const activeTopic = topicId ? radar.find((r) => r.id === topicId) ?? null : null;
  const dispatches = all.filter(
    (d) =>
      (!activeFormat || d.format === activeFormat) &&
      (!activeTopic || d.focusTopicIds.includes(activeTopic.id)) &&
      matchesDispatchYear(d, activeYear) &&
      matchesDispatchSearch(d, query),
  );

  // Jahre mit Depeschen — ein Blib je Jahr, keine leeren Jahre dazwischen.
  const years = dispatchYears(all);
  const filtered = Boolean(activeFormat || activeTopic || activeYear || query);

  // Hinweistexte für KI-generierte Bilder in der Sprache der Seite.
  const aiLabels = aiImageLabels(locale);

  // Alle Filter stehen in der Adresse und lassen sich verlinken; jeder Blib
  // ändert genau seinen Teil und lässt die übrigen stehen.
  const hrefWith = (patch: {
    format?: DispatchFormat | null;
    jahr?: number | null;
    q?: string | null;
  }) => {
    const nextFormat = patch.format === undefined ? activeFormat : patch.format;
    const nextYear = patch.jahr === undefined ? activeYear : patch.jahr;
    const nextQuery = patch.q === undefined ? query : (patch.q ?? "");
    const parts = [
      nextFormat ? `format=${nextFormat}` : "",
      activeTopic ? `thema=${activeTopic.id}` : "",
      nextYear ? `jahr=${nextYear}` : "",
      nextQuery ? `q=${encodeURIComponent(nextQuery)}` : "",
    ].filter(Boolean);
    return `/${locale}/depeschen${parts.length ? `?${parts.join("&")}` : ""}`;
  };
  const filterHref = (f: DispatchFormat | null) => hrefWith({ format: f });
  // „Thema ✕" nimmt nur das Thema weg und lässt Format, Jahr und Suche stehen.
  const topicClearedHref = (() => {
    const parts = [
      activeFormat ? `format=${activeFormat}` : "",
      activeYear ? `jahr=${activeYear}` : "",
      query ? `q=${encodeURIComponent(query)}` : "",
    ].filter(Boolean);
    return `/${locale}/depeschen${parts.length ? `?${parts.join("&")}` : ""}`;
  })();

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{dict.dispatch.eyebrow}</p>
      <h1 className="page-title">{dict.dispatch.headline}</h1>
      <p className="lead">{dict.dispatch.lead}</p>

      {/* Suche als gewöhnliches GET-Formular: der Suchbegriff steht damit in der
          Adresse (teilbar, zurück-Taste funktioniert) und die Seite bleibt eine
          Server Component — kein JavaScript nötig, um zu suchen. Die übrigen
          Filter reisen als versteckte Felder mit. */}
      {all.length > 0 ? (
        <form
          action={`/${locale}/depeschen`}
          method="get"
          role="search"
          className="filter-row"
          style={{ marginTop: 20 }}
        >
          {activeFormat ? <input type="hidden" name="format" value={activeFormat} /> : null}
          {activeTopic ? <input type="hidden" name="thema" value={activeTopic.id} /> : null}
          {activeYear ? <input type="hidden" name="jahr" value={activeYear} /> : null}
          <input
            className="f"
            type="search"
            name="q"
            defaultValue={query}
            placeholder={dict.dispatch.searchPlaceholder}
            aria-label={dict.dispatch.searchLabel}
            style={{ maxWidth: 320 }}
          />
          <button className="btn ghost sm" type="submit">
            {dict.dispatch.searchSubmit}
          </button>
          {query ? (
            <Link className="btn ghost sm" href={hrefWith({ q: null })}>
              {dict.dispatch.searchClear}
            </Link>
          ) : null}
        </form>
      ) : null}

      {/* Vier Format-Filter für null Inhalte sind eine leere Geste (Audit 6.3):
          die Chips erscheinen erst, wenn es überhaupt etwas zu filtern gibt. */}
      {all.length > 0 ? (
        <div className="year-filter" role="group" aria-label={dict.dispatch.filterByFormat} style={{ marginTop: 20 }}>
          <Link className="chip" aria-current={activeFormat === null ? "true" : undefined} href={filterHref(null)}>
            {dict.common.all}
          </Link>
          {DISPATCH_FORMATS.map((f) => (
            <Link key={f} className="chip" aria-current={activeFormat === f ? "true" : undefined} href={filterHref(f)}>
              {dict.dispatch.formats[f]}
            </Link>
          ))}
        </div>
      ) : null}

      {/* Ein Blib je Jahr, in dem es Depeschen gibt. Bei nur einem Jahrgang wäre
          der Filter eine Attrappe — dann erscheint er nicht. */}
      {years.length > 1 ? (
        <div className="year-filter" role="group" aria-label={dict.dispatch.filterByYear} style={{ marginTop: 10 }}>
          <Link className="chip" aria-current={activeYear === null ? "true" : undefined} href={hrefWith({ jahr: null })}>
            {dict.dispatch.yearAll}
          </Link>
          {years.map((y) => (
            <Link key={y} className="chip" aria-current={activeYear === y ? "true" : undefined} href={hrefWith({ jahr: y })}>
              {y}
            </Link>
          ))}
        </div>
      ) : null}

      {/* Aus dem Radar heraus verlinkt: sichtbar machen, worauf gefiltert wird. */}
      {activeTopic ? (
        <p className="year-filter" style={{ marginTop: 12 }}>
          <Link
            className="chip"
            aria-current="true"
            href={topicClearedHref}
          >
            {isDe ? "Thema" : "Topic"}: {activeTopic.title} ✕
          </Link>
        </p>
      ) : null}

      {/* Bei aktivem Filter sagen, wie viel von wie viel zu sehen ist — sonst
          wirkt eine kurze Liste wie ein leerer Bestand. */}
      {filtered && dispatches.length > 0 ? (
        <p className="meta" style={{ marginTop: 14, marginBottom: 0 }}>
          {dispatches.length} {dict.dispatch.countOf} {all.length} {dict.dispatch.namePlural}
        </p>
      ) : null}

      {dispatches.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 26 }}>
          {/* Ein leerer Zustand ist eine Einladung zum Weitergehen, kein
              trauriger Satz (CLAUDE.md, Audit 6.3). Solange gar nichts da ist,
              führt der Weg in die Einsätze; ein leerer Filter sagt das auch. */}
          <p className="muted" style={{ margin: 0 }}>
            {all.length === 0 ? dict.dispatch.empty : dict.dispatch.emptyFiltered}
          </p>
          {all.length === 0 ? (
            <p style={{ marginTop: 14, marginBottom: 0 }}>
              <Link className="btn solid sm" href={`/${locale}/einsaetze`}>
                {dict.nav.einsaetze}
              </Link>
            </p>
          ) : null}
        </div>
      ) : (
        <div className="dispatch-list" style={{ marginTop: 26 }}>
          {dispatches.map((d) => (
            <Link
              key={d.id}
              href={`/${locale}/depeschen/${d.slug}`}
              className={`dispatch-row${d.hero ? "" : " no-media"}`}
            >
              {/* Titelbild als Begleiter der Zeile. Schlichtes <img> statt
                  AssetImage: in einer klickbaren Zeile muss der Klick aufs Bild
                  der Depesche folgen und darf nicht die Lightbox öffnen. Der
                  KI-Hinweis bleibt trotzdem sichtbar (SPEC §11). */}
              {d.hero ? (
                <span className="dispatch-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.hero.url} alt={d.hero.alt} loading="lazy" />
                  {d.hero.ai ? (
                    <span className="ai-badge compact" aria-label={aiLabels.aiGeneratedImage}>
                      {aiLabels.aiGenerated}
                    </span>
                  ) : null}
                </span>
              ) : null}
              <div>
                <p className="meta dispatch-tags">
                  <span className="tag">{dict.dispatch.formats[d.format]}</span>
                  {d.identities.map((i) => (
                    <span key={i.slug} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                      <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: i.color, display: "inline-block" }} />
                      {i.name}
                    </span>
                  ))}
                </p>
                <h3 className="dispatch-title">{d.title}</h3>
                {d.summary ? <p className="dispatch-summary">{d.summary}</p> : null}
                <p className="meta dispatch-date">
                  {d.format === "REFERENCE" && d.reviewedAt
                    ? `${dict.dispatch.updatedLabel} ${formatDate(d.reviewedAt, locale)}`
                    : formatDate(d.publishedAt, locale)}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
