import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { notFound } from "next/navigation";
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
    </>
  );
}
