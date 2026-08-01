import Link from "next/link";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getPublishedPosts } from "@/lib/queries/posts";
import { formatDateTime } from "@/lib/format";
import { POST_TYPES, isOneOf, type PostType } from "@/lib/domain";

// Feed aller Beiträge (SPEC §5). Filter nach Typ über die URL (?typ=SIGNAL).
// Dynamisch gerendert; die Datenzugriffe sind gecacht (SPEC §2.1).
export const dynamic = "force-dynamic";

const tagClass: Record<PostType, string> = {
  SIGNAL: "signal",
  NOTE: "notiz",
  BACKSTAGE: "backstage",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.feed.title, description: dict.feed.lead };
}

export default async function SignalePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ typ?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const { typ } = await searchParams;
  const dict = await getDictionary(locale);

  const all = await getPublishedPosts(locale);
  const activeType = isOneOf(POST_TYPES, typ) ? (typ as PostType) : null;
  const posts = activeType ? all.filter((p) => p.type === activeType) : all;

  const base = `/${locale}/signale`;

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{dict.feed.eyebrow}</p>
      <h2>{dict.feed.title}</h2>
      <p className="lead">{dict.feed.lead}</p>

      <div className="filters" role="group" aria-label={dict.feed.filterByType} style={{ marginTop: 26 }}>
        <Link className="chip" href={base} aria-pressed={!activeType}>
          {dict.common.all}
        </Link>
        {POST_TYPES.map((t) => (
          <Link
            key={t}
            className="chip"
            href={`${base}?typ=${t}`}
            aria-pressed={activeType === t}
          >
            {dict.feed.types[t]}
          </Link>
        ))}
      </div>

      {posts.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 20 }}>
          <p className="eyebrow">{dict.common.emptyTitle}</p>
          <p className="muted">{dict.feed.empty}</p>
        </div>
      ) : (
        posts.map((p) => (
          <Link key={p.id} className="feed-item" href={`${base}/${p.slug}`}>
            <div className="date">{formatDateTime(p.publishedAt, locale)}</div>
            <div>
              <span className={`tag ${tagClass[p.type]}`}>{dict.feed.types[p.type]}</span>
              <h3>{p.title}</h3>
              {p.summary ? <p style={{ fontSize: 15 }}>{p.summary}</p> : null}
              {p.tags.length > 0 ? (
                <p className="meta">
                  {p.tags.map((t) => (locale === "en" ? t.nameEn : t.nameDe)).join(" · ")}
                </p>
              ) : null}
              {p.fallback ? (
                <p className="meta">{dict.langNotice.onlyGermanShort}</p>
              ) : null}
            </div>
          </Link>
        ))
      )}
    </section>
  );
}
