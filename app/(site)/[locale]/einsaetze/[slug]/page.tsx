import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getMissionBySlug } from "@/lib/queries/missions";
import { formatDate } from "@/lib/format";
import Gallery from "@/components/content/Gallery";
import RichText from "@/components/content/RichText";

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

  return (
    <section style={{ padding: "44px 0 90px" }} lang={mission.contentLocale}>
      <Link className="btn ghost" href={`/${locale}/einsaetze`}>
        ← {locale === "de" ? "Zurück zur Karte" : "Back to the map"}
      </Link>

      <article className="article" style={{ marginTop: 26 }}>
        <div className="artHead">
          <p className="eyebrow">{locale === "de" ? "Einsatzakte" : "Mission file"}</p>
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
          </p>
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

        {mission.photos.length > 0 ? (
          <>
            <h3 style={{ marginTop: 38 }}>
              {locale === "de" ? "Bilder vom Einsatz" : "Photos from the mission"}
            </h3>
            <Gallery
              images={mission.photos.map((p) => ({ url: p.url, alt: p.decorative ? "" : p.alt, ai: p.ai }))}
              label={locale === "de" ? "Fotos vom Einsatz" : "Mission photos"}
            />
          </>
        ) : null}
      </article>
    </section>
  );
}
