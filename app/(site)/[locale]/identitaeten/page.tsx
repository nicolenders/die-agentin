import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getPublishedIdentities } from "@/lib/queries/identities";
import { alternatesFor } from "@/lib/seo/alternates";
import { IdentityCardFeature } from "@/components/identities/IdentityCard";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return {
    title: dict.identity.title,
    description: dict.meta.identitaeten,
    alternates: alternatesFor(locale, "identitaeten"),
  };
}

export default async function IdentitaetenPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const identities = await getPublishedIdentities(locale);

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{dict.identity.eyebrow}</p>
      <h1 className="page-title">{dict.identity.headline}</h1>
      <p className="lead">{dict.identity.lead}</p>

      {identities.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 26 }}>
          <p className="muted" style={{ margin: 0 }}>{dict.identity.empty}</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))",
            gap: 16,
            marginTop: 26,
            alignItems: "stretch",
          }}
        >
          {identities.map((i) => (
            <IdentityCardFeature key={i.id} identity={i} locale={locale} />
          ))}
        </div>
      )}
    </section>
  );
}
