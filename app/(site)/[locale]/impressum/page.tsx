import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getContactInfo, getSocialLinks } from "@/lib/queries/settings";
import { getLegalDoc } from "@/lib/queries/legal";
import { formatDate } from "@/lib/format";
import RichText from "@/components/content/RichText";

export const dynamic = "force-dynamic";

// Impressum (Phase 11.2). Die Pflichtangaben (Name, Anschrift, E-Mail, LinkedIn)
// kommen aus den Einstellungen (an EINER Stelle gepflegt, Phase 7); die
// freien Textblöcke (Haftung, Urheberrecht, Streitschlichtung) aus dem
// pflegbaren LegalDoc. Nicole ist Privatperson — KEINE USt-IdNr.
const NAME = "Nicole Enders";

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

  return (
    <section style={{ padding: "44px 0 90px", maxWidth: 760 }}>
      <h1 style={{ fontSize: "clamp(28px,4vw,44px)" }}>{isDe ? "Impressum" : "Imprint"}</h1>

      {incomplete ? (
        <div className="card bracket" style={{ marginTop: 16, borderColor: "var(--warn)" }}>
          <p className="muted" style={{ margin: 0 }}>
            {isDe
              ? "Anschrift und/oder E-Mail sind noch nicht hinterlegt. Ohne diese Angaben darf die Seite nicht öffentlich gehen (Einstellungen → Kontakt)."
              : "Address and/or email are not set yet. The site must not go public without them (Settings → Contact)."}
          </p>
        </div>
      ) : null}

      <h2 style={{ marginTop: 28 }}>{isDe ? "Angaben gemäß § 5 DDG" : "Information pursuant to § 5 DDG"}</h2>
      <address style={{ fontStyle: "normal" }}>
        <p style={{ margin: "6px 0" }}>
          <b>{NAME}</b>
          <br />
          {contact.postalAddress
            ? contact.postalAddress.split("\n").map((line, i) => (
                <span key={i}>
                  {line}
                  <br />
                </span>
              ))
            : <span className="meta">{isDe ? "[Anschrift folgt]" : "[address pending]"}</span>}
        </p>
      </address>

      <h2 style={{ marginTop: 24 }}>{isDe ? "Kontakt" : "Contact"}</h2>
      <p className="meta">
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

      {doc ? (
        <div style={{ marginTop: 28 }}>
          <RichText value={doc.body} locale={locale} />
          <p className="meta" style={{ marginTop: 16 }}>
            {isDe ? "Zuletzt aktualisiert" : "Last updated"} {formatDate(doc.updatedAt, locale)}
          </p>
        </div>
      ) : null}
    </section>
  );
}
