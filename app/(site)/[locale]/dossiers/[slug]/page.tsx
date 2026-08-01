import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getDossierBySlug } from "@/lib/queries/dossiers";
import { formatDate } from "@/lib/format";
import ContentArticle from "@/components/content/ContentArticle";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const dossier = await getDossierBySlug(locale, slug);
  if (!dossier) return {};
  return { title: dossier.title, description: dossier.summary ?? undefined };
}

export default async function DossierDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const dossier = await getDossierBySlug(locale, slug);
  if (!dossier) notFound();

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <Link className="btn ghost" href={`/${locale}/dossiers`}>
        ← {dict.nav.dossiers}
      </Link>

      <article className="article" style={{ marginTop: 26 }}>
        <div className="artHead">
          <span className="tag dossier">Dossier</span>
          <h1 style={{ fontSize: "clamp(30px,4.4vw,50px)", marginTop: 14 }}>{dossier.title}</h1>
          <p className="meta">
            {locale === "de" ? "Angelegt" : "Created"} {formatDate(dossier.createdAt, locale)} ·{" "}
            {dict.common.updated} {formatDate(dossier.reviewedAt, locale)}
          </p>
        </div>

        <ContentArticle
          bodyJson={dossier.bodyJson}
          context="dossier"
          locale={locale}
          contentLocale={dossier.contentLocale}
          fallbackNotice={dossier.fallback ? dict.langNotice.onlyGerman : undefined}
        />
      </article>
    </section>
  );
}
