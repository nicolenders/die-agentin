import Link from "next/link";
import { db } from "@/lib/db";
import { assetUrl } from "@/lib/media/url";
import { isLocale } from "@/lib/i18n/config";
import { LEGEND_DEFAULTS, type LegendPillar } from "@/lib/queries/legend";
import Flash from "@/components/admin/Flash";
import LegendPortraitField from "@/components/admin/LegendPortraitField";
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
    portraitAssetId: row?.portraitAssetId ?? null,
  };
  const pillars: LegendPillar[] = row ? safeParse(row.pillarsJson, defaults.pillars) : defaults.pillars;
  const tools: string[] = row ? safeParse(row.toolsJson, defaults.tools) : defaults.tools;
  const pillarsText = pillars.map((p) => `${p.title} | ${p.text}`).join("\n");
  const toolsText = tools.join("\n");

  return (
    <section>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <h1 style={{ margin: 0 }}>Legende</h1>
        <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
          <Link className={`btn sm ${locale === "de" ? "solid" : "ghost"}`} href="/admin/legende?locale=de">Deutsch</Link>
          <Link className={`btn sm ${locale === "en" ? "solid" : "ghost"}`} href="/admin/legende?locale=en">English</Link>
        </div>
      </div>
      <p className="muted">Die „Über mich“-Seite — Texte, Säulen, Werkzeuge, Kontakt und Porträt. Du bearbeitest gerade: <b>{locale === "de" ? "Deutsch" : "English"}</b> (die andere Sprache: <Link href={`/admin/legende?locale=${other}`}>{other.toUpperCase()}</Link>).</p>
      <Flash ok={ok} err={err} />

      <form action={saveLegend}>
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
          <textarea className="f" name="lead" rows={3} defaultValue={val.lead} />
        </div>

        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="eyebrow">Mission</p>
          <label className="f">Überschrift</label>
          <input className="f" name="missionEyebrow" defaultValue={val.missionEyebrow} />
          <label className="f">Text</label>
          <textarea className="f" name="missionText" rows={3} defaultValue={val.missionText} />
        </div>

        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="eyebrow">Säulen</p>
          <p className="meta">Eine Säule pro Zeile im Format <code>Titel | Text</code>.</p>
          <textarea className="f" name="pillars" rows={7} defaultValue={pillarsText} style={{ fontFamily: "var(--mono)" }} />
        </div>

        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="eyebrow">Werkzeuge</p>
          <p className="meta">Ein Werkzeug pro Zeile.</p>
          <textarea className="f" name="tools" rows={7} defaultValue={toolsText} style={{ fontFamily: "var(--mono)" }} />
        </div>

        <div className="card bracket" style={{ marginTop: 16 }}>
          <p className="eyebrow">Kontakt</p>
          <label className="f">Überschrift (klein)</label>
          <input className="f" name="contactEyebrow" defaultValue={val.contactEyebrow} />
          <label className="f">Überschrift</label>
          <input className="f" name="contactHeading" defaultValue={val.contactHeading} />
          <label className="f">Text</label>
          <textarea className="f" name="contactText" rows={3} defaultValue={val.contactText} />
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
