import Link from "next/link";
import { getDictionary } from "@/lib/i18n";
import { formatDate } from "@/lib/format";
import { aiImageLabels } from "@/lib/media/ai-labels";
import type { DispatchDetail } from "@/lib/queries/dispatches";
import type { Locale } from "@/lib/i18n/config";
import ContentArticle from "@/components/content/ContentArticle";
import AssetImage from "@/components/media/AssetImage";

// Der Artikel einer Depesche — Kopf, Titelbild, Quelle, Text, Fachgebiete.
// Öffentliche Detailseite und Vorschau (ADR 0033) rendern dieselbe Komponente,
// damit die Vorschau nicht nur ungefähr so aussieht wie die Seite, sondern
// genau so.
export default async function DispatchArticle({ d, locale }: { d: DispatchDetail; locale: Locale }) {
  const dict = await getDictionary(locale);
  const aiLabels = aiImageLabels(locale);

  return (
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
  );
}
