import { ImageResponse } from "next/og";
import { isLocale } from "@/lib/i18n/config";

// Dynamisches Social-Sharing-Bild (OpenGraph/Twitter) im Marken-Look. Erscheint
// automatisch, wenn ein Link auf LinkedIn/X/Slack geteilt wird — wichtig, weil
// die Seite Beiträge automatisch auf LinkedIn spiegelt (SPEC §7). Kein externes
// Asset nötig; wird beim Build je Sprache erzeugt.

export const alt = "Die Agentin — nicolenders.com";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const isDe = !isLocale(locale) || locale === "de";
  const tagline = isDe
    ? "Microsoft AI & Modern Work. Keine losen Enden."
    : "Microsoft AI & Modern Work. No loose ends.";

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background:
            "radial-gradient(900px 500px at 12% -10%, rgba(139,92,246,0.35), transparent 60%), radial-gradient(700px 420px at 95% 10%, rgba(232,121,249,0.22), transparent 62%), #05010D",
          color: "#EDE9F8",
          fontFamily: "sans-serif",
          border: "1px solid #2A1A4A",
          position: "relative",
        }}
      >
        {/* Zielmarken-Ecken (Signature-Element) */}
        <div style={{ position: "absolute", top: 40, left: 40, width: 34, height: 34, borderTop: "2px solid #A855F7", borderLeft: "2px solid #A855F7" }} />
        <div style={{ position: "absolute", bottom: 40, right: 40, width: 34, height: 34, borderBottom: "2px solid #A855F7", borderRight: "2px solid #A855F7" }} />

        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div
            style={{
              width: 66,
              height: 66,
              borderRadius: 999,
              border: "2px solid #8B5CF6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#C4A2FC",
              fontSize: 22,
              fontFamily: "monospace",
              letterSpacing: 2,
            }}
          >
            N.E
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: 6 }}>DIE AGENTIN</div>
            <div style={{ fontSize: 15, color: "#A093C0", fontFamily: "monospace", letterSpacing: 4 }}>
              NICOLENDERS.COM
            </div>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 68, fontWeight: 800, lineHeight: 1.05, maxWidth: 900 }}>
            {isDe ? "Ich verbinde Menschen mit " : "I connect people with "}
            <span style={{ color: "#E879F9" }}>{isDe ? "intelligenten Lösungen." : "intelligent solutions."}</span>
          </div>
          <div style={{ width: 220, height: 6, borderRadius: 3, background: "linear-gradient(90deg,#8B5CF6,#E879F9)" }} />
        </div>

        <div style={{ fontSize: 24, color: "#A093C0", fontFamily: "monospace", letterSpacing: 1 }}>
          {tagline}
        </div>
      </div>
    ),
    size,
  );
}
