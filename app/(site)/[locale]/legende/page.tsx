import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import Link from "next/link";
import { getLegend } from "@/lib/queries/legend";
import { getSocialLinks, getContactInfo } from "@/lib/queries/settings";
import { getPublishedIdentities, getIdentityTools } from "@/lib/queries/identities";
import { getRadarTopics } from "@/lib/queries/records";
import { alternatesFor } from "@/lib/seo/alternates";
import RadarTopics from "@/components/records/RadarTopics";
import { brandAsset } from "@/lib/brand-assets";
import BrandImage from "@/components/BrandImage";
import { IdentityCompactGrid } from "@/components/identities/IdentityCard";
import SocialLinks from "@/components/SocialLinks";
import { parseRichValue } from "@/lib/content/rich";
import { renderInlineFieldContent } from "@/components/content/RenderDocument";
import styles from "./legende.module.scss";

export const dynamic = "force-dynamic";

// Dezentes Gebäude-Icon für den Arbeitgeber-Chip.
function EmployerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">
      <path d="M2.5 14V3.2L8 1.4v12.6M8 5.2l5.5 1.8V14" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" />
      <path d="M4.6 5.2h1.3M4.6 7.6h1.3M4.6 10h1.3M10.2 9h1.2M10.2 11.4h1.2M1.4 14h13.2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.nav.legende,
    description: dict.meta.legende,
    alternates: alternatesFor(locale, "legende"),
  };
}

