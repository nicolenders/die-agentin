import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { alternatesFor } from "@/lib/seo/alternates";
import { getContactInfo, getSocialLinks } from "@/lib/queries/settings";
import { getLegalDoc } from "@/lib/queries/legal";
import { formatDate } from "@/lib/format";
import RichText from "@/components/content/RichText";
import { isRichEmpty } from "@/lib/content/rich";

export const dynamic = "force-dynamic";

// Impressum (Phase 11.2). Die Pflichtangaben (Name, Anschrift, E-Mail, LinkedIn)
// kommen aus den Einstellungen (an EINER Stelle gepflegt, Phase 7); die
// freien Textblöcke (Haftung, Urheberrecht, Streitschlichtung) aus dem
// pflegbaren LegalDoc. Nicole ist Privatperson — KEINE USt-IdNr.
const NAME = "Nicole Enders";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.footer.imprint,
    description: dict.meta.impressum,
    alternates: alternatesFor(locale, "impressum"),
  };
}

export default async function ImpressumPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isDe = locale === "de";
  const [contact, social, doc] = await Promise.all([
    getContactInfo(),
    getSocialLinks(),
    getLegalDoc("IMPRINT", locale),
  ]);

  const incomplete = !contact.postalAddress || !contact.email;
  const hasBody = doc !== null && !isRichEmpty(doc.body);

  return (
    <section style={{ padding: "44px 0 90px", maxWidth: 760 }}>
      <h1 style={{ fontSize: "clamp(28px,4vw,44px)" }}>{isDe ? "Impressum" : "Imprint"}</h1>
      {/* Ein Zeitstempel über einem leeren Text wirkt schlechter als gar keiner
          (Audit 5.3) — er erscheint erst, wenn wirklich Inhalt gepflegt ist. */}
      {hasBody ? (
        <p className="meta">
          {isDe ? "Zuletzt aktualisiert" : "Last updated"} {formatDate(doc.updatedAt, locale)}
        </p>
      ) : null}

      {incomplete ? (
        <div className="card bracket" style={{ marginTop: 16, borderColor: "var(--warn)" }}>
          <p className="muted" style={{ margin: 0 }}>
            {isDe
              ? "Anschrift und/oder E-Mail sind noch nicht hinterlegt. Ohne diese Angaben darf die Seite nicht öffentlich gehen (Einstellungen → Kontakt)."
              : "Address and/or email are not set yet. The site must not go public without them (Settings → Contact)."}
          </p>
        </div>
      ) : null}

      {/* Gleiche Prosa-Typografie wie die Datenschutzerklärung (content-body). Die
          Pflichtangaben stehen als saubere Abschnitte, gefolgt vom pflegbaren Text. */}
      <div className="content-body">
        <h2>{isDe ? "Angaben gemäß § 5 DDG" : "Information pursuant to § 5 DDG"}</h2>
        <address style={{ fontStyle: "normal" }}>
          <p>
            <b>{NAME}</b>
            <br />
            {contact.postalAddress
              ? // Erste Zeile weglassen, wenn sie nur den bereits fett gesetzten
                // Namen wiederholt (das Anschrift-Feld lädt dazu ein) — sonst stünde
                // „Nicole Enders" zweimal untereinander.
                contact.postalAddress
                  .split("\n")
                  .filter((line, i) => !(i === 0 && line.trim().toLowerCase() === NAME.toLowerCase()))
                  .map((line, i) => (
                    <span key={i}>
                      {line}
                      <br />
                    </span>
                  ))
              : <span className="meta">{isDe ? "[Anschrift folgt]" : "[address pending]"}</span>}
          </p>
        </address>

        <h2>{isDe ? "Kontakt" : "Contact"}</h2>
        <p>
          {contact.email ? (
            <>
              {isDe ? "E-Mail" : "Email"}: <a href={`mailto:${contact.email}`}>{contact.email}</a>
              <br />
            </>
          ) : null}
          {social.linkedin ? (
            <>
              LinkedIn:{" "}
              <a href={social.linkedin} target="_blank" rel="noopener noreferrer">
                {social.linkedin}
              </a>
            </>
          ) : null}
        </p>

        {/* § 18 Abs. 2 MStV (Audit 5.1): Die Seite betreibt mit den Depeschen
            und den Einsatz-Rückblicken ein journalistisch-redaktionelles
            Angebot. Bewusst als strukturierter Abschnitt aus denselben
            Einstellungen wie die § 5 DDG-Angaben — so bleibt es bei einer
            Adresspflege an einer Stelle. */}
        {contact.postalAddress ? (
          <>
            <h2>
              {isDe
                ? "Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV"
                : "Responsible for content under § 18 (2) MStV"}
            </h2>
            <p>{isDe ? `${NAME}, Anschrift wie oben.` : `${NAME}, address as above.`}</p>
          </>
        ) : null}
      </div>

      {hasBody ? <RichText value={doc.body} locale={locale} /> : null}
    </section>
  );
}
