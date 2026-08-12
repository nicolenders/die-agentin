import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getCertifications, getFocusTopics } from "@/lib/queries/records";
import {
  CERT_KINDS,
  CERT_KIND_LABEL,
  CERT_KIND_LABEL_EN,
  CERT_FAMILIES,
  CERT_FAMILY_LABEL,
  CERT_FAMILY_LABEL_EN,
} from "@/lib/records/kind";
import type { CertificationRecord } from "@/lib/queries/records";
import AssetImage from "@/components/media/AssetImage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav.ausbildung };
}

function monthYear(date: Date, locale: Locale): string {
  return new Intl.DateTimeFormat(locale === "de" ? "de-DE" : "en-GB", {
    month: "2-digit",
    year: "numeric",
    timeZone: "Europe/Berlin",
  }).format(date);
}

function yearOf(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", { year: "numeric", timeZone: "Europe/Berlin" }).format(date);
}

function badge(shortCode: string | null, name: string, series: string | null): string {
  if (series) return series;
  if (shortCode) return shortCode;
  return name.slice(0, 3).toUpperCase();
}

export default async function AusbildungPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isDe = locale === "de";
  const [certs, focus] = await Promise.all([getCertifications(locale), getFocusTopics(locale)]);
  const kindLabel = (k: (typeof CERT_KINDS)[number]) => (isDe ? CERT_KIND_LABEL[k] : CERT_KIND_LABEL_EN[k]);
  const familyLabel = (f: (typeof CERT_FAMILIES)[number]) =>
    isDe ? CERT_FAMILY_LABEL[f] : CERT_FAMILY_LABEL_EN[f];

  // In Ausbildung (Phase 5.3): geplante Zertifizierungen erscheinen NICHT in den
  // erworbenen Abschnitten, sondern in einem eigenen Abschnitt oben — ohne
  // Erwerbsdatum, ohne Badge, klar unterschieden.
  const planned = certs.filter((c) => c.status === "PLANNED");
  const achieved = certs.filter((c) => c.status !== "PLANNED");

  // Abschnitte untereinander. Zertifizierungen werden zusätzlich nach Microsoft
  // und methodisch getrennt; die übrigen Arten bleiben ein Abschnitt.
  const sections: { key: string; label: string; items: CertificationRecord[] }[] = [];
  for (const kind of CERT_KINDS) {
    const inKind = achieved.filter((c) => c.kind === kind);
    if (inKind.length === 0) continue;
    if (kind === "CERTIFICATION") {
      for (const fam of CERT_FAMILIES) {
        const items = inKind.filter((c) => (c.family === "METHODICAL" ? "METHODICAL" : "MICROSOFT") === fam);
        if (items.length > 0) sections.push({ key: `cert-${fam}`, label: familyLabel(fam), items });
      }
    } else {
      sections.push({ key: kind, label: kindLabel(kind), items: inKind });
    }
  }

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{isDe ? "Ausbildung · Zertifizierungen" : "Credentials · certifications"}</p>
      <h2>{isDe ? "Eine Agentin bildet sich weiter" : "An agent keeps learning"}</h2>
      <p className="lead">
        {isDe
          ? "Zertifizierungen, MVP-Auszeichnungen, Schulungen und aktuelle Themen — getrennt nach Bereichen."
          : "Certifications, MVP awards, trainings and current topics — grouped by area."}
      </p>

      {planned.length > 0 || focus.length > 0 ? (
        <div className="card bracket" style={{ margin: "24px 0", padding: 24, borderColor: "var(--signal)" }}>
          <p className="eyebrow" style={{ color: "var(--signal)" }}>{isDe ? "In Ausbildung · laufende Vorbereitung" : "In progress · currently preparing"}</p>
          {planned.length > 0 ? (
            <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
              {planned.map((c) => (
                <li key={c.id}>
                  <b>{c.name}</b>
                  {c.plannedFor ? <span className="meta"> · {isDe ? "Ziel" : "target"} {c.plannedFor}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {focus.length > 0 ? (
            <div className="roles" style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: planned.length > 0 ? 14 : 6 }}>
              {focus.map((f) => (
                <span
                  key={f.id}
                  title={f.note ?? undefined}
                  style={{
                    fontFamily: "var(--mono)",
                    fontSize: "11px",
                    letterSpacing: ".14em",
                    color: "var(--violet-text)",
                    border: "1px solid var(--line)",
                    padding: "7px 13px",
                    borderRadius: "var(--r)",
                  }}
                >
                  {f.title}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {certs.length === 0 && focus.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 24 }}>
          <p className="muted">{isDe ? "Noch keine Zertifizierungen erfasst." : "No certifications yet."}</p>
        </div>
      ) : null}

      {sections.map((sec) => (
        <div key={sec.key}>
          <p className="eyebrow" style={{ marginTop: 32 }}>{sec.label}</p>
          <div className="cert-grid">
            {sec.items.map((c) => (
              <div className="cert" key={c.id}>
                <div className="badge">
                  {c.logoUrl ? (
                    <AssetImage
                      src={c.logoUrl}
                      alt={c.logoAlt}
                      ai={c.logoAi}
                      imgStyle={{ width: "100%", height: "100%", objectFit: "contain" }}
                    />
                  ) : (
                    badge(c.shortCode, c.name, c.series)
                  )}
                </div>
                <div className="cert-main">
                  <div className="cert-head">
                    <b className="cert-name">{c.name}</b>
                    <span className="cert-year">{yearOf(c.acquiredOn)}</span>
                  </div>
                  <div className="meta cert-meta">
                    {isDe ? "Erworben" : "Acquired"} {monthYear(c.acquiredOn, locale)}
                    {c.validUntil ? ` · ${isDe ? "gültig bis" : "valid until"} ${monthYear(c.validUntil, locale)}` : ""}
                    {c.series ? ` · ${c.series}` : ""}
                    {c.proofUrl ? (
                      <>
                        {" · "}
                        <a href={c.proofUrl} target="_blank" rel="noopener noreferrer">
                          {isDe ? "Nachweis" : "Proof"}
                        </a>
                      </>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
