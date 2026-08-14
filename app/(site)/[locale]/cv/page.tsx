import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getCertifications, getFocusTopics, getPublications } from "@/lib/queries/records";
import { getLegend } from "@/lib/queries/legend";
import { getContactInfo, getSocialLinks } from "@/lib/queries/settings";
import CertificationSections from "@/components/records/CertificationSections";
import PublicationSections from "@/components/records/PublicationSections";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const isDe = locale === "de";
  // Nicht indexieren: der Lebenslauf ist ein Auszug zum Drucken, keine SEO-Seite.
  return {
    title: isDe ? "Lebenslauf" : "Curriculum vitae",
    robots: { index: false, follow: true },
  };
}

// Lebenslauf: Ausbildung, Auszeichnungen und Publikationen — unabhängig von den
// Identitäten, in einem druckbaren A4-Layout. Öffnet in einem neuen Tab und lässt
// sich über den Browser (Drucken → Als PDF speichern) ausgeben. Über die
// Query-Parameter `art` (alle|publikationen|ausbildung) und `von`/`bis` (Jahr)
// lässt sich der Auszug aus dem Adminbereich eingrenzen.
export default async function CvPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ art?: string; von?: string; bis?: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isDe = locale === "de";
  const { art, von, bis } = await searchParams;
  const kind = art === "publikationen" || art === "ausbildung" ? art : "alle";
  const fromYear = Number(von) || null;
  const toYear = Number(bis) || null;
  const inRange = (year: number) =>
    (fromYear === null || year >= fromYear) && (toYear === null || year <= toYear);

  const [certsAll, focus, pubsAll, legend, contact, social] = await Promise.all([
    getCertifications(locale),
    getFocusTopics(locale),
    getPublications(locale),
    getLegend(locale),
    getContactInfo(),
    getSocialLinks(),
  ]);

  const showPubs = kind === "alle" || kind === "publikationen";
  const showCerts = kind === "alle" || kind === "ausbildung";
  const pubs = showPubs ? pubsAll.filter((p) => inRange(p.year)) : [];
  const certs = showCerts
    ? certsAll.filter((c) => inRange(c.acquiredOn.getUTCFullYear()))
    : [];
  // Aktuelle Themen (Radar) nur im vollständigen bzw. Ausbildungs-Auszug zeigen.
  const focusShown = showCerts ? focus : [];

  const contactBits = [
    contact.email ? contact.email : null,
    social.linkedin ? "LinkedIn" : null,
  ].filter(Boolean);

  return (
    <section className="cv-doc" style={{ padding: "32px 0 90px" }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <p className="eyebrow">{isDe ? "Lebenslauf" : "Curriculum vitae"}</p>
          <h1 style={{ margin: "4px 0 0" }}>{legend.name}</h1>
          {contactBits.length > 0 ? (
            <p className="meta" style={{ marginTop: 6 }}>
              {contact.email ? (
                <a href={`mailto:${contact.email}`}>{contact.email}</a>
              ) : null}
              {contact.email && social.linkedin ? " · " : ""}
              {social.linkedin ? (
                <a href={social.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
              ) : null}
            </p>
          ) : null}
        </div>
        <PrintButton label={isDe ? "Drucken / als PDF speichern" : "Print / save as PDF"} />
      </div>

      {/* Ausbildung, Zertifizierungen & Auszeichnungen */}
      {certs.length > 0 || focusShown.length > 0 ? (
        <div style={{ marginTop: 30 }}>
          <h2>{isDe ? "Ausbildung, Zertifizierungen & Auszeichnungen" : "Education, certifications & awards"}</h2>
          <CertificationSections certs={certs} focus={focusShown} locale={locale} />
        </div>
      ) : null}

      {/* Publikationen */}
      {pubs.length > 0 ? (
        <div style={{ marginTop: 40 }}>
          <h2>{isDe ? "Publikationen" : "Publications"}</h2>
          <PublicationSections items={pubs} locale={locale} />
        </div>
      ) : null}

      {certs.length === 0 && focusShown.length === 0 && pubs.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 24 }}>
          <p className="muted">{isDe ? "Noch keine Einträge erfasst." : "Nothing recorded yet."}</p>
        </div>
      ) : null}
    </section>
  );
}
