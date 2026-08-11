import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getBios, getContactInfo, getSocialLinks } from "@/lib/queries/settings";
import { getHomeStats } from "@/lib/queries/home";
import { getPublishedIdentities } from "@/lib/queries/identities";
import CopyButton from "@/components/CopyButton";

export const dynamic = "force-dynamic";

// Speaker-Kit „Akte" (Anhang A). Namensvorschlag „Akte" (alt: „Ausrüstung") —
// TODO(nicole): finalen Namen bestätigen. Route /[locale]/akte (lokalisierter
// EN-Slug /kit folgt in Phase 13).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const isDe = locale === "de";
  return {
    title: isDe ? "Akte · Speaker-Kit" : "Speaker kit",
    description: isDe
      ? "Alles für Veranstalter in einem Zug: Bios in drei Längen, Fachgebiete, Formate und Kontakt."
      : "Everything organisers need in one place: bios in three lengths, topics, formats and contact.",
  };
}

export default async function AktePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isDe = locale === "de";
  const [bios, stats, identities, contact, social] = await Promise.all([
    getBios(locale),
    getHomeStats(),
    getPublishedIdentities(locale),
    getContactInfo(),
    getSocialLinks(),
  ]);

  const bioBlocks = [
    { key: "short", label: isDe ? "Kurz (ca. 50 Wörter)" : "Short (~50 words)", text: bios.short },
    { key: "medium", label: isDe ? "Mittel (ca. 150 Wörter)" : "Medium (~150 words)", text: bios.medium },
    { key: "long", label: isDe ? "Lang (ca. 400 Wörter)" : "Long (~400 words)", text: bios.long },
  ].filter((b) => b.text.trim());

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{isDe ? "Akte · Speaker-Kit" : "Speaker kit"}</p>
      <h2>{isDe ? "Für Veranstalter" : "For organisers"}</h2>
      <p className="lead">
        {isDe
          ? "Alles in einem Zug: Bios zum Kopieren, Fachgebiete, Formate und der schnellste Kontaktweg."
          : "Everything in one place: copy-ready bios, topics, formats and the fastest way to reach me."}
      </p>

      {/* Harte Fakten als Text (auch für KI-Systeme, Phase 13.4). */}
      <div className="card bracket" style={{ marginTop: 24, padding: 24 }}>
        <p className="eyebrow">{isDe ? "Fakten" : "Facts"}</p>
        <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
          <li>{isDe ? `Microsoft MVP seit 2020, ${stats.mvpAwards}× in Folge.` : `Microsoft MVP since 2020, ${stats.mvpAwards} years running.`}</li>
          <li>{isDe ? `${stats.books} Fachbücher, ${stats.certifications} Zertifizierungen.` : `${stats.books} technical books, ${stats.certifications} certifications.`}</li>
          <li>{isDe ? `${stats.missions} Einsätze in ${stats.countries} Ländern.` : `${stats.missions} missions in ${stats.countries} countries.`}</li>
          <li>{isDe ? `${identities.length} Identitäten (Fachgebiete).` : `${identities.length} identities (areas).`}</li>
        </ul>
        <p className="meta" style={{ marginTop: 8 }}>
          {isDe ? "Zahlen aus dem laufenden Bestand — sie veralten nicht mit der Bio." : "Numbers pulled live — they don't go stale with the bio."}
        </p>
      </div>

      {bioBlocks.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 40 }}>{isDe ? "Bios zum Kopieren" : "Copy-ready bios"}</p>
          <div style={{ display: "flex", flexDirection: "column", gap: 16, marginTop: 12 }}>
            {bioBlocks.map((b) => (
              <div key={b.key} className="card bracket" style={{ padding: 20 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <p className="eyebrow" style={{ margin: 0 }}>{b.label}</p>
                  <span style={{ marginLeft: "auto" }}>
                    <CopyButton text={b.text} label={isDe ? "Text kopieren" : "Copy text"} doneLabel={isDe ? "Kopiert ✓" : "Copied ✓"} />
                  </span>
                </div>
                {b.text.split("\n\n").map((p, i) => (
                  <p key={i} style={{ fontSize: 15 }}>{p}</p>
                ))}
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="card bracket" style={{ marginTop: 24 }}>
          <p className="muted" style={{ margin: 0 }}>{isDe ? "Bios werden gerade gepflegt." : "Bios are being maintained."}</p>
        </div>
      )}

      {identities.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 40 }}>{isDe ? "Fachgebiete / Identitäten" : "Areas / identities"}</p>
          <div className="roles" style={{ display: "flex", flexWrap: "wrap", gap: 9, marginTop: 8 }}>
            {identities.map((i) => (
              <Link key={i.id} href={`/${locale}/identitaeten/${i.slug}`} style={{ fontFamily: "var(--mono)", fontSize: "11px", letterSpacing: ".12em", color: "var(--violet-text)", border: `1px solid ${i.color}`, padding: "7px 12px", borderRadius: "var(--r)" }}>
                {i.name}
              </Link>
            ))}
          </div>
        </>
      ) : null}

      <div className="card bracket" style={{ marginTop: 40, padding: 24 }}>
        <p className="eyebrow">{isDe ? "Kontakt" : "Contact"}</p>
        <p style={{ fontSize: 15 }}>{isDe ? "Für Anfragen zu Vorträgen und Workshops:" : "For talk and workshop enquiries:"}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 12 }}>
          {social.linkedin ? <a className="btn" href={social.linkedin} target="_blank" rel="noopener noreferrer">LinkedIn</a> : null}
          {contact.email ? <a className="btn ghost" href={`mailto:${contact.email}`}>{isDe ? "E-Mail" : "Email"}</a> : null}
        </div>
      </div>
    </section>
  );
}
