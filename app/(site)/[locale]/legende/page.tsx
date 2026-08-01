import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav.legende };
}

export function generateStaticParams() {
  return [{ locale: "de" }, { locale: "en" }];
}

// „Die Legende" — Über mich, Mission, Säulen, Kontakt (SPEC §5). Statischer
// Inhalt (Beispieltext aus dem Mockup), kein DB-Zugriff.
export default async function LegendePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isDe = locale === "de";

  const pillars = isDe
    ? [
        ["Strategie", "Klar. Zielgerichtet."],
        ["Architektur", "Sicher. Skalierbar."],
        ["Umsetzung", "Pragmatisch. Effizient."],
        ["Adoption", "Veränderung. Akzeptanz."],
        ["Enablement", "Wissen. Fähigkeiten."],
        ["Impact", "Erfolge. Mehrwert."],
      ]
    : [
        ["Strategy", "Clear. Focused."],
        ["Architecture", "Secure. Scalable."],
        ["Delivery", "Pragmatic. Efficient."],
        ["Adoption", "Change. Acceptance."],
        ["Enablement", "Knowledge. Skills."],
        ["Impact", "Results. Value."],
      ];

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{isDe ? "Die Legende · über mich" : "The legend · about me"}</p>
      <h2>Nicole Enders</h2>
      <p className="lead">
        {isDe
          ? "Microsoft MVP seit 2020. Ich arbeite an der Schnittstelle zwischen dem, was technisch geht, und dem, was Menschen im Arbeitsalltag hilft."
          : "Microsoft MVP since 2020. I work at the intersection of what is technically possible and what actually helps people at work."}
      </p>

      <div className="card bracket" style={{ margin: "30px 0", padding: 30 }}>
        <p className="eyebrow">{isDe ? "Meine Mission" : "My mission"}</p>
        <p style={{ fontSize: 20, fontFamily: "var(--display)", fontWeight: 300, lineHeight: 1.5, margin: 0 }}>
          {isDe
            ? "Menschen und Organisationen mit intelligenten Lösungen verbinden, um zukunftssicher, produktiv und smarter zu arbeiten."
            : "Connecting people and organisations with intelligent solutions to work future-proof, productive and smarter."}
        </p>
      </div>

      <div className="grid g3">
        {pillars.map(([title, text]) => (
          <div className="card bracket" key={title}>
            <p className="eyebrow">{title}</p>
            <p style={{ fontSize: "14.5px" }}>{text}</p>
          </div>
        ))}
      </div>

      <p className="eyebrow" style={{ marginTop: 44 }}>{isDe ? "Werkzeuge" : "Tools"}</p>
      <div className="roles" style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
        {["MICROSOFT FOUNDRY", "COPILOT STUDIO", "MICROSOFT 365", "MICROSOFT AZURE", "MICROSOFT TEAMS", "POWER PLATFORM"].map((t) => (
          <span key={t} style={{ fontFamily: "var(--mono)", fontSize: "10.5px", letterSpacing: ".2em", color: "var(--violet-text)", border: "1px solid var(--line)", padding: "6px 12px", borderRadius: "var(--r)" }}>
            {t}
          </span>
        ))}
      </div>

      <div className="card bracket" style={{ marginTop: 44, padding: 30 }}>
        <p className="eyebrow">{isDe ? "Kontakt aufnehmen" : "Get in touch"}</p>
        <h3>{isDe ? "Am schnellsten über LinkedIn" : "Fastest via LinkedIn"}</h3>
        <p style={{ fontSize: 15 }}>
          {isDe
            ? "Für Anfragen zu Vorträgen, Workshops und Beratung schreib mir direkt auf LinkedIn. Rechtlich verpflichtend ist zusätzlich eine E-Mail-Adresse — die findest du im Impressum."
            : "For talks, workshops and consulting, message me directly on LinkedIn. A legally required email address is in the imprint."}
        </p>
        <a className="btn" href="#">{isDe ? "Nachricht auf LinkedIn" : "Message on LinkedIn"}</a>
      </div>
    </section>
  );
}
