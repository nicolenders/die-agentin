import type { Locale } from "@/lib/i18n/config";
import { aiImageLabels } from "@/lib/media/ai-labels";
import type { CertificationRecord, FocusTopicItem } from "@/lib/queries/records";
import {
  CERT_KINDS,
  CERT_KIND_LABEL,
  CERT_KIND_LABEL_EN,
  CERT_FAMILIES,
  CERT_FAMILY_LABEL,
  CERT_FAMILY_LABEL_EN,
} from "@/lib/records/kind";
import AssetImage from "@/components/media/AssetImage";
import RadarTopics from "@/components/records/RadarTopics";

// Ausbildung/Auszeichnungen-Layout — nach Art (und bei Zertifizierungen nach
// Microsoft/methodisch) gruppierte Badge-Kacheln, plus optional der Kasten
// „In Ausbildung" (geplante Zertifizierungen + aktuelle Lernthemen). Ausgelagert,
// damit Detailseite und Lebenslauf dieselbe Darstellung nutzen.

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

export default function CertificationSections({
  certs,
  focus = [],
  locale,
}: {
  certs: CertificationRecord[];
  focus?: FocusTopicItem[];
  locale: Locale;
}) {
  const isDe = locale === "de";
  const aiLabels = aiImageLabels(locale);
  const kindLabel = (k: (typeof CERT_KINDS)[number]) => (isDe ? CERT_KIND_LABEL[k] : CERT_KIND_LABEL_EN[k]);
  const familyLabel = (f: (typeof CERT_FAMILIES)[number]) => (isDe ? CERT_FAMILY_LABEL[f] : CERT_FAMILY_LABEL_EN[f]);

  const planned = certs.filter((c) => c.status === "PLANNED");
  const achieved = certs.filter((c) => c.status !== "PLANNED");

  const sections: { key: string; label: string; items: CertificationRecord[] }[] = [];
  for (const kind of CERT_KINDS) {
    const inKind = achieved.filter((c) => c.kind === kind);
    if (inKind.length === 0) continue;
    if (kind === "CERTIFICATION") {
      for (const fam of CERT_FAMILIES) {
        const fitems = inKind.filter((c) => (c.family === "METHODICAL" ? "METHODICAL" : "MICROSOFT") === fam);
        if (fitems.length > 0) sections.push({ key: `cert-${fam}`, label: familyLabel(fam), items: fitems });
      }
    } else {
      sections.push({ key: kind, label: kindLabel(kind), items: inKind });
    }
  }

  return (
    <>
      {planned.length > 0 || focus.length > 0 ? (
        <div className="card bracket" style={{ margin: "24px 0", padding: 24, borderColor: "var(--signal)" }}>
          <p className="eyebrow" style={{ color: "var(--signal)" }}>
            {isDe ? "In Ausbildung · laufende Vorbereitung" : "In progress · currently preparing"}
          </p>
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
            <div style={{ marginTop: planned.length > 0 ? 14 : 6 }}>
              <RadarTopics topics={focus} locale={locale} />
            </div>
          ) : null}
        </div>
      ) : null}

      {sections.map((sec) => (
        <div
          key={sec.key}
          id={sec.key === "MVP" ? "mvp" : undefined}
        >
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
                      aiLabel={aiLabels.aiGenerated}
                      aiTitle={aiLabels.aiGeneratedImage}
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
    </>
  );
}
