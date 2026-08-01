import { db } from "@/lib/db";
import { cachedQuery, tags } from "@/lib/cache";
import { pickTranslation } from "@/lib/content/pick";
import type { Locale } from "@/lib/i18n/config";
import type { PostType } from "@/lib/domain";

export interface PostCard {
  id: string;
  type: PostType;
  publishedAt: Date | null;
  slug: string;
  title: string;
  summary: string | null;
  fallback: boolean;
  contentLocale: Locale;
  tags: { slug: string; nameDe: string; nameEn: string }[];
}

// Alle veröffentlichten Beiträge als Karten für Feed und HQ. Gecacht und
// getaggt (SPEC §2.1). Fehlt die gewünschte Sprache, wird DE als Anzeige
// gewählt (mit Fallback-Kennzeichnung).
async function loadPublishedPosts(locale: Locale): Promise<PostCard[]> {
  const posts = await db.post.findMany({
    where: { status: "PUBLISHED" },
    orderBy: { publishedAt: "desc" },
    include: {
      translations: true,
      tags: { include: { tag: true } },
    },
  });

  const cards: PostCard[] = [];
  for (const post of posts) {
    const picked = pickTranslation(post.translations, locale);
    if (!picked) continue;
    cards.push({
      id: post.id,
      type: post.type as PostType,
      publishedAt: post.publishedAt,
      slug: picked.translation.slug,
      title: picked.translation.title,
      summary: picked.translation.summary,
      fallback: picked.fallback,
      contentLocale: picked.contentLocale,
      tags: post.tags.map((pt) => pt.tag),
    });
  }
  return cards;
}

export async function getPublishedPosts(locale: Locale): Promise<PostCard[]> {
  const run = cachedQuery(loadPublishedPosts, ["posts", locale], [tags.postList(locale)]);
  try {
    return await run(locale);
  } catch {
    return [];
  }
}

export interface PostDetail {
  id: string;
  type: PostType;
  publishedAt: Date | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceSite: string | null;
  slug: string;
  title: string;
  summary: string | null;
  bodyJson: string;
  fallback: boolean;
  contentLocale: Locale;
}

async function loadPostBySlug(locale: Locale, slug: string): Promise<PostDetail | null> {
  // Slug ist je Sprache eindeutig; über die Übersetzung den Beitrag finden.
  const translation = await db.postTranslation.findFirst({
    where: { slug, post: { status: "PUBLISHED" } },
    include: { post: { include: { translations: true } } },
  });
  if (!translation) return null;

  const post = translation.post;
  const picked = pickTranslation(post.translations, locale);
  if (!picked) return null;

  return {
    id: post.id,
    type: post.type as PostType,
    publishedAt: post.publishedAt,
    sourceUrl: post.sourceUrl,
    sourceTitle: post.sourceTitle,
    sourceSite: post.sourceSite,
    slug: picked.translation.slug,
    title: picked.translation.title,
    summary: picked.translation.summary,
    bodyJson: picked.translation.bodyJson,
    fallback: picked.fallback,
    contentLocale: picked.contentLocale,
  };
}

export async function getPostBySlug(
  locale: Locale,
  slug: string,
): Promise<PostDetail | null> {
  const run = cachedQuery(
    loadPostBySlug,
    ["post", locale, slug],
    [tags.postList(locale)],
  );
  try {
    return await run(locale, slug);
  } catch {
    return null;
  }
}
