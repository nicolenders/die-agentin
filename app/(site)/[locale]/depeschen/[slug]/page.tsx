import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getDispatchBySlug } from "@/lib/queries/dispatches";
import { siteOrigin } from "@/lib/site";
import { blogPostingNode, breadcrumbNode, graph } from "@/lib/seo/jsonld";
import { alternatesFor } from "@/lib/seo/alternates";
import { metaDescription } from "@/lib/seo/description";
import JsonLd from "@/components/JsonLd";
import DispatchArticle from "@/components/content/DispatchArticle";
import { absoluteAssetUrl } from "@/lib/media/hero";

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
  if (!d) notFound();

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

      <DispatchArticle d={d} locale={locale} />
    </section>
  );
}
