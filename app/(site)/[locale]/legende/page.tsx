import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getLegend } from "@/lib/queries/legend";
import { brandAsset } from "@/lib/brand-assets";
import BrandImage from "@/components/BrandImage";
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
  const legend = await getLegend(locale);
  const portraitSrc = legend.portrait?.url ?? brandAsset("portrait.jpg");
  const portraitAlt = legend.portrait?.alt ?? (isDe ? "Porträt von Nicole Enders" : "Portrait of Nicole Enders");

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <div className="hero-grid">
        <div>
          <p className="eyebrow">{legend.eyebrow}</p>
          <h2>{legend.name}</h2>
          <p className="lead">{renderInlineFieldContent(parseRichValue(legend.lead))}</p>
        </div>
        <div className="hero-visual">
          <BrandImage
            src={portraitSrc}
            alt={portraitAlt}
            label={isDe ? "Porträt" : "Portrait"}
            sub={legend.name}
            ratio="4 / 5"
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

      <div className="card bracket" style={{ marginTop: 44, padding: 30 }}>
        <p className="eyebrow">{legend.contactEyebrow}</p>
        <h3>{legend.contactHeading}</h3>
        <p style={{ fontSize: 15 }}>{renderInlineFieldContent(parseRichValue(legend.contactText))}</p>
        <a className="btn" href={legend.contactUrl || "#"} target={legend.contactUrl && legend.contactUrl !== "#" ? "_blank" : undefined} rel="noopener noreferrer">
          {legend.contactButton}
        </a>
      </div>
    </section>
  );
}
