import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getLegend } from "@/lib/queries/legend";
import { getSocialLinks, getContactInfo } from "@/lib/queries/settings";
import { brandAsset } from "@/lib/brand-assets";
import BrandImage from "@/components/BrandImage";
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
  const [legend, social, contact] = await Promise.all([getLegend(locale), getSocialLinks(), getContactInfo()]);
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

      {legend.tools.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 44 }}>{isDe ? "Werkzeuge" : "Tools"}</p>
          <div className="roles" style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
            {legend.tools.map((t) => (
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
