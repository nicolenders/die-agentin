import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getPublications } from "@/lib/queries/records";
import PublicationSections from "@/components/records/PublicationSections";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.nav.publikationen };
}

export default async function PublikationenPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isDe = locale === "de";
  const all = await getPublications(locale);

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{isDe ? "Publikationen" : "Publications"}</p>
      <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0 }}>{isDe ? "Schriftlich festgehalten" : "Put down in writing"}</h2>
        <a className="btn ghost sm" href={`/${locale}/cv`} target="_blank" rel="noopener noreferrer" style={{ marginLeft: "auto" }}>
          {isDe ? "Als Lebenslauf drucken" : "Print as CV"} ↗
        </a>
      </div>

      <PublicationSections items={all} locale={locale} />

      {all.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 24 }}>
          <p className="muted">{isDe ? "Noch keine Publikationen erfasst." : "No publications yet."}</p>
        </div>
      ) : null}
    </section>
  );
}
