import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getPostBySlug } from "@/lib/queries/posts";
import { formatDate } from "@/lib/format";
import type { PostType } from "@/lib/domain";
import ContentArticle from "@/components/content/ContentArticle";

export const dynamic = "force-dynamic";

const tagClass: Record<PostType, string> = {
  SIGNAL: "signal",
  NOTE: "notiz",
  BACKSTAGE: "backstage",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const post = await getPostBySlug(locale, slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.summary ?? undefined,
    openGraph: { title: post.title, description: post.summary ?? undefined },
  };
}

export default async function PostDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const post = await getPostBySlug(locale, slug);
  if (!post) notFound();

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <Link className="btn ghost" href={`/${locale}/signale`}>
        ← {dict.nav.signale}
      </Link>

      <article className="article" style={{ marginTop: 26 }}>
        <div className="artHead">
          <span className={`tag ${tagClass[post.type]}`}>{dict.feed.types[post.type]}</span>
          <h1 style={{ fontSize: "clamp(30px,4.4vw,50px)", marginTop: 14 }}>{post.title}</h1>
          <p className="meta">
            {dict.common.published} {formatDate(post.publishedAt, locale)}
          </p>
        </div>

        {post.type === "SIGNAL" && post.sourceUrl ? (
          <a
            className="quoted-link"
            href={post.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            <b>{post.sourceTitle ?? post.sourceUrl}</b>
            {post.sourceSite ? <span className="meta">{post.sourceSite}</span> : null}
          </a>
        ) : null}

        <ContentArticle
          bodyJson={post.bodyJson}
          context="post"
          locale={locale}
          contentLocale={post.contentLocale}
          fallbackNotice={post.fallback ? dict.langNotice.onlyGerman : undefined}
        />
      </article>
    </section>
  );
}
