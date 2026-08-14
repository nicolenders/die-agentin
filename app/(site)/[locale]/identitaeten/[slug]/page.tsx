import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getIdentityBySlug } from "@/lib/queries/identities";
import { getFocusTopics } from "@/lib/queries/records";
import { formatDate } from "@/lib/format";
import AssetImage from "@/components/media/AssetImage";
import ContentArticle from "@/components/content/ContentArticle";
import PublicationSections from "@/components/records/PublicationSections";
import CertificationSections from "@/components/records/CertificationSections";

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
  const isDe = locale === "de";
  const dict = await getDictionary(locale);
  const i = await getIdentityBySlug(locale, slug);
  if (!i) notFound();
  const focus = await getFocusTopics(locale);

  const hasCoverage = i.dispatches.length + i.missions.length + i.briefings.length > 0;
  const hasEnvelopeBlock = i.focus.length > 0 || i.tools.length > 0 || Boolean(i.envelopeUrl);

  return (
    <section style={{ padding: "40px 0 90px", borderTop: `3px solid ${i.color}` }}>
      <Link className="btn ghost" href={`/${locale}/identitaeten`}>
        ← {dict.identity.title}
      </Link>

      {/* Kopf: das Porträt zuerst und prominent. */}
      <div className="hero-grid" style={{ marginTop: 26, alignItems: "center" }}>
        <div>
          <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: i.color, display: "inline-block" }} />
            {i.registryCode ?? dict.identity.eyebrow}
          </p>
          <h1 style={{ marginTop: 6 }}>{i.name}</h1>
          <p className="lead">{i.role}{i.since ? ` · ${i.since}` : ""}</p>
          {i.tagline ? <p style={{ fontSize: 15, opacity: 0.9 }}>{i.tagline}</p> : null}
          {i.languages.length > 0 ? (
            <p className="meta">{dict.identity.languagesLabel}: {i.languages.join(", ")}</p>
          ) : null}
        </div>
        <div className="hero-visual">
          {i.portraitUrl ? (
            <AssetImage src={i.portraitUrl} alt={i.portraitAlt} imgStyle={{ width: "100%", borderRadius: 8, aspectRatio: "1 / 1", objectFit: "cover" }} />
          ) : i.envelopeUrl ? (
            <AssetImage src={i.envelopeUrl} alt={i.envelopeAlt} imgStyle={{ width: "100%", borderRadius: 8, aspectRatio: "4 / 5", objectFit: "cover" }} />
          ) : (
            <div className="card bracket" style={{ aspectRatio: "1 / 1", background: i.color, opacity: 0.25 }} />
          )}
        </div>
      </div>

      {i.descriptionJson ? (
        <div style={{ marginTop: 30, maxWidth: 720 }}>
          <ContentArticle bodyJson={i.descriptionJson} context="post" locale={locale} contentLocale={locale} />
        </div>
      ) : null}

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

      {/* Fokus & Werkzeuge — hier kommt der Umschlag ins Bild. */}
      {hasEnvelopeBlock ? (
        <div className="hero-grid" style={{ marginTop: 44 }}>
          <div>
            {i.focus.length > 0 ? (
              <>
                <p className="eyebrow">{dict.identity.focusLabel}</p>
                <ul>{i.focus.map((f) => <li key={f}>{f}</li>)}</ul>
              </>
            ) : null}
            {i.tools.length > 0 ? (
              <>
                <p className="eyebrow" style={{ marginTop: i.focus.length > 0 ? 24 : 0 }}>{isDe ? "Werkzeuge" : "Tools"}</p>
                <div className="roles" style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
                  {i.tools.map((t) => (
                    <span key={t} style={{ fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".2em", color: "var(--violet-text)", border: "1px solid var(--line)", padding: "6px 12px", borderRadius: "var(--r)" }}>
                      {t}
                    </span>
                  ))}
                </div>
              </>
            ) : null}
          </div>
          {i.envelopeUrl ? (
            <div className="hero-visual">
              <AssetImage src={i.envelopeUrl} alt={i.envelopeAlt} imgStyle={{ width: "100%", borderRadius: 6, aspectRatio: "4 / 5", objectFit: "cover" }} />
              <p className="meta" style={{ marginTop: 8, textAlign: "center" }}>{isDe ? "Der Umschlag" : "The envelope"}</p>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Publikationen dieser Identität — volles Layout wie auf der eigenen Seite. */}
      {i.publications.length > 0 ? (
        <div style={{ marginTop: 48 }}>
          <h2>{dict.nav.publikationen}</h2>
          <PublicationSections items={i.publications} locale={locale} />
        </div>
      ) : null}

      {/* Ausbildung, Auszeichnungen & aktuelle Themen. */}
      {i.certifications.length > 0 || focus.length > 0 ? (
        <div style={{ marginTop: 48 }}>
          <h2>{dict.nav.ausbildung}</h2>
          <CertificationSections certs={i.certifications} focus={focus} locale={locale} />
        </div>
      ) : null}

      {/* Verknüpfte Depeschen, Einsätze und Briefings. */}
      {hasCoverage ? (
        <div style={{ marginTop: 48 }}>
          <p className="eyebrow">{dict.identity.coverage}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 22, marginTop: 10 }}>
            {i.dispatches.length > 0 ? (
              <div>
                <h3>{dict.dispatch.namePlural}</h3>
                <ul>
                  {i.dispatches.map((d) => (
                    <li key={d.slug}>
                      <Link href={`/${locale}/depeschen/${d.slug}`}>{d.title}</Link>{" "}
                      <span className="meta">· {dict.dispatch.formats[d.format as keyof typeof dict.dispatch.formats]}</span>
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
          </div>
        </div>
      ) : null}
    </section>
  );
}
