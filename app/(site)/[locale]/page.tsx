import Link from "next/link";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { brandAsset } from "@/lib/brand-assets";
import BrandImage from "@/components/BrandImage";
import { getHomeHero, getHomeStats } from "@/lib/queries/home";
import { getMissions } from "@/lib/queries/missions";
import { getPublishedDispatches } from "@/lib/queries/dispatches";
import { getBriefingRanking } from "@/lib/queries/briefings";
import { parseRichValue } from "@/lib/content/rich";
import { renderInlineFieldContent } from "@/components/content/RenderDocument";
import { formatDate } from "@/lib/format";
import styles from "./hq.module.scss";

// HQ / Startseite (SPEC §5). Der Hero ist im Admin pflegbar (HomeContent), die
// übrigen Blöcke ziehen sich aus den gepflegten Daten. Datenzugriffe sind
// gecacht (SPEC §2.1); die Seite rendert on-demand, damit der Docker-Build sie
// nicht ohne Datenbank vorrendern muss.
export const dynamic = "force-dynamic";

export default async function HQPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.hq;
  const [hero, stats, missions, dispatches, ranking] = await Promise.all([
    getHomeHero(locale),
    getHomeStats(),
    getMissions(locale),
    getPublishedDispatches(locale),
    getBriefingRanking(locale),
  ]);

  const nextMission = missions
    .filter((m) => m.future)
    .sort((a, b) => a.startDate.getTime() - b.startDate.getTime())[0];
  const recentDispatches = dispatches.slice(0, 3);
  const lastSignal = dispatches[0] ?? null;
  const topBriefing = ranking[0] ?? null;
  const missionHref = (m: typeof nextMission) =>
    m?.published && m.slug ? `/${locale}/einsaetze/${m.slug}` : `/${locale}/einsaetze`;

  return (
    <>
      <section className={styles.hero}>
        <div className="hero-grid">
          <div>
            <p className="eyebrow">{hero.eyebrow}</p>
            <h1>{renderInlineFieldContent(parseRichValue(hero.headlineValue))}</h1>
            <p className="lead">{renderInlineFieldContent(parseRichValue(hero.leadValue))}</p>
            <div className={styles.roles}>
              {hero.roles.map((role) => (
                <span key={role}>{role}</span>
              ))}
            </div>
          </div>
          <div className="hero-visual">
            <BrandImage
              src={hero.heroImage?.url ?? brandAsset("hero.jpg")}
              alt={
                hero.heroImage?.alt ??
                (locale === "de" ? "Die Agentin — Markenbild" : "Die Agentin — brand visual")
              }
              label="Die Agentin"
              sub={locale === "de" ? "Hero-Bild" : "Hero image"}
              ratio="4 / 5"
              ai={hero.heroImage?.ai ?? false}
            />
          </div>
        </div>
        <div className={styles.statusStrip}>
          <span>
            <i className={styles.dot} aria-hidden="true" />
            {nextMission
              ? `${t.nextMission}: ${formatDate(nextMission.startDate, locale)} · ${nextMission.city}`
              : t.noMission}
          </span>
          {lastSignal?.publishedAt ? (
            <span>
              {t.lastSignal}: {formatDate(lastSignal.publishedAt, locale)}
            </span>
          ) : null}
          <span>
            {stats.missions} {t.countMissions} · {stats.countries} {t.countCountries}
          </span>
          <span>{t.classification}</span>
        </div>
      </section>

      <p className="eyebrow" style={{ marginTop: 52 }}>
        {t.recent}
      </p>
      {recentDispatches.length > 0 ? (
        <div className={styles.cardGrid}>
          {recentDispatches.map((d) => (
            <Link
              key={d.id}
              className="card bracket"
              href={`/${locale}/depeschen/${d.slug}`}
              style={{ display: "block" }}
            >
              <span className="tag" style={d.identities[0] ? { borderColor: d.identities[0].color } : undefined}>
                {dict.dispatch.formats[d.format]}
              </span>
              <h3 style={{ marginTop: 12 }}>{d.title}</h3>
              {d.summary ? <p style={{ fontSize: "14.5px" }}>{d.summary}</p> : null}
              <p className="meta">
                {d.publishedAt ? formatDate(d.publishedAt, locale) : ""}
                {d.fallback ? " · DE" : ""}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <p className="muted">{dict.dispatch.empty}</p>
      )}

      <div className={styles.counter}>
        {[
          { n: stats.missions, sg: t.sgMissions, pl: t.countMissions },
          { n: stats.countries, sg: t.sgCountries, pl: t.countCountries },
          { n: stats.identities, sg: t.sgIdentities, pl: t.countIdentities },
          { n: stats.briefings, sg: t.sgBriefings, pl: t.countBriefings },
          { n: stats.certifications, sg: t.sgCertifications, pl: t.countCertifications },
          { n: stats.books, sg: t.sgBooks, pl: t.countBooks },
        ].map((c) => (
          <div key={c.pl}>
            <b>{c.n}</b>
            <span>{c.n === 1 ? c.sg : c.pl}</span>
          </div>
        ))}
        <div>
          <b>{stats.mvpAwards}×</b>
          <span>{t.countMvp}</span>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 20 }}>
        <article className="card bracket">
          <p className="eyebrow">{t.nextMission}</p>
          {nextMission ? (
            <>
              <h3>
                {nextMission.eventName} · {nextMission.city}
              </h3>
              <p className="meta">{formatDate(nextMission.startDate, locale)}</p>
              <Link className="btn" href={missionHref(nextMission)}>
                {t.openMissionFile}
              </Link>
            </>
          ) : (
            <>
              <p style={{ fontSize: "14.5px" }}>{t.noMission}</p>
              <Link className="btn ghost" href={`/${locale}/einsaetze`}>
                {t.openMissionFile}
              </Link>
            </>
          )}
        </article>
        <article className="card bracket">
          <p className="eyebrow">{t.mostRequested}</p>
          {topBriefing ? (
            <>
              <h3>{topBriefing.title}</h3>
              <p style={{ fontSize: "14.5px" }}>
                {topBriefing.total}× {locale === "de" ? "gehalten" : "delivered"}
                {topBriefing.en > 0
                  ? locale === "de"
                    ? `, davon ${topBriefing.en}× auf Englisch`
                    : `, ${topBriefing.en} in English`
                  : ""}
                .
              </p>
            </>
          ) : (
            <p style={{ fontSize: "14.5px" }}>
              {locale === "de"
                ? "Das Vortragsrepertoire füllt sich."
                : "The talk repertoire is filling up."}
            </p>
          )}
          <Link className="btn ghost" href={`/${locale}/briefings`}>
            {t.allBriefings}
          </Link>
        </article>
      </div>
    </>
  );
}
