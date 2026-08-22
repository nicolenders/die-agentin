import Link from "next/link";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import { isLocale } from "@/lib/i18n/config";
import { getContactInfo } from "@/lib/queries/settings";
import { getAggregatedTools } from "@/lib/queries/identities";
import { LEGEND_DEFAULTS, type LegendPillar } from "@/lib/queries/legend";
import Flash from "@/components/admin/Flash";
import LegendPortraitField from "@/components/admin/LegendPortraitField";
import RichTextField from "@/components/admin/editor/RichTextField";
import FormTabs, { type FormTabDef } from "@/components/admin/FormTabs";
import { saveLegend } from "./actions";

export const metadata = { title: "Legende · Zentrale" };

export default async function LegendeAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ locale?: string; ok?: string; err?: string }>;
}) {
  const { locale: localeParam, ok, err } = await searchParams;
  const locale = isLocale(localeParam ?? "") ? (localeParam as "de" | "en") : "de";
  const other = locale === "de" ? "en" : "de";
  const defaults = LEGEND_DEFAULTS[locale];

  let row: Awaited<ReturnType<typeof db.legendContent.findUnique>> & { portrait?: { blobPath: string } | null } | null = null;
  let portraitUrl: string | null = null;
  try {
    row = await db.legendContent.findUnique({ where: { locale }, include: { portrait: true } });
    if (row?.portrait) portraitUrl = assetUrl(row.portrait.blobPath);
  } catch {
    // DB nicht erreichbar → Standardwerte
  }

  const val = {
    eyebrow: row?.eyebrow ?? defaults.eyebrow,
    name: row?.name ?? defaults.name,
    lead: row?.lead ?? defaults.lead,
    missionEyebrow: row?.missionEyebrow ?? defaults.missionEyebrow,
    missionText: row?.missionText ?? defaults.missionText,
    contactEyebrow: row?.contactEyebrow ?? defaults.contactEyebrow,
    contactHeading: row?.contactHeading ?? defaults.contactHeading,
    contactText: row?.contactText ?? defaults.contactText,
    contactButton: row?.contactButton ?? defaults.contactButton,
    contactUrl: row?.contactUrl ?? defaults.contactUrl,
    employerName: row?.employerName ?? "",
    employerUrl: row?.employerUrl ?? "",
    portraitAssetId: row?.portraitAssetId ?? null,
  };
  const pillars: LegendPillar[] = row ? safeParse(row.pillarsJson, defaults.pillars) : defaults.pillars;
  const pillarsText = pillars.map((p) => `${p.title} | ${p.text}`).join("\n");
  const contact = await getContactInfo();
  // Die Werkzeuge werden je Identität gepflegt; die Legende zeigt öffentlich
  // deren Summe. Hier steht dieselbe Summe — sonst müsste man sie sich aus den
  // Identitäten zusammensuchen, um zu sehen, was auf der Seite landet.
  const tools = await getAggregatedTools();
  const publicTools = tools.filter((t) => t.publicOnLegend);

  const tabs: FormTabDef[] = [
    {
      id: "kopf",
      label: "Kopf",
      content: (
        <>
          <label className="f">Eyebrow (kleine Zeile oben)</label>
          <input className="f" name="eyebrow" defaultValue={val.eyebrow} />
          <label className="f">Name / Titel</label>
          <input className="f" name="name" defaultValue={val.name} required />
          <label className="f">Lead (Einleitungssatz)</label>
          <RichTextField name="lead" defaultValue={val.lead} ariaLabel="Lead" />
          <label className="f">Aktueller Arbeitgeber (Name, optional)</label>
          <input className="f" name="employerName" defaultValue={val.employerName} placeholder="z. B. conet Deutschland GmbH" />
          <label className="f">Arbeitgeber-Website (optional)</label>
          <input className="f" name="employerUrl" defaultValue={val.employerUrl} placeholder="https://…" />
        </>
      ),
    },
    {
      id: "portraet",
      label: "Porträt",
      content: <LegendPortraitField initialAssetId={val.portraitAssetId} initialUrl={portraitUrl} />,
    },
    {
      id: "mission",
      label: "Mission",
      content: (
        <>
          <label className="f">Überschrift</label>
          <input className="f" name="missionEyebrow" defaultValue={val.missionEyebrow} />
          <label className="f">Text</label>
          <RichTextField name="missionText" defaultValue={val.missionText} ariaLabel="Missionstext" />
        </>
      ),
    },
    {
      id: "saeulen",
      label: "Säulen",
      content: (
        <>
          <p className="meta" style={{ marginTop: 0 }}>Eine Säule pro Zeile im Format <code>Titel | Text</code>.</p>
          <textarea className="f" name="pillars" rows={7} defaultValue={pillarsText} style={{ fontFamily: "var(--mono)" }} aria-label="Säulen" />
        </>
      ),
    },
    {
      id: "kontakt",
      label: "Kontakt",
      content: (
        <>
          <label className="f">E-Mail-Adresse (erscheint öffentlich im Kontaktbereich)</label>
          <input className="f" name="contactEmail" type="email" defaultValue={contact.email} placeholder="name@example.com" />
          <p className="meta" style={{ marginTop: 0 }}>Dieselbe Adresse wie unter Einstellungen · sie speist auch das Impressum.</p>
          <label className="f">Überschrift (klein)</label>
          <input className="f" name="contactEyebrow" defaultValue={val.contactEyebrow} />
          <label className="f">Überschrift</label>
          <input className="f" name="contactHeading" defaultValue={val.contactHeading} />
          <label className="f">Text</label>
          <RichTextField name="contactText" defaultValue={val.contactText} ariaLabel="Kontakttext" />
          <label className="f">Button-Beschriftung</label>
          <input className="f" name="contactButton" defaultValue={val.contactButton} />
          <label className="f">Button-Link (z. B. deine LinkedIn-URL)</label>
          <input className="f" name="contactUrl" defaultValue={val.contactUrl} placeholder="https://www.linkedin.com/in/…" />
        </>
      ),
    },
    {
      id: "werkzeuge",
      label: "Werkzeuge",
      content: (
        <>
          <p className="meta" style={{ marginTop: 0 }}>
            Gepflegt werden Werkzeuge je Identität (unter <Link href="/admin/identitaeten">Identitäten</Link>).
            Die Legende zeigt öffentlich ihre Summe, Duplikate entfernt, alphabetisch — hier steht
            genau diese Summe.
          </p>
          {tools.length === 0 ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Noch keine Werkzeuge. Sie entstehen bei den Identitäten und erscheinen dann hier.
            </p>
          ) : (
            <>
              <p className="meta">
                {publicTools.length} von {tools.length} erscheinen öffentlich. Der Rest hängt nur an
                Identitäten, die noch nicht veröffentlicht sind.
              </p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ marginTop: 4 }}>
                  <thead>
                    <tr>
                      <th>Werkzeug</th>
                      <th>Identität(en)</th>
                      <th>Einsätze</th>
                      <th>Öffentlich</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tools.map((t) => (
                      <tr key={t.id}>
                        <td><b>{t.name}</b></td>
                        <td className="meta">{t.identities.join(", ") || "keiner zugeordnet"}</td>
                        <td className="meta">{t.missionCount}</td>
                        <td>
                          <span className={`st ${t.publicOnLegend ? "live" : "draft"}`}>
                            {t.publicOnLegend ? "Ja" : "Nein"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      ),
    },
  ];

  return (
    <section>
      <div className="mask-bar">
        <h1>Legende</h1>
        <div className="mask-bar-actions">
          <Flash ok={ok} err={err} />
          <div className="mask-bar-buttons">
            <Link className={`btn sm ${locale === "de" ? "solid" : "ghost"}`} href="/admin/legende?locale=de">Deutsch</Link>
            <Link className={`btn sm ${locale === "en" ? "solid" : "ghost"}`} href="/admin/legende?locale=en">English</Link>
            <button className="btn solid sm" type="submit" form="legend-form">Speichern ({locale.toUpperCase()})</button>
          </div>
        </div>
      </div>
      <p className="muted">Die „Über mich“-Seite: Texte, Säulen, Werkzeuge, Kontakt und Porträt. Du bearbeitest gerade: <b>{locale === "de" ? "Deutsch" : "English"}</b> (die andere Sprache: <Link href={`/admin/legende?locale=${other}`}>{other.toUpperCase()}</Link>).</p>

      <form action={saveLegend} id="legend-form">
        <input type="hidden" name="locale" value={locale} />

        {/* Register statt einer Endlosseite. `FormTabs` lässt alle Felder im
            DOM — gespeichert wird also auch, was gerade nicht sichtbar ist. */}
        <div className="card bracket" style={{ marginTop: 16 }}>
          <FormTabs tabs={tabs} />
        </div>

        <button className="btn solid" type="submit" style={{ marginTop: 18 }}>Speichern ({locale.toUpperCase()})</button>
      </form>
    </section>
  );
}

function safeParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
