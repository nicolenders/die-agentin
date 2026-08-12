import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getIdentityBySlug } from "@/lib/queries/identities";
import { formatDate } from "@/lib/format";
import AssetImage from "@/components/media/AssetImage";
import ContentArticle from "@/components/content/ContentArticle";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const i = await getIdentityBySlug(locale, slug);
  if (!i) return {};
  return { title: `${i.name} · ${i.role}`, description: i.tagline || undefined };
}

export default async function IdentityDetailPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const i = await getIdentityBySlug(locale, slug);
  if (!i) notFound();

  const hasLinked =
    i.dispatches.length + i.missions.length + i.briefings.length + i.publications.length + i.certifications.length > 0;

  return (
    <section style={{ padding: "44px 0 90px", borderTop: `3px solid ${i.color}` }}>
      <Link className="btn ghost" href={`/${locale}/identitaeten`}>
        ← {dict.identity.title}
      </Link>

      <div className="hero-grid" style={{ marginTop: 24 }}>
        <div>
          <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: i.color, display: "inline-block" }} />
            {i.registryCode ?? dict.identity.eyebrow}
          </p>
          <h1>{i.name}</h1>
          <p className="lead">{i.role}{i.since ? ` · ${i.since}` : ""}</p>
          {i.descriptionJson ? (
            <ContentArticle bodyJson={i.descriptionJson} context="post" locale={locale} contentLocale={locale} />
          ) : null}

          {i.focus.length > 0 ? (
            <>
              <p className="eyebrow" style={{ marginTop: 22 }}>{dict.identity.focusLabel}</p>
              <ul>{i.focus.map((f) => <li key={f}>{f}</li>)}</ul>
            </>
          ) : null}

          {i.languages.length > 0 ? (
            <p className="meta">{dict.identity.languagesLabel}: {i.languages.join(", ")}</p>
          ) : null}
        </div>
        <div className="hero-visual">
          {i.envelopeUrl ? (
            <AssetImage src={i.envelopeUrl} alt={i.envelopeAlt} imgStyle={{ width: "100%", borderRadius: 6, aspectRatio: "4 / 5", objectFit: "cover" }} />
          ) : i.portraitUrl ? (
            <AssetImage src={i.portraitUrl} alt={i.portraitAlt} imgStyle={{ width: "100%", borderRadius: 6, objectFit: "cover" }} />
          ) : (
            <div className="card bracket" style={{ aspectRatio: "4 / 5", background: i.color, opacity: 0.25 }} />
          )}
        </div>
      </div>

      {i.attributes.length > 0 ? (
        <table style={{ marginTop: 30 }}>
          <tbody>
            {i.attributes.map((a) => (
              <tr key={a.label}>
                <td className="meta" style={{ width: "34%" }}>{a.label}</td>
                <td>{a.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}

      <p className="eyebrow" style={{ marginTop: 40 }}>{dict.identity.coverage}</p>
      {!hasLinked ? (
        <p className="muted">{locale === "de" ? "Hier sammeln sich bald die zugehörigen Einträge." : "The related entries will gather here soon."}</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 10 }}>
          {i.dispatches.length > 0 ? (
            <div>
              <h3>{dict.dispatch.namePlural}</h3>
              <ul>
                {i.dispatches.map((d) => (
                  <li key={d.slug}>
                    <Link href={`/${locale}/depeschen/${d.slug}`}>{d.title}</Link> <span className="meta">· {dict.dispatch.formats[d.format as keyof typeof dict.dispatch.formats]}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {i.missions.length > 0 ? (
            <div>
              <h3>{dict.nav.einsaetze}</h3>
              <ul>
                {i.missions.map((m) => (
                  <li key={`${m.eventName}-${m.date.toISOString()}`}>
                    {m.slug ? <Link href={`/${locale}/einsaetze/${m.slug}`}>{m.eventName}</Link> : m.eventName}{" "}
                    <span className="meta">· {m.city} · {formatDate(m.date, locale)}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          {i.briefings.length > 0 ? (
            <div>
              <h3>{dict.nav.briefings}</h3>
              <ul>{i.briefings.map((b) => <li key={b.title}>{b.title}</li>)}</ul>
            </div>
          ) : null}
          {i.publications.length > 0 ? (
            <div>
              <h3>{dict.nav.publikationen}</h3>
              <ul>{i.publications.map((p) => <li key={p.title}>{p.title} <span className="meta">· {p.year}</span></li>)}</ul>
            </div>
          ) : null}
          {i.certifications.length > 0 ? (
            <div>
              <h3>{dict.nav.ausbildung}</h3>
              <ul>{i.certifications.map((c) => <li key={c.name}>{c.name}</li>)}</ul>
            </div>
          ) : null}
        </div>
      )}
    </section>
  );
}
