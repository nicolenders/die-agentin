import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getIdentityBySlug } from "@/lib/queries/identities";
import { getFocusTopics } from "@/lib/queries/records";
import { formatDate } from "@/lib/format";
import ContentArticle from "@/components/content/ContentArticle";
import PublicationSections from "@/components/records/PublicationSections";
import CertificationSections from "@/components/records/CertificationSections";
import styles from "./identityDetail.module.scss";

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

      {/* Akte, aufgeschlagen: links der Text, rechts das Porträt. */}
      <div className={styles.spread} style={{ marginTop: 24 }}>
        <div className={`${styles.page} ${styles.spine}`}>
          <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 0 }}>
            <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: i.color, display: "inline-block" }} />
            {i.registryCode ?? dict.identity.eyebrow}
          </p>
          <h1 style={{ marginTop: 6 }}>{i.name}</h1>
          <p className="lead">{i.role}{i.since ? ` · ${i.since}` : ""}</p>
          {i.tagline ? <p style={{ fontSize: 15, opacity: 0.9 }}>{i.tagline}</p> : null}
          {i.descriptionJson ? (
            <div style={{ marginTop: 16 }}>
              <ContentArticle bodyJson={i.descriptionJson} context="post" locale={locale} contentLocale={locale} />
            </div>
          ) : null}
          {i.languages.length > 0 ? (
            <p className="meta" style={{ marginTop: 14 }}>{dict.identity.languagesLabel}: {i.languages.join(", ")}</p>
          ) : null}
        </div>
        <div className={styles.imagePage}>
          {i.portraitUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={i.portraitUrl} alt={i.portraitAlt} />
          ) : i.envelopeUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={i.envelopeUrl} alt={i.envelopeAlt} />
          ) : (
            <div style={{ position: "absolute", inset: 0, background: i.color, opacity: 0.25 }} />
          )}
        </div>
      </div>

      {i.attributes.length > 0 ? (
        <table style={{ marginTop: 26 }}>
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

      {/* Zweite Seite der Akte: links der Umschlag, rechts Fokus & Werkzeuge. */}
      {i.envelopeUrl ? (
        <div className={styles.spread} style={{ marginTop: 20 }}>
          <div className={`${styles.imagePage} ${styles.spine}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={i.envelopeUrl} alt={i.envelopeAlt} />
            <span className={styles.imageCaption}>{isDe ? "Der Umschlag" : "The envelope"}</span>
          </div>
          <div className={styles.page}>
            {i.focus.length > 0 ? (
              <>
                <p className="eyebrow" style={{ marginTop: 0 }}>{dict.identity.focusLabel}</p>
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
            {i.focus.length === 0 && i.tools.length === 0 ? (
              <p className="muted" style={{ margin: 0 }}>{isDe ? "Noch kein Fokus hinterlegt." : "No focus set yet."}</p>
            ) : null}
          </div>
        </div>
      ) : hasEnvelopeBlock ? (
        <div style={{ marginTop: 44 }}>
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
      ) : null}

      {/* Publikationen dieser Identität — kompakt (platzsparend). */}
      {i.publications.length > 0 ? (
        <div style={{ marginTop: 48 }}>
          <h2>{dict.nav.publikationen}</h2>
          <PublicationSections items={i.publications} locale={locale} compact />
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
