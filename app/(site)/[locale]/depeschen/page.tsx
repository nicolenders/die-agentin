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
  searchParams: Promise<{ format?: string; thema?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { format, thema } = await searchParams;
  const dict = await getDictionary(locale);
  const isDe = locale === "de";

  const activeFormat: DispatchFormat | null = isOneOf(DISPATCH_FORMATS, format) ? format : null;
  const topicId = (thema ?? "").trim();
  const [all, radar] = await Promise.all([getPublishedDispatches(locale), getRadarTopics(locale)]);
  const activeTopic = topicId ? radar.find((r) => r.id === topicId) ?? null : null;
  const dispatches = all.filter(
    (d) =>
      (!activeFormat || d.format === activeFormat) &&
      (!activeTopic || d.focusTopicIds.includes(activeTopic.id)),
  );

  // Hinweistexte für KI-generierte Bilder in der Sprache der Seite.
  const aiLabels = aiImageLabels(locale);

  const topicSuffix = activeTopic ? `thema=${activeTopic.id}` : "";
  const filterHref = (f: DispatchFormat | null) => {
    const parts = [f ? `format=${f}` : "", topicSuffix].filter(Boolean);
    return `/${locale}/depeschen${parts.length ? `?${parts.join("&")}` : ""}`;
  };

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{dict.dispatch.eyebrow}</p>
      <h1 className="page-title">{dict.dispatch.headline}</h1>
      <p className="lead">{dict.dispatch.lead}</p>

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

      {/* Aus dem Radar heraus verlinkt: sichtbar machen, worauf gefiltert wird. */}
      {activeTopic ? (
        <p className="year-filter" style={{ marginTop: 12 }}>
          <Link
            className="chip"
            aria-current="true"
            href={`/${locale}/depeschen${activeFormat ? `?format=${activeFormat}` : ""}`}
          >
            {isDe ? "Thema" : "Topic"}: {activeTopic.title} ✕
          </Link>
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
        <div className="grid g2" style={{ marginTop: 26, alignItems: "stretch" }}>
          {dispatches.map((d) => (
            <Link key={d.id} href={`/${locale}/depeschen/${d.slug}`} className="card bracket" style={{ display: "flex", flexDirection: "column" }}>
              {/* Titelbild als Vorschau. Schlichtes <img> statt AssetImage: in
                  einer klickbaren Karte darf ein Bildklick nicht die Lightbox
                  öffnen, statt der Depesche zu folgen. Der KI-Hinweis bleibt
                  trotzdem sichtbar (SPEC §11). */}
              {d.hero ? (
                <span className="card-thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={d.hero.url} alt={d.hero.alt} loading="lazy" />
                  {d.hero.ai ? (
                    <span className="ai-badge compact" aria-label={aiLabels.aiGeneratedImage}>
                      {aiLabels.aiGenerated}
                    </span>
                  ) : null}
                </span>
              ) : null}
              <p className="meta" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center", margin: 0 }}>
                <span className="tag">{dict.dispatch.formats[d.format]}</span>
                {d.identities.map((i) => (
                  <span key={i.slug} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: i.color, display: "inline-block" }} />
                    {i.name}
                  </span>
                ))}
              </p>
              <h3 style={{ marginTop: 10 }}>{d.title}</h3>
              {d.summary ? <p style={{ flex: 1 }}>{d.summary}</p> : <span style={{ flex: 1 }} />}
              <p className="meta" style={{ margin: 0 }}>
                {d.format === "REFERENCE" && d.reviewedAt
                  ? `${dict.dispatch.updatedLabel} ${formatDate(d.reviewedAt, locale)}`
                  : formatDate(d.publishedAt, locale)}
              </p>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
