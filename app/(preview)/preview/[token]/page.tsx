import { notFound } from "next/navigation";
import { verifyPreviewToken } from "@/lib/preview/token";
import { db } from "@/lib/db";
import { pickTranslation } from "@/lib/content/pick";
import ContentArticle from "@/components/content/ContentArticle";
import { formatDate } from "@/lib/format";
import { getDispatchPreview } from "@/lib/queries/dispatches";
import { isLocale, type Locale } from "@/lib/i18n/config";
import DispatchPreview from "@/components/preview/DispatchPreview";

export const dynamic = "force-dynamic";

// Teilbare Vorschau eines (auch unveröffentlichten) Beitrags über ein
// signiertes, 7 Tage gültiges Token (SPEC §6). Nützlich, um Veranstaltern
// vorab etwas zu zeigen — ohne Anmeldung, aber nicht auffindbar.
export default async function PreviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ lang?: string }>;
}) {
  const { token } = await params;
  const payload = verifyPreviewToken(token);
  if (!payload) notFound();

  // Depeschen (ADR 0033): derselbe Rahmen wie in der Admin-Vorschau, nur ohne
  // Rückweg in die Maske — wer den Link hat, ist nicht angemeldet.
  if (payload.kind === "dispatch") {
    const { lang } = await searchParams;
    const locale: Locale = isLocale(lang) ? lang : "de";
    const d = await getDispatchPreview(payload.id, locale);
    if (!d) notFound();
    return <DispatchPreview d={d} locale={locale} basePath={`/preview/${token}`} />;
  }

  if (payload.kind !== "post") notFound();

  const post = await db.post.findUnique({
    where: { id: payload.id },
    include: { translations: true },
  });
  if (!post) notFound();

  const picked = pickTranslation(post.translations, "de");
  if (!picked) notFound();

  return (
    <main className="wrap" style={{ padding: "24px 0 90px" }}>
      <div
        style={{
          background: "rgba(139,92,246,.15)",
          border: "1px solid var(--violet)",
          borderRadius: 4,
          padding: "8px 14px",
          fontFamily: "var(--mono)",
          fontSize: 11,
          letterSpacing: ".14em",
          color: "var(--violet-text)",
          marginBottom: 24,
        }}
      >
        ◉ VORSCHAU: nicht veröffentlicht · Status {post.status}
      </div>

      <article className="article">
        <div className="artHead">
          <h1 style={{ fontSize: "clamp(30px,4.4vw,50px)" }}>{picked.translation.title}</h1>
          <p className="meta">
            {post.publishAt ? `Geplant für ${formatDate(post.publishAt, "de")}` : "Entwurf"}
          </p>
        </div>
        <ContentArticle
          bodyJson={picked.translation.bodyJson}
          context="post"
          locale="de"
          contentLocale={picked.contentLocale}
        />
      </article>
    </main>
  );
}
