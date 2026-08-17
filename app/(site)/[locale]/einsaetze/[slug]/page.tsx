import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getMissionBySlug } from "@/lib/queries/missions";
import { formatDate } from "@/lib/format";
import { extractYouTubeId } from "@/lib/video";
import { siteOrigin } from "@/lib/site";
import { talkLanguageLabel } from "@/lib/mission-language";
import { eventNode, breadcrumbNode, graph } from "@/lib/seo/jsonld";
import Gallery from "@/components/content/Gallery";
import RichText from "@/components/content/RichText";
import VideoConsent from "@/components/content/VideoConsent";
import JsonLd from "@/components/JsonLd";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) return {};
  const mission = await getMissionBySlug(locale, slug);
  if (!mission) return {};
  return { title: `${mission.eventName} · ${mission.city}` };
}

export default async function EinsatzaktePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const mission = await getMissionBySlug(locale, slug);
  if (!mission) notFound();
  const isDe = locale === "de";
  const videoId = extractYouTubeId(mission.recordingUrl);

  // Fakten-Zeile: Art, Sprache, Teilnehmende, Feedback (leere Angaben entfallen).
  const facts = [
    mission.sessionType ? { KEYNOTE: "Keynote", SESSION: "Session", WORKSHOP: "Workshop", PANEL: "Panel" }[mission.sessionType] ?? mission.sessionType : null,
    talkLanguageLabel(mission.sessionLanguage, locale),
    mission.durationMin ? `${mission.durationMin} ${isDe ? "Minuten" : "minutes"}` : null,
    mission.attendeeCount ? `${mission.attendeeCount} ${isDe ? "Teilnehmende" : "attendees"}` : null,
    mission.feedbackScore != null ? `${isDe ? "Feedback" : "Feedback"} ${mission.feedbackScore}${mission.feedbackSource ? ` (${mission.feedbackSource})` : ""}` : null,
  ].filter(Boolean);

  const hasMaterial = Boolean(
    mission.slidesUrl || mission.slidesFileUrl || videoId || mission.photos.length > 0,
  );

  const url = `${siteOrigin()}/${locale}/einsaetze/${mission.slug}`;
  const jsonLd = graph([
    eventNode({
      name: mission.eventName,
      startDate: mission.startDate.toISOString(),
      url: mission.eventUrl,
      city: mission.city,
      countryCode: mission.countryCode,
      online: mission.countryCode === "AQ",
    }),
    breadcrumbNode([
      { name: isDe ? "Einsätze" : "Missions", url: `${siteOrigin()}/${locale}/einsaetze` },
      { name: mission.eventName, url },
    ]),
  ]);

  return (
    <section style={{ padding: "44px 0 90px" }} lang={mission.contentLocale}>
      <JsonLd json={jsonLd} />
      <Link className="btn ghost" href={`/${locale}/einsaetze`}>
        ← {isDe ? "Zurück zur Karte" : "Back to the map"}
      </Link>

      <article className="article" style={{ marginTop: 26 }}>
        <div className="artHead">
          <p className="eyebrow">{isDe ? "Einsatzakte" : "Mission file"}</p>
          <h1 style={{ fontSize: "clamp(28px,4vw,46px)" }}>
            {mission.eventName} · {mission.city}
          </h1>
          <p className="meta">
            {formatDate(mission.startDate, locale)}
            {mission.eventUrl ? (
              <>
                {" · "}
                <a href={mission.eventUrl} target="_blank" rel="noopener noreferrer">
                  {dict.common.openEventSite}
                </a>
              </>
            ) : null}
            {facts.length > 0 ? ` · ${facts.join(" · ")}` : ""}
          </p>
          {mission.identities.length > 0 ? (
            <p className="meta" style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 6 }}>
              {mission.identities.map((i) => (
                <Link key={i.slug} href={`/${locale}/identitaeten/${i.slug}`} style={{ display: "inline-flex", alignItems: "center", gap: 4 }}>
                  <span aria-hidden style={{ width: 9, height: 9, borderRadius: "50%", background: i.color, display: "inline-block" }} />
                  {i.name}
                </Link>
              ))}
            </p>
          ) : null}
          {mission.coSpeakers.length > 0 ? (
            <p className="meta">
              {isDe ? "Mit" : "With"}{" "}
              {mission.coSpeakers.map((c, idx) => (
                <span key={c.name}>
                  {idx > 0 ? ", " : ""}
                  {c.url ? <a href={c.url} target="_blank" rel="noopener noreferrer">{c.name}</a> : c.name}
                </span>
              ))}
            </p>
          ) : null}
        </div>

        {mission.fallback ? (
          <p className="lang-fallback" role="note">
            {dict.langNotice.onlyGerman}
          </p>
        ) : null}

        <div className="grid g2">
          <div className="card bracket">
            <p className="eyebrow">{locale === "de" ? "Die Veranstaltung" : "The event"}</p>
            <div style={{ fontSize: 15 }}>
              <RichText value={mission.eventText} locale={locale} />
            </div>
          </div>
          <div className="card bracket">
            <p className="eyebrow">{locale === "de" ? "Mein Briefing" : "My briefing"}</p>
            {mission.briefing ? (
              <p style={{ fontSize: 15 }}>
                <b>{mission.briefing.title}</b> · {mission.briefing.language.toUpperCase()}
              </p>
            ) : null}
            <div style={{ fontSize: 15 }}>
              <RichText value={mission.talkText} locale={locale} />
            </div>
          </div>
        </div>

        {hasMaterial ? (
          <>
            <h3 style={{ marginTop: 38 }}>{isDe ? "Material" : "Material"}</h3>
            {mission.slidesFileUrl ? (
              <p>
                <a
                  className="btn ghost sm"
                  href={mission.slidesFileUrl}
                  download={mission.slidesFileName ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {isDe ? "Folien herunterladen (PDF)" : "Download slides (PDF)"} ↓
                </a>
              </p>
            ) : null}
            {mission.slidesUrl ? (
              <p>
                <a className="btn ghost sm" href={mission.slidesUrl} target="_blank" rel="noopener noreferrer">
                  {isDe ? "Folien ansehen" : "View slides"}
                  {mission.slidesPlatform ? ` · ${mission.slidesPlatform}` : ""} ↗
                </a>
              </p>
            ) : null}
            {videoId ? (
              <div style={{ marginTop: 12 }}>
                <VideoConsent videoId={videoId} title={mission.eventName} />
              </div>
            ) : null}
            {mission.photos.length > 0 ? (
              <div style={{ marginTop: 16 }}>
                <Gallery
                  images={mission.photos.map((p) => ({ url: p.url, alt: p.decorative ? "" : p.alt, ai: p.ai }))}
                  label={isDe ? "Fotos vom Einsatz" : "Mission photos"}
                />
              </div>
            ) : null}
          </>
        ) : null}

        {mission.recap ? (
          <>
            <h3 style={{ marginTop: 38 }}>{isDe ? "Rückblick" : "Recap"}</h3>
            <div style={{ fontSize: 15 }}>
              <RichText value={mission.recap} locale={locale} />
            </div>
          </>
        ) : null}
      </article>
    </section>
  );
}
