import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getDispatchBySlug } from "@/lib/queries/dispatches";
import { formatDate } from "@/lib/format";
import { siteOrigin } from "@/lib/site";
import { blogPostingNode, breadcrumbNode, graph } from "@/lib/seo/jsonld";
import ContentArticle from "@/components/content/ContentArticle";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const d = await getDispatchBySlug(locale, slug);
  if (!d) return {};
  return {
    title: d.title,
    description: d.summary ?? undefined,
    openGraph: { title: d.title, description: d.summary ?? undefined },
  };
}

export default async function DispatchDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const d = await getDispatchBySlug(locale, slug);
  if (!d) notFound();

  const url = `${siteOrigin()}/${locale}/depeschen/${d.slug}`;
  const jsonLd = graph([
    blogPostingNode({
      headline: d.title,
      description: d.summary,
      url,
      datePublished: d.publishedAt ? d.publishedAt.toISOString() : null,
      dateModified: (d.reviewedAt ?? d.publishedAt)?.toISOString() ?? null,
    }),
    breadcrumbNode([
      { name: dict.dispatch.namePlural, url: `${siteOrigin()}/${locale}/depeschen` },
      { name: d.title, url },
    ]),
  ]);

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <JsonLd json={jsonLd} />
      <Link className="btn ghost" href={`/${locale}/depeschen`}>
        ← {dict.dispatch.namePlural}
      </Link>

      <article className="article" style={{ marginTop: 26 }}>
        <div className="artHead">
          <p className="meta" style={{ display: "flex", flexWrap: "wrap", gap: 8, alignItems: "center" }}>
            <span className="tag">{dict.dispatch.formats[d.format]}</span>
            {d.identities.map((i) => (
              <Link key={i.slug} href={`/${locale}/identitaeten/${i.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: i.color, display: "inline-block" }} />
                {i.name}
              </Link>
            ))}
          </p>
          <h1 style={{ fontSize: "clamp(30px,4.4vw,50px)", marginTop: 14 }}>{d.title}</h1>
          <p className="meta">
            {d.format === "REFERENCE" && d.reviewedAt ? (
              <>
                {dict.common.updated} <time dateTime={d.reviewedAt.toISOString()}>{formatDate(d.reviewedAt, locale)}</time>
              </>
            ) : (
              <>
                {dict.common.published}{" "}
                {d.publishedAt ? <time dateTime={d.publishedAt.toISOString()}>{formatDate(d.publishedAt, locale)}</time> : null}
              </>
            )}
          </p>
        </div>

        {d.sourceUrl ? (
          <a className="quoted-link" href={d.sourceUrl} target="_blank" rel="noopener noreferrer">
            <b>{d.sourceTitle ?? d.sourceUrl}</b>
            {d.sourceSite ? <span className="meta">{d.sourceSite}</span> : null}
          </a>
        ) : null}

        <ContentArticle
          bodyJson={d.bodyJson}
          context="dossier"
          locale={locale}
          contentLocale={d.contentLocale}
          fallbackNotice={d.fallback ? dict.langNotice.onlyGerman : undefined}
        />

        {d.topics.length > 0 ? (
          <p className="meta" style={{ marginTop: 24 }}>
            {d.topics.join(" · ")}
          </p>
        ) : null}
      </article>
    </section>
  );
}
