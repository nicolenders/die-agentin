import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getIdentityBySlug } from "@/lib/queries/identities";
import { formatDate } from "@/lib/format";
import ContentArticle from "@/components/content/ContentArticle";
import IdentityCoverageTabs from "@/components/identities/IdentityCoverageTabs";
import RadarTopics from "@/components/records/RadarTopics";
import AiBadge from "@/components/media/AiBadge";
import styles from "./identityDetail.module.scss";

export const dynamic = "force-dynamic";

// Mono-Chip wie bei den Werkzeugen — auch für den Fokus verwendet.
const chipStyle = {
  fontFamily: "var(--mono)",
  fontSize: "10.5px",
  letterSpacing: ".2em",
  color: "var(--violet-text)",
  border: "1px solid var(--line)",
  padding: "6px 12px",
  borderRadius: "var(--r)",
} as const;

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

  const hasCoverage = i.missions.length + i.briefings.length + i.dispatches.length > 0;
  const hasEnvelopeBlock =
    i.focus.length > 0 || i.tools.length > 0 || i.focusTopics.length > 0 || Boolean(i.envelopeUrl);

  const focusChips =
    i.focus.length > 0 ? (
      <div className="roles" style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
        {i.focus.map((f) => (
          <span key={f} style={chipStyle}>{f}</span>
        ))}
      </div>
    ) : null;
  const toolChips =
    i.tools.length > 0 ? (
      <div className="roles" style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
        {i.tools.map((t) => (
          <Link key={t.slug} href={`/${locale}/einsaetze?werkzeug=${t.slug}`} style={{ ...chipStyle, textDecoration: "none" }}>
            {t.name}
          </Link>
        ))}
      </div>
    ) : null;
  // Aktuelle Themen (Radar) dieser Identität — in ihrer Farbe. Themen mit
  // Depeschen führen auf die darauf gefilterte Depeschenliste.
  const topicChips =
    i.focusTopics.length > 0 ? (
      <RadarTopics topics={i.focusTopics.map((t) => ({ ...t, color: i.color }))} locale={locale} />
    ) : null;

  return (
    <section style={{ padding: "40px 0 90px", borderTop: `3px solid ${i.color}` }}>
      <Link className="btn ghost" href={`/${locale}/identitaeten`}>
        ← {dict.identity.title}
      </Link>

      {/* Name und ID über der Akte, volle Breite — nicht vom Porträt verdeckt. */}
      <header style={{ marginTop: 22 }}>
        <p className="eyebrow" style={{ display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
          <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: i.color, display: "inline-block" }} />
          {i.registryCode ?? dict.identity.eyebrow}
        </p>
        <h1 style={{ marginTop: 8, marginBottom: 0 }}>{i.name}</h1>
      </header>

      {/* Akte, aufgeschlagen: links der Text, rechts das Porträt. */}
      <div className={styles.spread} style={{ marginTop: 18 }}>
        <div className={`${styles.page} ${styles.spine}`}>
          {/* Keine Jahreszahl, keine Sprachliste: beides sagt über eine
              Identität nichts aus, was die Rolle nicht besser sagt. */}
          <p className="lead" style={{ marginTop: 0 }}>{i.role}</p>
          {i.tagline ? <p style={{ fontSize: 15, opacity: 0.9 }}>{i.tagline}</p> : null}
          {i.descriptionJson ? (
            <div style={{ marginTop: 16 }}>
              <ContentArticle bodyJson={i.descriptionJson} context="post" locale={locale} contentLocale={locale} />
            </div>
          ) : null}
        </div>
        <div className={styles.imagePage}>
          {i.portraitUrl ? (
            <span className={styles.imageFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.portraitUrl} alt={i.portraitAlt} />
              {i.portraitAi ? <AiBadge /> : null}
            </span>
          ) : i.envelopeUrl ? (
            <span className={styles.imageFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.envelopeUrl} alt={i.envelopeAlt} />
              {i.envelopeAi ? <AiBadge /> : null}
            </span>
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
            <span className={styles.imageFrame}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={i.envelopeUrl} alt={i.envelopeAlt} />
              {i.envelopeAi ? <AiBadge /> : null}
            </span>
          </div>
          <div className={styles.page}>
            {focusChips ? (
              <>
                <p className="eyebrow" style={{ marginTop: 0 }}>{dict.identity.focusLabel}</p>
                {focusChips}
              </>
            ) : null}
            {toolChips ? (
              <>
                <p className="eyebrow" style={{ marginTop: focusChips ? 24 : 0 }}>{isDe ? "Werkzeuge" : "Tools"}</p>
                {toolChips}
              </>
            ) : null}
            {topicChips ? (
              <>
                <p className="eyebrow" style={{ marginTop: focusChips || toolChips ? 24 : 0 }}>
                  {isDe ? "Aktuelle Themen" : "Current topics"}
                </p>
                {topicChips}
              </>
            ) : null}
            {!focusChips && !toolChips && !topicChips ? (
              <p className="muted" style={{ margin: 0 }}>{isDe ? "Noch kein Fokus hinterlegt." : "No focus set yet."}</p>
            ) : null}
          </div>
        </div>
      ) : hasEnvelopeBlock ? (
        <div style={{ marginTop: 44 }}>
          {focusChips ? (
            <>
              <p className="eyebrow">{dict.identity.focusLabel}</p>
              {focusChips}
            </>
          ) : null}
          {toolChips ? (
            <>
              <p className="eyebrow" style={{ marginTop: focusChips ? 24 : 0 }}>{isDe ? "Werkzeuge" : "Tools"}</p>
              {toolChips}
            </>
          ) : null}
          {topicChips ? (
            <>
              <p className="eyebrow" style={{ marginTop: focusChips || toolChips ? 24 : 0 }}>
                {isDe ? "Aktuelle Themen" : "Current topics"}
              </p>
              {topicChips}
            </>
          ) : null}
        </div>
      ) : null}

      {/* Verknüpfte Einsätze und Briefings (und ggf. Depeschen) als Tabs mit
          Suche — bewusst oberhalb von Publikationen und Ausbildung. */}
      {hasCoverage ? (
        <div style={{ marginTop: 48 }}>
          <p className="eyebrow">{dict.identity.coverage}</p>
          <div style={{ marginTop: 10 }}>
            <IdentityCoverageTabs
              locale={locale}
              missions={i.missions.map((m) => ({
                slug: m.slug,
                eventName: m.eventName,
                city: m.city,
                dateLabel: formatDate(m.date, locale),
                linkable: m.linkable,
                briefing: m.briefing,
              }))}
              briefings={i.briefings.map((b) => ({ title: b.title }))}
              dispatches={i.dispatches.map((d) => ({
                slug: d.slug,
                title: d.title,
                format: dict.dispatch.formats[d.format as keyof typeof dict.dispatch.formats],
              }))}
              labels={{
                einsaetze: dict.nav.einsaetze,
                briefings: dict.nav.briefings,
                depeschen: dict.dispatch.namePlural,
                search: isDe ? "Suchen …" : "Search …",
                date: isDe ? "Datum" : "Date",
                event: isDe ? "Veranstaltung" : "Event",
                briefing: isDe ? "Briefing" : "Briefing",
                location: isDe ? "Ort" : "Location",
                title: isDe ? "Titel" : "Title",
                format: isDe ? "Format" : "Format",
                empty: isDe ? "Kein Treffer." : "No matches.",
              }}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
