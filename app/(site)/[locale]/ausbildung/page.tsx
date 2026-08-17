import { notFound } from "next/navigation";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getCertifications, getFocusTopics } from "@/lib/queries/records";
import { alternatesFor } from "@/lib/seo/alternates";
import CertificationSections from "@/components/records/CertificationSections";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.nav.ausbildung,
    description: dict.meta.ausbildung,
    alternates: alternatesFor(locale, "ausbildung"),
  };
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

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <h1 className="eyebrow">{isDe ? "Ausbildung · Zertifizierungen" : "Credentials · certifications"}</h1>
      <p className="lead">
        {isDe
          ? "Zertifizierungen, MVP-Auszeichnungen, Schulungen und aktuelle Themen, getrennt nach Bereichen."
          : "Certifications, MVP awards, trainings and current topics, grouped by area."}
      </p>

      <CertificationSections certs={certs} focus={focus} locale={locale} />

      {certs.length === 0 && focus.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 24 }}>
          <p className="muted">{isDe ? "Noch keine Zertifizierungen erfasst." : "No certifications yet."}</p>
        </div>
      ) : null}
    </section>
  );
}
