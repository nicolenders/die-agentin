import Link from "next/link";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { notFound } from "next/navigation";
import { brandAsset } from "@/lib/brand-assets";
import BrandImage from "@/components/BrandImage";
import styles from "./hq.module.scss";

// HQ / Startseite (SPEC §5). Statisch gerendert; ein Seitenaufruf berührt die
// Datenbank nicht (SPEC §2.1). Zähler und Vorschau werden in späteren
// Meilensteinen aus der DB gespeist und per ISR gecacht.

export default async function HQPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const t = dict.hq;

  return (
    <>
      <section className={styles.hero}>
        <div className="hero-grid">
          <div>
            <p className="eyebrow">{t.eyebrow}</p>
            <h1>
              {t.titleLine1}
              <br />
              {t.titleLine2Prefix}
              <span>{t.titleHighlight}</span>.
            </h1>
            <p className="lead">{t.lead}</p>
            <div className={styles.roles}>
              {t.roles.map((role) => (
                <span key={role}>{role}</span>
              ))}
            </div>
          </div>
          <div className="hero-visual">
            <BrandImage
              src={brandAsset("hero.jpg")}
              alt={locale === "de" ? "Die Agentin — Markenbild" : "Die Agentin — brand visual"}
              label="Die Agentin"
              sub={locale === "de" ? "Hero-Bild" : "Hero image"}
              ratio="4 / 5"
            />
          </div>
        </div>
        <div className={styles.statusStrip}>
          <span>
            <i className={styles.dot} aria-hidden="true" />
            {t.nextMission}: 12.09.2026 · Wien
          </span>
          <span>
            {t.lastSignal}: {locale === "de" ? "vor 2 Tagen" : "2 days ago"}
          </span>
          <span>47 {t.countMissions} · 11 {t.countCountries}</span>
          <span>{t.classification}</span>
        </div>
      </section>

      <p className="eyebrow" style={{ marginTop: 52 }}>
        {t.recent}
      </p>
      <div className={styles.cardGrid}>
        <article className="card bracket">
          <span className="tag signal">{dict.feed.types.SIGNAL}</span>
          <h3 style={{ marginTop: 12 }}>Microsoft Foundry bekommt Agent-Tracing</h3>
          <p style={{ fontSize: "14.5px" }}>
            Warum das für Produktions-Agents mehr verändert als das Feature-Listing
            vermuten lässt.
          </p>
          <p className="meta">28.07.2026 · Microsoft Tech Community</p>
        </article>
        <article className="card bracket">
          <span className="tag notiz">{dict.feed.types.NOTE}</span>
          <h3 style={{ marginTop: 12 }}>Sensitivity Labels: Neue Auto-Labeling-Grenzen</h3>
          <p style={{ fontSize: "14.5px" }}>
            Was sich in Purview zum 1. August ändert — und was du vorher prüfen
            solltest.
          </p>
          <p className="meta">26.07.2026 · 3 Min.</p>
        </article>
        <article className="card bracket">
          <span className="tag backstage">{dict.feed.types.BACKSTAGE}</span>
          <h3 style={{ marginTop: 12 }}>Vorbereitung Einsatz Wien: 3 Demos, 1 Tenant</h3>
          <p style={{ fontSize: "14.5px" }}>
            Wie ich Demo-Umgebungen baue, die auch ohne WLAN überleben.
          </p>
          <p className="meta">21.07.2026 · 5 Min.</p>
        </article>
      </div>

      <div className={styles.counter}>
        <div>
          <b>47</b>
          <span>{t.countMissions}</span>
        </div>
        <div>
          <b>11</b>
          <span>{t.countCountries}</span>
        </div>
        <div>
          <b>23</b>
          <span>{t.countBriefings}</span>
        </div>
        <div>
          <b>7×</b>
          <span>{t.countMvp}</span>
        </div>
        <div>
          <b>2</b>
          <span>{t.countBooks}</span>
        </div>
      </div>

      <div className="grid g2" style={{ marginTop: 20 }}>
        <article className="card bracket">
          <p className="eyebrow">{t.nextMission}</p>
          <h3>Cloud Summit Austria · Wien</h3>
          <p style={{ fontSize: "14.5px" }}>
            {locale === "de"
              ? "Briefing: Agents, die tatsächlich in Produktion gehen — Copilot Studio trifft Microsoft Foundry."
              : "Briefing: Agents that actually make it to production — Copilot Studio meets Microsoft Foundry."}
          </p>
          <p className="meta">12.09.2026 · {dict.common.language} DE</p>
          <Link className="btn" href={`/${locale}/einsaetze`}>
            {t.openMissionFile}
          </Link>
        </article>
        <article className="card bracket">
          <p className="eyebrow">{t.mostRequested}</p>
          <h3>Copilot Extensibility in der Praxis</h3>
          <p style={{ fontSize: "14.5px" }}>
            {locale === "de"
              ? "9× gehalten, davon 4× auf Englisch. Von Declarative Agents bis zu eigenen API-Plugins."
              : "Delivered 9 times, 4 in English. From declarative agents to custom API plugins."}
          </p>
          <Link className="btn ghost" href={`/${locale}/briefings`}>
            {t.allBriefings}
          </Link>
        </article>
      </div>
    </>
  );
}
