import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getPublishedDispatches } from "@/lib/queries/dispatches";
import { getRadarTopics } from "@/lib/queries/records";
import { alternatesFor } from "@/lib/seo/alternates";
import { formatDate } from "@/lib/format";
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

  const topicSuffix = activeTopic ? `thema=${activeTopic.id}` : "";
  const filterHref = (f: DispatchFormat | null) => {
    const parts = [f ? `format=${f}` : "", topicSuffix].filter(Boolean);
    return `/${locale}/depeschen${parts.length ? `?${parts.join("&")}` : ""}`;
  };

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <h1 className="eyebrow">{dict.dispatch.eyebrow}</h1>
      <p className="lead">{dict.dispatch.lead}</p>

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
          <p className="muted" style={{ margin: 0 }}>{dict.dispatch.empty}</p>
        </div>
      ) : (
        <div className="grid g2" style={{ marginTop: 26, alignItems: "stretch" }}>
          {dispatches.map((d) => (
            <Link key={d.id} href={`/${locale}/depeschen/${d.slug}`} className="card bracket" style={{ display: "flex", flexDirection: "column" }}>
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
