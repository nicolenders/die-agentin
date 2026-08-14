import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getLegend } from "@/lib/queries/legend";
import { getSocialLinks, getContactInfo } from "@/lib/queries/settings";
import { getPublishedIdentities, getIdentityToolNames } from "@/lib/queries/identities";
import { brandAsset } from "@/lib/brand-assets";
import BrandImage from "@/components/BrandImage";
import { IdentityCardCompact } from "@/components/identities/IdentityCard";
import SocialLinks from "@/components/SocialLinks";
import { parseRichValue } from "@/lib/content/rich";
import { renderInlineFieldContent } from "@/components/content/RenderDocument";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav.legende };
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
  const [legend, social, contact, identities, toolNames, dict] = await Promise.all([
    getLegend(locale),
    getSocialLinks(),
    getContactInfo(),
    getPublishedIdentities(locale),
    getIdentityToolNames(),
    getDictionary(locale),
  ]);

  // Codebuch (12.3): übersetzt die Sektionsnamen — Story-Element und Usability-Fix.
  const codebook: { term: string; gloss: string }[] = isDe
    ? [
        { term: "HQ", gloss: "Hauptquartier — die Startseite, das Lagebild." },
        { term: "Einsätze", gloss: "Auftritte vor Ort, auf der Weltkarte." },
        { term: "Identitäten", gloss: "Decknamen — die Rollen, unter denen ich auftrete." },
        { term: dict.dispatch.namePlural, gloss: "Meldungen aus dem Feld: Arbeit an einer Identität." },
        { term: "Legende", gloss: "Deckgeschichte und Kartenlegende zugleich — diese Seite." },
        { term: "Briefings", gloss: "Was ich zu einem Einsatz mitbringe: die Vorträge." },
      ]
    : [
        { term: "HQ", gloss: "Headquarters — the home page, the situation board." },
        { term: "Missions", gloss: "On-site appearances, on the world map." },
        { term: "Identities", gloss: "Cover names — the roles I appear under." },
        { term: dict.dispatch.namePlural, gloss: "Reports from the field: work on an identity." },
        { term: "Legend", gloss: "Cover story and map legend at once — this page." },
        { term: "Briefings", gloss: "What I bring to a mission: the talks." },
      ];
  const portraitSrc = legend.portrait?.url ?? brandAsset("portrait.jpg");
  const portraitAlt = legend.portrait?.alt ?? (isDe ? "Porträt von Nicole Enders" : "Portrait of Nicole Enders");

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <div className="hero-grid">
        <div>
          <p className="eyebrow">{legend.eyebrow}</p>
          <h2>{legend.name}</h2>
          <p className="lead">{renderInlineFieldContent(parseRichValue(legend.lead))}</p>
          {Object.keys(social).length > 0 ? (
            <div style={{ marginTop: 28 }}>
              <p className="eyebrow" style={{ marginBottom: 12 }}>
                {isDe ? "Folgen & vernetzen" : "Follow & connect"}
              </p>
              <SocialLinks social={social} className="social-icons" />
            </div>
          ) : null}
        </div>
        <div className="hero-visual">
          <BrandImage
            src={portraitSrc}
            alt={portraitAlt}
            label={isDe ? "Porträt" : "Portrait"}
            sub={legend.name}
            ratio="4 / 5"
            ai={legend.portrait?.ai ?? false}
          />
        </div>
      </div>

      <div className="card bracket" style={{ margin: "30px 0", padding: 30 }}>
        <p className="eyebrow">{legend.missionEyebrow}</p>
        <p style={{ fontSize: 20, fontFamily: "var(--display)", fontWeight: 300, lineHeight: 1.5, margin: 0 }}>
          {renderInlineFieldContent(parseRichValue(legend.missionText))}
        </p>
      </div>

      {legend.pillars.length > 0 ? (
        <div className="grid g3">
          {legend.pillars.map((p) => (
            <div className="card bracket" key={p.title}>
              <p className="eyebrow">{p.title}</p>
              <p style={{ fontSize: "14.5px" }}>{p.text}</p>
            </div>
          ))}
        </div>
      ) : null}

      {/* Warum Agentin — die Doppeldeutigkeit ausführlich. ENTWURF, von Nicole zu prüfen (12.3). */}
      <p className="eyebrow" style={{ marginTop: 44 }}>{isDe ? "Warum Agentin" : "Why „agent“"}</p>
      <div style={{ maxWidth: 720, display: "flex", flexDirection: "column", gap: 12 }}>
        {(isDe
          ? [
              "Agent, Agentin — das Wort trägt zwei Bedeutungen, und ich beanspruche beide. Da ist die Agentin im klassischen Sinn: die, die im Hintergrund arbeitet, Informationen ordnet, Fäden verbindet und dafür sorgt, dass am Ende etwas trägt. Und da ist der Agent im technischen Sinn: die Software, die im Auftrag handelt — Agentic AI, Copilot Studio, Microsoft Foundry. Ich baue solche Agents. Beides ist dieselbe Haltung.",
              "Enders ist mein Name — und zugleich ein Versprechen: keine losen Enden. Was ich anfange, wird zu Ende gebracht; was ich baue, hält im Alltag.",
              "Daraus folgt die Arbeitsweise: nicht die Demo interessiert mich, sondern die Frage dahinter. Was muss vorhanden sein, damit die Technik trägt — Struktur, Berechtigungen, Governance, Akzeptanz? Ein Copilot ist nur so gut wie die Informationsarchitektur, auf der er sitzt.",
            ]
          : [
              "Agent — the word carries two meanings, and I claim both. There is the agent in the classic sense: the one who works in the background, orders information, connects the threads and makes sure something holds in the end. And there is the agent in the technical sense: software that acts on your behalf — agentic AI, Copilot Studio, Microsoft Foundry. I build those agents. Both are the same stance.",
              "Enders is my name — and at the same time a promise: no loose ends. What I start gets finished; what I build holds up in daily work.",
              "From that follows the way I work: I am less interested in the demo than in the question behind it. What has to be in place for the technology to hold — structure, permissions, governance, acceptance? A Copilot is only as good as the information architecture it sits on.",
            ]
        ).map((p, i) => (
          <p key={i} style={{ fontSize: 15 }}>{p}</p>
        ))}
      </div>

      {identities.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 44 }}>{dict.identity.title}</p>
          <p className="meta" style={{ maxWidth: 640 }}>
            {isDe
              ? "Eine Identität kommt als Umschlag — mit Ausweis, Geld und Unterlagen. Offen als meine eigene ausgewiesen, keine Verschleierung."
              : "An identity arrives as an envelope — with an ID, money and papers. Openly declared as my own, no concealment."}
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(230px, 1fr))",
              gap: 12,
              marginTop: 14,
            }}
          >
            {identities.map((i) => (
              <IdentityCardCompact key={i.id} identity={i} locale={locale} />
            ))}
          </div>
        </>
      ) : null}

      {/* Codebuch — Glossar der Sektionsnamen (12.3). */}
      <p className="eyebrow" style={{ marginTop: 44 }}>{isDe ? "Codebuch" : "Codebook"}</p>
      <table style={{ maxWidth: 720 }}>
        <tbody>
          {codebook.map((c) => (
            <tr key={c.term}>
              <td style={{ width: "26%", fontFamily: "var(--mono)", color: "var(--violet-text)" }}>{c.term}</td>
              <td className="meta">{c.gloss}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {toolNames.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 44 }}>{isDe ? "Werkzeuge" : "Tools"}</p>
          <p className="meta" style={{ marginTop: 0 }}>
            {isDe
              ? "Die Summe der Werkzeuge über alle Identitäten hinweg."
              : "The combined toolset across all identities."}
          </p>
          <div className="roles" style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {toolNames.map((t) => (
              <span key={t} style={{ fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".2em", color: "var(--violet-text)", border: "1px solid var(--line)", padding: "6px 12px", borderRadius: "var(--r)" }}>
                {t}
              </span>
            ))}
          </div>
        </>
      ) : null}

      {(() => {
        // Toter CTA behoben (Phase 1.2c): kein `href="#"` mehr. Der Button zeigt
        // auf die gepflegte Kontakt-URL, sonst auf das hinterlegte
        // LinkedIn-Profil. Ist keins von beidem gesetzt, wird der Button
        // ausgeblendet statt ins Leere zu verlinken. Vollständige Zwei-Kanal-
        // Lösung (LinkedIn + E-Mail) folgt in Phase 7.
        // Zwei gleichwertige Kontaktwege (Phase 7.2): LinkedIn primär, E-Mail
        // sekundär. Fällt die E-Mail weg, wird ihr Button ausgeblendet.
        const linkedinUrl =
          legend.contactUrl && legend.contactUrl !== "#" ? legend.contactUrl : social.linkedin || "";
        return (
          <div className="card bracket" style={{ marginTop: 44, padding: 30 }}>
            <p className="eyebrow">{legend.contactEyebrow}</p>
            <h3>{legend.contactHeading}</h3>
            <p style={{ fontSize: 15 }}>{renderInlineFieldContent(parseRichValue(legend.contactText))}</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 6 }}>
              {linkedinUrl ? (
                <a className="btn" href={linkedinUrl} target="_blank" rel="noopener noreferrer">
                  {legend.contactButton}
                </a>
              ) : null}
              {contact.email ? (
                <a className="btn ghost" href={`mailto:${contact.email}`}>
                  {isDe ? "E-Mail schreiben" : "Send an email"}
                </a>
              ) : null}
            </div>
          </div>
        );
      })()}
    </section>
  );
}