// „Die Legende" — Über mich, Mission, Säulen, Kontakt (SPEC §5). Inhalte kommen
// aus der DB (im Admin pflegbar); solange nichts gepflegt ist, greifen Standard-
// texte. Das Porträt kann als hochgeladenes Medium gesetzt werden, sonst
// Datei/Platzhalter.
export default async function LegendePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isDe = locale === "de";
  const [legend, social, contact, identities, tools, radar, dict] = await Promise.all([
    getLegend(locale),
    getSocialLinks(),
    getContactInfo(),
    getPublishedIdentities(locale),
    getIdentityTools(),
    getRadarTopics(locale),
    getDictionary(locale),
  ]);

  // Codebuch (12.3): übersetzt die Sektionsnamen — Story-Element und Usability-Fix.
  const codebook: { term: string; gloss: string }[] = isDe
    ? [
        { term: "HQ", gloss: "Hauptquartier: die Startseite, das Lagebild." },
        { term: "Einsätze", gloss: "Auftritte vor Ort, auf der Weltkarte." },
        { term: "Identitäten", gloss: "Decknamen: die Rollen, unter denen ich auftrete." },
        { term: dict.dispatch.namePlural, gloss: "Meldungen aus dem Feld: Arbeit an einer Identität." },
        { term: "Legende", gloss: "Deckgeschichte und Kartenlegende zugleich, also diese Seite." },
        { term: "Briefings", gloss: "Was ich zu einem Einsatz mitbringe: die Vorträge." },
        // Audit 6.5: Das Codebuch erklärte nur die Hauptnavigation. Die drei
        // erklärungsbedürftigen Begriffe aus dem Footer fehlten.
        { term: "Akte", gloss: "Das Speaker-Kit: Bios, Pressefoto, Formate. Alles, was Veranstalter brauchen." },
        { term: "Nachweise", gloss: "Zertifizierungen, MVP-Auszeichnungen, Schulungen." },
        { term: "Publikationen", gloss: "Bücher und Kurse." },
      ]
    : [
        { term: "HQ", gloss: "Headquarters: the home page, the situation board." },
        { term: "Missions", gloss: "On-site appearances, on the world map." },
        { term: "Identities", gloss: "Cover names: the roles I appear under." },
        { term: dict.dispatch.namePlural, gloss: "Reports from the field: work on an identity." },
        { term: "Legend", gloss: "Cover story and map legend at once, which is this page." },
        { term: "Briefings", gloss: "What I bring to a mission: the talks." },
        { term: "File", gloss: "The speaker kit: bios, press photo, formats. Everything organisers need." },
        { term: "Credentials", gloss: "Certifications, MVP awards, trainings." },
        { term: "Publications", gloss: "Books and courses." },
      ];
  const portraitSrc = legend.portrait?.url ?? brandAsset("portrait.jpg");
  const portraitAlt = legend.portrait?.alt ?? (isDe ? "Porträt von Nicole Enders" : "Portrait of Nicole Enders");

  const whyAgent = isDe
    ? [
        "Agent, Agentin: Das Wort trägt zwei Bedeutungen, und ich beanspruche beide. Da ist die Agentin im klassischen Sinn: die, die im Hintergrund arbeitet, Informationen ordnet, Fäden verbindet und dafür sorgt, dass am Ende etwas trägt. Und da ist der Agent im technischen Sinn: die Software, die im Auftrag handelt, also Agentic AI, Copilot Studio, Microsoft Foundry. Ich baue solche Agents. Beides ist dieselbe Haltung.",
        "Enders ist mein Name und zugleich ein Versprechen: keine losen Enden. Was ich anfange, wird zu Ende gebracht; was ich baue, hält im Alltag.",
        "Daraus folgt die Arbeitsweise: nicht die Demo interessiert mich, sondern die Frage dahinter. Was muss vorhanden sein, damit die Technik trägt? Struktur, Berechtigungen, Governance, Akzeptanz. Ein Copilot ist nur so gut wie die Informationsarchitektur, auf der er sitzt.",
      ]
    : [
        "Agent: the word carries two meanings, and I claim both. There is the agent in the classic sense: the one who works in the background, orders information, connects the threads and makes sure something holds in the end. And there is the agent in the technical sense: software that acts on your behalf, meaning agentic AI, Copilot Studio, Microsoft Foundry. I build those agents. Both are the same stance.",
        "Enders is my name and at the same time a promise: no loose ends. What I start gets finished; what I build holds up in daily work.",
        "From that follows the way I work: I am less interested in the demo than in the question behind it. What has to be in place for the technology to hold? Structure, permissions, governance, acceptance. A Copilot is only as good as the information architecture it sits on.",
      ];

  return (
    <section style={{ padding: "44px 0 90px" }}>
      {/* Reihe 1: Kopf — links das Porträt, rechts Name/Lead/Kanäle und darunter
          die Mission (bündig mit dem Porträt). */}
      <div className={styles.heroRow}>
        <div className={styles.heroRight}>
          <BrandImage
            src={portraitSrc}
            alt={portraitAlt}
            label={isDe ? "Porträt" : "Portrait"}
            sub={legend.name}
            ratio="4 / 5"
            ai={legend.portrait?.ai ?? false}
            locale={locale}
            fill
          />
        </div>
        <div className={styles.heroLeft}>
          <div className={styles.nameRow}>
            <div style={{ minWidth: 0 }}>
              <p className="eyebrow">{legend.eyebrow}</p>
              {/* Audit 6.2: Nicoles Name gehört auf der Über-mich-Seite in die
                  H1. Optik unverändert (`as-h2`). */}
              <h1 className="as-h2" style={{ marginBottom: legend.employer ? 8 : undefined }}>
                {legend.name}
              </h1>
              {legend.employer ? (
                legend.employer.url ? (
                  <a
                    className={styles.employer}
                    href={legend.employer.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={isDe ? "Aktueller Arbeitgeber" : "Current employer"}
                  >
                    <EmployerIcon />
                    <span className={styles.employerName}>{legend.employer.name}</span>
                    <span aria-hidden className={styles.employerArrow}>↗</span>
                  </a>
                ) : (
                  <span className={styles.employer} title={isDe ? "Aktueller Arbeitgeber" : "Current employer"}>
                    <EmployerIcon />
                    <span className={styles.employerName}>{legend.employer.name}</span>
                  </span>
                )
              ) : null}
            </div>
            <a
              className="btn ghost sm"
              href={`/${locale}/cv`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ flexShrink: 0, marginTop: 4 }}
            >
              {isDe ? "CV abrufen" : "Get CV"} ↗
            </a>
          </div>
          <p className="lead" style={{ marginTop: 16 }}>{renderInlineFieldContent(parseRichValue(legend.lead))}</p>
          {Object.keys(social).length > 0 || contact.email ? (
            // marginBottom sichert den Abstand zur Mission auch dann, wenn der Inhalt
            // (mit Arbeitgeber-Chip) höher ist als das Porträt und margin-top:auto
            // der Mission auf 0 fällt — sonst kleben Social-Icons und Mission aneinander.
            <div style={{ marginTop: 24, marginBottom: 32 }}>
              <p className="eyebrow" style={{ marginBottom: 12 }}>
                {isDe ? "Folgen & vernetzen" : "Follow & connect"}
              </p>
              <SocialLinks social={social} email={contact.email || undefined} className="social-icons" />
            </div>
          ) : null}
          <div className={`card bracket ${styles.missionBox}`} style={{ padding: 26 }}>
            <p className="eyebrow">{legend.missionEyebrow}</p>
            <p style={{ fontSize: 18, fontFamily: "var(--display)", fontWeight: 300, lineHeight: 1.5, margin: 0 }}>
              {renderInlineFieldContent(parseRichValue(legend.missionText))}
            </p>
          </div>
        </div>
      </div>

      {/* Reihe 2: Warum Agentin (links) und Codebuch (rechts). */}
      <div className={styles.twoCol}>
        <div>
          <p className="eyebrow" style={{ marginTop: 0 }}>{isDe ? "Warum Agentin" : "Why “agent”"}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {whyAgent.map((p, i) => (
              <p key={i} style={{ fontSize: 15 }}>{p}</p>
            ))}
          </div>
        </div>
        <div>
          <p className="eyebrow" style={{ marginTop: 0 }}>{isDe ? "Codebuch" : "Codebook"}</p>
          <table>
            <tbody>
              {codebook.map((c) => (
                <tr key={c.term}>
                  <td style={{ width: "26%", fontFamily: "var(--mono)", color: "var(--violet-text)" }}>{c.term}</td>
                  <td className="meta">{c.gloss}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Reihe 3: Identitäten (links) und die Säulen (rechts, klein, untereinander). */}
      {identities.length > 0 || legend.pillars.length > 0 ? (
        <div className={styles.identitiesRow}>
          <div>
            <p className="eyebrow" style={{ marginTop: 0 }}>{dict.identity.title}</p>
            <p className="meta">
              {isDe
                ? "Eine Identität kommt als Umschlag: mit Ausweis, Geld und Unterlagen. Offen als meine eigene ausgewiesen, keine Verschleierung."
                : "An identity arrives as an envelope: with an ID, money and papers. Openly declared as my own, no concealment."}
            </p>
            {identities.length > 0 ? <IdentityCompactGrid identities={identities} locale={locale} columns={2} /> : null}
          </div>
          {legend.pillars.length > 0 ? (
            <div className={styles.pillarStack}>
              {legend.pillars.map((p) => (
                <div className={`card bracket ${styles.pillarSmall}`} key={p.title}>
                  <p className="eyebrow" style={{ margin: 0 }}>{p.title}</p>
                  <p style={{ fontSize: 13, margin: "4px 0 0" }}>{p.text}</p>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {tools.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 44 }}>{isDe ? "Werkzeuge" : "Tools"}</p>
          <p className="meta" style={{ marginTop: 0 }}>
            {isDe
              ? "Die Summe der Werkzeuge über alle Identitäten hinweg. Zum Filtern der Einsätze anklicken."
              : "The combined toolset across all identities. Click to filter the missions."}
          </p>
          <div className="roles" style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {tools.map((t) => (
              <Link
                key={t.slug}
                href={`/${locale}/einsaetze?werkzeug=${t.slug}`}
                // Historische Werkzeuge bleiben verlinkt — der Filter auf alte
                // Einsätze ist wertvoll —, sind aber abgesetzt (Audit 6.9).
                title={
                  t.historic
                    ? isDe
                      ? `Historisch, zuletzt im Einsatz ${t.lastUsedYear}`
                      : `Historic, last used in ${t.lastUsedYear}`
                    : undefined
                }
                style={{ fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".2em", color: "var(--violet-text)", border: "1px solid var(--line)", padding: "6px 12px", borderRadius: "var(--r)", textDecoration: "none", opacity: t.historic ? 0.55 : 1 }}
              >
                {t.name}
                {t.historic ? (
                  <span className="visually-hidden">
                    {isDe ? ` (historisch, zuletzt ${t.lastUsedYear})` : ` (historic, last used ${t.lastUsedYear})`}
                  </span>
                ) : null}
              </Link>
            ))}
          </div>
        </>
      ) : null}

      {/* Zwei Sätze Erklärung über einem einzigen Punkt stehen im Missverhältnis
          (Audit 6.9): die Sektion erscheint erst ab drei Themen. */}
      {radar.length >= 3 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 32 }}>{isDe ? "Aktuelle Themen" : "Current topics"}</p>
          <p className="meta" style={{ marginTop: 0 }}>
            {isDe
              ? "Womit ich mich gerade beschäftige. Farbe = zugeordnete Identität. Gibt es Depeschen zum Thema, führt der Punkt dorthin."
              : "What I'm working on right now. Colour = linked identity. Where dispatches exist, the topic links to them."}
          </p>
          <RadarTopics topics={radar} locale={locale} />
        </>
      ) : null}

    </section>
  );
}
