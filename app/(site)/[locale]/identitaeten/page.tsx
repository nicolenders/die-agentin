import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { getPublishedIdentities } from "@/lib/queries/identities";
import AssetImage from "@/components/media/AssetImage";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const dict = await getDictionary(locale);
  return { title: dict.identity.title, description: dict.identity.lead };
}

export default async function IdentitaetenPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const dict = await getDictionary(locale);
  const identities = await getPublishedIdentities(locale);

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{dict.identity.eyebrow}</p>
      <h2>{dict.identity.title}</h2>
      <p className="lead">{dict.identity.lead}</p>

      {identities.length === 0 ? (
        <div className="card bracket" style={{ marginTop: 26 }}>
          <p className="muted" style={{ margin: 0 }}>{dict.identity.empty}</p>
        </div>
      ) : (
        <div className="grid g2" style={{ marginTop: 26, alignItems: "stretch" }}>
          {identities.map((i) => (
            <Link
              key={i.id}
              href={`/${locale}/identitaeten/${i.slug}`}
              className="card bracket"
              style={{ display: "flex", flexDirection: "column", borderLeft: `3px solid ${i.color}` }}
            >
              {i.envelopeUrl ? (
                <AssetImage src={i.envelopeUrl} alt={i.envelopeAlt} imgStyle={{ width: "100%", borderRadius: 4, aspectRatio: "4 / 5", objectFit: "cover" }} style={{ marginBottom: 12 }} />
              ) : i.portraitUrl ? (
                <AssetImage src={i.portraitUrl} alt={i.portraitAlt} imgStyle={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover" }} style={{ marginBottom: 12 }} />
              ) : null}
              <p className="meta" style={{ margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                <span aria-hidden style={{ width: 10, height: 10, borderRadius: "50%", background: i.color, display: "inline-block" }} />
                {i.registryCode ?? ""}
              </p>
              <h3 style={{ marginTop: 8 }}>{i.name}</h3>
              <p className="meta" style={{ margin: "2px 0 0" }}>{i.role}</p>
              {i.tagline ? <p style={{ flex: 1, marginTop: 10 }}>{i.tagline}</p> : <span style={{ flex: 1 }} />}
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
