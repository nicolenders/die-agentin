import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { isLocale } from "@/lib/i18n/config";
import { getDictionary } from "@/lib/i18n";
import { alternatesFor } from "@/lib/seo/alternates";
import { getBios, getContactInfo, getSocialLinks } from "@/lib/queries/settings";
import { getHomeStats } from "@/lib/queries/home";
import { getPublishedIdentities } from "@/lib/queries/identities";
import { getBriefingList } from "@/lib/queries/briefings";
import { getLegend } from "@/lib/queries/legend";
import { talkFormats } from "@/lib/briefings/formats";
import { formatDuration } from "@/lib/format";
import { IdentityCompactGrid } from "@/components/identities/IdentityCard";
import CopyButton from "@/components/CopyButton";

export const dynamic = "force-dynamic";

// Speaker-Kit „Akte" (Anhang A). Der Name ist gesetzt. Der englische Slug
// (/kit) ist bewusst noch offen und gehört in einen eigenen Umbau (Audit 6.7).
export async function generateMetadata({ params }: { params: Promise<{ locale: string }> }): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) return {};
  const isDe = locale === "de";
  const dict = await getDictionary(locale);
  return {
    // DE und EN im Gleichlauf (Audit 6.9).
    title: isDe ? "Akte · Speaker-Kit" : "File · Speaker kit",
    description: dict.meta.akte,
    alternates: alternatesFor(locale, "akte"),
  };
}

export default async function AktePage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();
  const isDe = locale === "de";
  const [bios, stats, identities, contact, social, dict, briefings, legend] = await Promise.all([
    getBios(locale),
    getHomeStats(),
    getPublishedIdentities(locale),
    getContactInfo(),
    getSocialLinks(),
    getDictionary(locale),
    getBriefingList(locale),
    getLegend(locale),
  ]);

  // Formate entstehen aus den Dauern der gepflegten Briefings (Audit 6.4) —
  // keine zweite Liste, die getrennt veralten kann.
  const formats = talkFormats(briefings.map((b) => b.durationMin));
  const portrait = legend.portrait;

  const bioBlocks = [
    { key: "short", label: isDe ? "Kurz (ca. 50 Wörter)" : "Short (~50 words)", text: bios.short },
    { key: "medium", label: isDe ? "Mittel (ca. 150 Wörter)" : "Medium (~150 words)", text: bios.medium },
    { key: "long", label: isDe ? "Lang (ca. 400 Wörter)" : "Long (~400 words)", text: bios.long },
  ].filter((b) => b.text.trim());

  return (
    <section style={{ padding: "44px 0 90px" }}>
      <p className="eyebrow">{isDe ? "Akte · Speaker-Kit" : "File · Speaker kit"}</p>
      {/* Audit 6.2: echte H1 statt H2 — die Seite sieht dabei unverändert aus. */}
      <h1 className="as-h2">{isDe ? "Für Veranstalter" : "For organisers"}</h1>
      {/* „in einem Zug" ist als Idiom schief, und die Seite versprach Formate,
          die es nicht gab (Audit 6.4). */}
      <p className="lead">
        {isDe
          ? "Alles an einem Ort: Bios zum Kopieren, Pressefoto, Vortragsformate, Themen und der schnellste Kontaktweg."
          : "Everything in one place: copy-ready bios, press photo, talk formats, topics and the fastest way to reach me."}
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
          {isDe ? "Zahlen aus dem laufenden Bestand. Sie veralten nicht mit der Bio." : "Numbers pulled live. They don't go stale with the bio."}
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

      {formats.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 40 }}>{dict.briefing.formatsHeading}</p>
          <p className="meta" style={{ marginTop: -6 }}>{dict.briefing.formatsLead}</p>
          <table style={{ marginTop: 12 }}>
            <thead>
              <tr>
                <th scope="col">{dict.briefing.formatsHeading}</th>
                <th scope="col">{isDe ? "Dauer" : "Duration"}</th>
                <th scope="col">{dict.common.language}</th>
              </tr>
            </thead>
            <tbody>
              {formats.map((f) => (
                <tr key={f.format}>
                  <td data-primary="">{dict.briefing.formats[f.format]}</td>
                  <td className="meta">
                    {f.minutes.map((m) => formatDuration(m, locale)).join(" · ")}
                  </td>
                  <td className="meta">DE · EN</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      ) : null}

      {portrait ? (
        <>
          <p className="eyebrow" style={{ marginTop: 40 }}>{dict.briefing.pressPhoto}</p>
          <div className="card bracket" style={{ marginTop: 12, padding: 20 }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- Pressefoto
                wird zum Herunterladen angeboten, nicht optimiert ausgeliefert. */}
            <img
              src={portrait.url}
              alt={portrait.alt}
              width={180}
              style={{ maxWidth: 180, height: "auto", borderRadius: "var(--r)" }}
            />
            <p style={{ marginTop: 14, marginBottom: 0 }}>
              <a className="btn" href={portrait.url} download>
                {dict.briefing.pressPhotoDownload}
              </a>
            </p>
            {portrait.credit ? (
              <p className="meta" style={{ marginBottom: 0 }}>
                {dict.briefing.pressPhotoCredit}: {portrait.credit}
              </p>
            ) : null}
          </div>
        </>
      ) : null}

      {identities.length > 0 ? (
        <>
          <p className="eyebrow" style={{ marginTop: 40 }}>{isDe ? "Fachgebiete / Identitäten" : "Areas / identities"}</p>
          <div style={{ marginTop: 12 }}>
            <IdentityCompactGrid identities={identities} locale={locale} />
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
