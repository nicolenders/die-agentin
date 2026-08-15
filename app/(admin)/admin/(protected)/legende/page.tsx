import Link from "next/link";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import { isLocale } from "@/lib/i18n/config";
import { getContactInfo } from "@/lib/queries/settings";
import { LEGEND_DEFAULTS, type LegendPillar } from "@/lib/queries/legend";
import Flash from "@/components/admin/Flash";
import LegendPortraitField from "@/components/admin/LegendPortraitField";
import RichTextField from "@/components/admin/editor/RichTextField";
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
      <p className="muted">Die „Über mich“-Seite — Texte, Säulen, Werkzeuge, Kontakt und Porträt. Du bearbeitest gerade: <b>{locale === "de" ? "Deutsch" : "English"}</b> (die andere Sprache: <Link href={`/admin/legende?locale=${other}`}>{other.toUpperCase()}</Link>).</p>

      <form action={saveLegend} id="legend-form">
        <input type="hidden" name="locale" value={locale} />

        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="eyebrow">Porträt</p>
          <LegendPortraitField initialAssetId={val.portraitAssetId} initialUrl={portraitUrl} />
        </div>

        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="eyebrow">Kopf</p>
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
        </div>

        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="eyebrow">Mission</p>
          <label className="f">Überschrift</label>
          <input className="f" name="missionEyebrow" defaultValue={val.missionEyebrow} />
          <label className="f">Text</label>
          <RichTextField name="missionText" defaultValue={val.missionText} ariaLabel="Missionstext" />
        </div>

        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="eyebrow">Säulen</p>
          <p className="meta">Eine Säule pro Zeile im Format <code>Titel | Text</code>.</p>
          <textarea className="f" name="pillars" rows={7} defaultValue={pillarsText} style={{ fontFamily: "var(--mono)" }} />
        </div>

        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="eyebrow">Werkzeuge</p>
          <p className="meta">
            Werkzeuge werden jetzt je Identität gepflegt (unter <Link href="/admin/identitaeten">Identitäten</Link>).
            Öffentlich zeigt die Legende die Summe aller Identitäts-Werkzeuge, Duplikate entfernt, alphabetisch.
          </p>
        </div>

        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="eyebrow">Kontakt</p>
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
