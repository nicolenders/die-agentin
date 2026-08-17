import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { alternatesFor } from "@/lib/seo/alternates";
import { getCertifications, getFocusTopics, getPublications } from "@/lib/queries/records";
import { getLegend } from "@/lib/queries/legend";
import { getContactInfo, getSocialLinks } from "@/lib/queries/settings";
import { getResume, type ResumeEntryData } from "@/lib/queries/resume";
import CertificationSections from "@/components/records/CertificationSections";
import PublicationSections from "@/components/records/PublicationSections";
import PrintButton from "@/components/PrintButton";

export const dynamic = "force-dynamic";

// Werdegang/Projekte: Titel · Untertitel, Zeitraum rechts, Beschreibung + Tags.
function TimelineSection({ title, items }: { title: string; items: ResumeEntryData[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 32 }}>
      <h2>{title}</h2>
      {items.map((e) => (
        <div key={e.id} style={{ marginBottom: 15, breakInside: "avoid" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
            <b style={{ fontSize: 15 }}>
              {e.title}
              {e.subtitle ? <span style={{ fontWeight: 400 }}> · {e.subtitle}</span> : null}
            </b>
            {e.periodFrom || e.periodTo ? (
              <span className="meta" style={{ whiteSpace: "nowrap" }}>
                {[e.periodFrom, e.periodTo].filter(Boolean).join(" – ")}
              </span>
            ) : null}
          </div>
          {e.location ? <p className="meta" style={{ margin: "2px 0 0" }}>{e.location}</p> : null}
          {e.description ? <p style={{ margin: "4px 0 0", fontSize: 14 }}>{e.description}</p> : null}
          {e.tags.length > 0 ? <p className="meta" style={{ margin: "4px 0 0" }}>{e.tags.join(" · ")}</p> : null}
        </div>
      ))}
    </div>
  );
}

// Fähigkeiten: Kategorie — Liste.
function SkillsSection({ title, items }: { title: string; items: ResumeEntryData[] }) {
  if (items.length === 0) return null;
  return (
    <div style={{ marginTop: 32 }}>
      <h2>{title}</h2>
      {items.map((e) => (
        <p key={e.id} style={{ margin: "0 0 8px", fontSize: 14, breakInside: "avoid" }}>
          <b>{e.title}</b>
          {e.description ? <span className="meta"> — {e.description}</span> : null}
        </p>
      ))}
    </div>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const isDe = locale === "de";
  const dict = await getDictionary(locale);
  // Nicht indexieren: der Lebenslauf ist ein Auszug zum Drucken, keine SEO-Seite.
  // Eine eigene Description braucht er trotzdem — sie erscheint beim Teilen des
  // Links (Audit 1.2).
  return {
    title: isDe ? "Lebenslauf" : "Curriculum vitae",
    description: dict.meta.cv,
    alternates: alternatesFor(locale, "cv"),
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

  const [certsAll, focus, pubsAll, legend, contact, social, resume] = await Promise.all([
    getCertifications(locale),
    getFocusTopics(locale),
    getPublications(locale),
    getLegend(locale),
    getContactInfo(),
    getSocialLinks(),
    getResume(),
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
          {resume.profile?.headline ? (
            <p className="lead" style={{ margin: "6px 0 0", fontSize: 16 }}>{resume.profile.headline}</p>
          ) : null}
          <p className="meta" style={{ marginTop: 6 }}>
            {resume.profile?.location ? <>{resume.profile.location}</> : null}
            {resume.profile?.location && (contact.email || social.linkedin) ? " · " : ""}
            {contact.email ? <a href={`mailto:${contact.email}`}>{contact.email}</a> : null}
            {contact.email && social.linkedin ? " · " : ""}
            {social.linkedin ? (
              <a href={social.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a>
            ) : null}
            {legend.employer ? (
              <>
                {contactBits.length > 0 || resume.profile?.location ? " · " : ""}
                {legend.employer.url ? (
                  <a href={legend.employer.url} target="_blank" rel="noopener noreferrer">{legend.employer.name}</a>
                ) : (
                  legend.employer.name
                )}
              </>
            ) : null}
          </p>
        </div>
        <PrintButton label={isDe ? "Drucken / als PDF speichern" : "Print / save as PDF"} />
      </div>

      {resume.profile?.summary ? (
        <p style={{ marginTop: 18, fontSize: 15, maxWidth: "70ch" }}>{resume.profile.summary}</p>
      ) : null}

      {/* Klassischer Lebenslauf — Werdegang, Ausbildung, Fähigkeiten, Projekte. */}
      <TimelineSection title={isDe ? "Beruflicher Werdegang" : "Career"} items={resume.career} />
      <TimelineSection title={isDe ? "Ausbildung" : "Education"} items={resume.education} />
      <SkillsSection title={isDe ? "Fähigkeiten" : "Skills"} items={resume.skills} />
      <TimelineSection title={isDe ? "Projektreferenzen" : "Selected projects"} items={resume.projects} />

      {/* Ausbildung, Zertifizierungen & Auszeichnungen */}
      {certs.length > 0 || focusShown.length > 0 ? (
        <div style={{ marginTop: 30 }}>
          <h2>{isDe ? "Zertifizierungen & Auszeichnungen" : "Certifications & awards"}</h2>
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

      {certs.length === 0 && focusShown.length === 0 && pubs.length === 0 && !resume.hasAny ? (
        <div className="card bracket" style={{ marginTop: 24 }}>
          <p className="muted">{isDe ? "Noch keine Einträge erfasst." : "Nothing recorded yet."}</p>
        </div>
      ) : null}
    </section>
  );
}
