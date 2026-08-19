import Link from "next/link";
import { notFound, permanentRedirect } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getDispatchBySlug } from "@/lib/queries/dispatches";
import { formatDate } from "@/lib/format";
import { siteOrigin } from "@/lib/site";
import { blogPostingNode, breadcrumbNode, graph } from "@/lib/seo/jsonld";
import { alternatesFor } from "@/lib/seo/alternates";
import { metaDescription } from "@/lib/seo/description";
import ContentArticle from "@/components/content/ContentArticle";
import JsonLd from "@/components/JsonLd";
import AssetImage from "@/components/media/AssetImage";
import { absoluteAssetUrl } from "@/lib/media/hero";
import { aiImageLabels } from "@/lib/media/ai-labels";
import { getRedirectTarget } from "@/lib/queries/redirects";


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
  const description = metaDescription(d.summary);
  // Titelbild als Vorschaubild beim Teilen — absolut, weil OpenGraph keine
  // relativen Pfade auflöst.
  const hero = d.hero;
  return {
    title: d.title,
    description,
    alternates: alternatesFor(locale, `depeschen/${d.slug}`),
    openGraph: {
      title: d.title,
      description,
      ...(hero
        ? {
            images: [
              {
                url: absoluteAssetUrl(hero.url, siteOrigin()),
                width: hero.width,
                height: hero.height,
                alt: hero.alt,
              },
            ],
          }
        : {}),
    },
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
  if (!d) {
    // Ein umbenannter Slug darf die alte Adresse nicht fallen lassen. Die
    // Weiterleitungen aus den Stammdaten werden hier eingelöst — bisher wurden
    // sie gepflegt, aber nie angewendet.
    const target = await getRedirectTarget(locale, slug, ["post", "dossier"]);
    if (target && target !== slug) permanentRedirect(`/${locale}/depeschen/${target}`);
    notFound();
  }

  const aiLabels = aiImageLabels(locale);

  const url = `${siteOrigin()}/${locale}/depeschen/${d.slug}`;
  const jsonLd = graph([
    blogPostingNode({
      headline: d.title,
      description: d.summary,
      url,
      datePublished: d.publishedAt ? d.publishedAt.toISOString() : null,
      dateModified: (d.reviewedAt ?? d.publishedAt)?.toISOString() ?? null,
      image: d.hero ? absoluteAssetUrl(d.hero.url, siteOrigin()) : null,
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
        {/* Kopf: Text links, Titelbild rechts. Über die volle Breite gesetzt
            schob das Bild den Anfang des Textes aus dem Sichtfeld — es soll den
            Inhalt begleiten, nicht vor ihm stehen. */}
        <div className={`artHead${d.hero ? " with-media" : ""}`}>
          <div>
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

          {/* AssetImage, weil hier — anders als in der Liste — der Klick die
              große Ansicht öffnen darf; der KI-Hinweis steht in der Sprache der
              Seite (SPEC §11). */}
          {d.hero ? (
            <figure className="art-hero">
              <AssetImage
                src={d.hero.url}
                alt={d.hero.alt}
                ai={d.hero.ai}
                aiLabel={aiLabels.aiGenerated}
                aiTitle={aiLabels.aiGeneratedImage}
                loading="eager"
              />
            </figure>
          ) : null}
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
