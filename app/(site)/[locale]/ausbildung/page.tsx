import { notFound } from "next/navigation";
import { isLocale, type Locale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getCertifications } from "@/lib/queries/records";

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
  const groups = await getCertifications(locale);

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{isDe ? "Ausbildung · Zertifizierungen" : "Credentials · certifications"}</p>
      <h2>{isDe ? "Eine Agentin bildet sich weiter" : "An agent keeps learning"}</h2>
      <p className="lead">
        {isDe
          ? "Gruppiert nach Kategorien, mit Ausstellungsdatum und — wo relevant — Gültigkeit."
          : "Grouped by category, with issue date and — where relevant — validity."}
      </p>

      {groups.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 24 }}>
          <p className="muted">{isDe ? "Noch keine Zertifizierungen erfasst." : "No certifications yet."}</p>
        </div>
      ) : (
        groups.map((g) => (
          <div key={g.category}>
            <p className="eyebrow" style={{ marginTop: 32 }}>
              {g.category}
            </p>
            {g.items.map((c) => (
              <div className="cert" key={c.id}>
                <div className="badge">{badge(c.shortCode, c.name, c.series)}</div>
                <div>
                  <b>{c.name}</b>
                  <div className="meta">
                    {isDe ? "Erworben" : "Acquired"} {monthYear(c.acquiredOn, locale)}
                    {c.validUntil ? ` · ${isDe ? "gültig bis" : "valid until"} ${monthYear(c.validUntil, locale)}` : ""}
                    {c.series ? ` · ${isDe ? "Reihe" : "series"} ${c.series}` : ""}
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
        ))
      )}
    </section>
  );
}
